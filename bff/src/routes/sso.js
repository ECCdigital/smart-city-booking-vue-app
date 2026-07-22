const express = require("express");
const {
  getKeycloakConfig,
  getKeycloakEndpoints,
  exchangeCodeForTokens,
  revokeKeycloakSession,
  checkUserExists,
} = require("../keycloak");
const { backendFetch } = require("../backend");
const {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} = require("../pkce");
const { savePkceSession, takePkceSession } = require("../pkceStore");
const {
  createPendingTicket,
  savePendingSession,
  getPendingSession,
  takePendingSession,
} = require("../pendingStore");
const {
  setPkceCookies,
  clearPkceCookies,
  getPkceCookies,
  setPendingSsoCookies,
  clearPendingSsoCookies,
  getPendingSsoCookies,
  setKeycloakSessionCookies,
  clearAuthCookies,
  getRefreshToken,
} = require("../cookies");
const { getSsoCallbackUri, spaPath, getBffPublicBase } = require("../publicUrl");

const router = express.Router();

/** Same-origin relative path only (blocks open redirects / protocol-relative URLs). */
function safeRedirect(value, fallback = spaPath("/")) {
  const v = String(value || "");
  return /^\/(?!\/)/.test(v) ? v : fallback;
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function resolvePending(req) {
  const ticket =
    req.query.ticket || req.body?.ticket || req.headers["x-sso-ticket"];
  const fromStore = getPendingSession(ticket);
  if (fromStore?.accessToken) {
    return { ...fromStore, ticket: String(ticket), fromStore: true };
  }

  const fromCookies = getPendingSsoCookies(req);
  if (fromCookies.accessToken) {
    return { ...fromCookies, ticket: ticket ? String(ticket) : null, fromStore: false };
  }

  return null;
}

function consumePending(req) {
  const ticket =
    req.query.ticket || req.body?.ticket || req.headers["x-sso-ticket"];
  const fromStore = takePendingSession(ticket);
  if (fromStore?.accessToken) {
    return { ...fromStore, ticket: String(ticket) };
  }

  const fromCookies = getPendingSsoCookies(req);
  if (fromCookies.accessToken) {
    return { ...fromCookies, ticket: ticket ? String(ticket) : null };
  }

  return null;
}

function resolvePkceSession(req, state) {
  const fromStore = takePkceSession(state);
  if (fromStore) {
    return {
      codeVerifier: fromStore.codeVerifier,
      redirect: fromStore.redirect,
      state: String(state),
      silent: fromStore.silent,
    };
  }

  // Fallback for proxies that still deliver cookies
  const fromCookies = getPkceCookies(req);
  if (fromCookies.state && String(state) === String(fromCookies.state)) {
    return {
      codeVerifier: fromCookies.codeVerifier,
      redirect: fromCookies.redirect,
      state: fromCookies.state,
      silent: String(fromCookies.state).startsWith("silent_"),
    };
  }

  return null;
}

router.get("/login", async (req, res) => {
  try {
    const config = await getKeycloakConfig();
    const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
    const redirect = safeRedirect(req.query.redirect, spaPath("/"));
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    savePkceSession(state, { codeVerifier, redirect, silent: false });
    setPkceCookies(res, { codeVerifier, state, redirect });

    const redirectUri = getSsoCallbackUri(req);
    console.log("SSO login start:", { redirectUri, state: state.slice(0, 8) });

    const authUrl = new URL(endpoints.authorization);
    authUrl.searchParams.set("client_id", config.publicClient);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error("SSO login error:", error);
    return res.redirect(spaPath("/login?error=sso_unavailable"));
  }
});

router.get("/silent-check", async (req, res) => {
  const redirect = safeRedirect(req.query.redirect, spaPath("/"));
  try {
    const config = await getKeycloakConfig();
    const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState("silent_");

    savePkceSession(state, { codeVerifier, redirect, silent: true });
    setPkceCookies(res, { codeVerifier, state, redirect });

    const redirectUri = getSsoCallbackUri(req);
    const authUrl = new URL(endpoints.authorization);
    authUrl.searchParams.set("client_id", config.publicClient);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("prompt", "none");

    return res.redirect(authUrl.toString());
  } catch {
    return res.redirect(redirect);
  }
});

router.get("/callback", async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  const pkce = resolvePkceSession(req, state);
  clearPkceCookies(res);

  const isSilentCheck =
    !!pkce?.silent || String(state || "").startsWith("silent_");
  const redirectPath = safeRedirect(pkce?.redirect, spaPath("/"));

  if (error) {
    if (
      isSilentCheck &&
      (error === "login_required" || error === "interaction_required")
    ) {
      return res.redirect(redirectPath);
    }
    console.error("Keycloak auth error:", error, errorDescription);
    return res.redirect(spaPath("/login?error=sso_failed"));
  }

  if (!state || !pkce) {
    console.warn("SSO invalid_state:", {
      hasState: !!state,
      hasPkceSession: !!pkce,
      cookieState: getPkceCookies(req).state ? "present" : "missing",
    });
    if (isSilentCheck) return res.redirect(redirectPath);
    return res.redirect(spaPath("/login?error=invalid_state"));
  }

  if (!code || !pkce.codeVerifier) {
    if (isSilentCheck) return res.redirect(redirectPath);
    return res.redirect(spaPath("/login?error=missing_params"));
  }

  try {
    const config = await getKeycloakConfig();
    const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
    const redirectUri = getSsoCallbackUri(req);

    const tokenResponse = await exchangeCodeForTokens({
      endpoints,
      clientId: config.publicClient,
      code: String(code),
      redirectUri,
      codeVerifier: pkce.codeVerifier,
    });

    const kcAccessToken = tokenResponse.access_token;
    const kcRefreshToken = tokenResponse.refresh_token;
    const userExists = await checkUserExists(kcAccessToken);

    if (isSilentCheck) {
      if (userExists) {
        setKeycloakSessionCookies(res, {
          accessToken: kcAccessToken,
          refreshToken: kcRefreshToken,
        });
      }
      return res.redirect(redirectPath);
    }

    const ticket = createPendingTicket();
    savePendingSession(ticket, {
      accessToken: kcAccessToken,
      refreshToken: kcRefreshToken,
      redirect: redirectPath,
    });
    // Cookies as best-effort fallback (often dropped on 302 via vue proxy)
    setPendingSsoCookies(res, {
      accessToken: kcAccessToken,
      refreshToken: kcRefreshToken,
      redirect: redirectPath,
    });

    const flow = userExists ? "confirm" : "register";
    return res.redirect(
      spaPath(`/login/sso?flow=${flow}&ticket=${encodeURIComponent(ticket)}`)
    );
  } catch (err) {
    console.error("SSO callback error:", err);
    if (isSilentCheck) return res.redirect(redirectPath);
    return res.redirect(spaPath("/login?error=sso_failed"));
  }
});

router.get("/pending-user", (req, res) => {
  const pending = resolvePending(req);
  if (!pending?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "No pending SSO session",
    });
  }

  const decoded = decodeJwtPayload(pending.accessToken);
  return res.json({
    success: true,
    data: {
      email: decoded?.email || "",
      firstName: decoded?.given_name || "",
      lastName: decoded?.family_name || "",
      name:
        [decoded?.given_name, decoded?.family_name].filter(Boolean).join(" ") ||
        decoded?.preferred_username ||
        "",
      username: decoded?.preferred_username || "",
    },
  });
});

router.post("/confirm", async (req, res) => {
  const pending = consumePending(req);
  if (!pending?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "No pending SSO session. Please start the login again.",
    });
  }

  try {
    const { ok, data, status } = await backendFetch("/auth/sso/signin", {
      method: "POST",
      body: { token: pending.accessToken },
    });

    clearPendingSsoCookies(res);

    if (!ok) {
      return res.status(status || 500).json({
        success: false,
        message: data?.message || "SSO confirmation failed",
      });
    }

    setKeycloakSessionCookies(res, {
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
    });

    return res.json({
      success: true,
      data: {
        user: data.user,
        permissions: data.permissions,
        redirect: pending.redirect,
      },
    });
  } catch (error) {
    clearPendingSsoCookies(res);
    console.error("SSO confirm error:", error);
    return res.status(500).json({
      success: false,
      message: "SSO confirmation failed",
    });
  }
});

router.post("/register", async (req, res) => {
  const pending = consumePending(req);
  if (!pending?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "No pending SSO token. Please start the SSO flow again.",
    });
  }

  const legalAcceptance = req.body?.legalAcceptance;

  try {
    const signup = await backendFetch("/auth/sso/signup", {
      method: "POST",
      body: {
        token: pending.accessToken,
        ...(legalAcceptance ? { legalAcceptance } : {}),
      },
    });

    if (!signup.ok && signup.status !== 201) {
      return res.status(signup.status || 500).json({
        success: false,
        message: signup.data?.message || "SSO registration failed",
      });
    }

    const login = await backendFetch("/auth/sso/signin", {
      method: "POST",
      body: { token: pending.accessToken },
    });

    clearPendingSsoCookies(res);

    if (!login.ok) {
      return res.status(login.status || 500).json({
        success: false,
        message: login.data?.message || "SSO login after register failed",
      });
    }

    setKeycloakSessionCookies(res, {
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: login.data.user,
        permissions: login.data.permissions,
      },
    });
  } catch (error) {
    console.error("SSO register error:", error);
    return res.status(500).json({
      success: false,
      message: "SSO registration failed",
    });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = getRefreshToken(req);
  if (refreshToken) {
    try {
      const config = await getKeycloakConfig();
      const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
      await revokeKeycloakSession({
        endpoints,
        clientId: config.publicClient,
        refreshToken,
      });
    } catch (err) {
      console.error("Keycloak logout error:", err);
    }
  }

  clearAuthCookies(res);
  return res.json({ success: true });
});

router.get("/change-user", async (req, res) => {
  try {
    const config = await getKeycloakConfig();
    const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
    const redirect = safeRedirect(req.query.redirect, spaPath("/"));
    const pending = consumePending(req);

    clearPendingSsoCookies(res);

    if (pending?.refreshToken) {
      try {
        await revokeKeycloakSession({
          endpoints,
          clientId: config.publicClient,
          refreshToken: pending.refreshToken,
        });
      } catch (err) {
        console.error("Keycloak change-user revoke error:", err);
      }
    }

    const ssoLoginUrl = `${getBffPublicBase(req)}/auth/sso/login?redirect=${encodeURIComponent(redirect)}`;
    const logoutUrl = new URL(endpoints.logout);
    logoutUrl.searchParams.set("client_id", config.publicClient);
    logoutUrl.searchParams.set("post_logout_redirect_uri", ssoLoginUrl);

    return res.redirect(logoutUrl.toString());
  } catch (error) {
    console.error("SSO change-user error:", error);
    return res.redirect(spaPath("/login?error=sso_failed"));
  }
});

module.exports = router;
