const express = require("express");
const { backendFetch, BackendUnreachableError } = require("../backend");
const {
  setSessionCookies,
  setKeycloakSessionCookies,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  getAuthType,
} = require("../cookies");
const {
  getKeycloakConfig,
  getKeycloakEndpoints,
  refreshKeycloakTokens,
  revokeKeycloakSession,
  buildBrowserLogoutUrl,
} = require("../keycloak");
const { getRequestOrigin, spaPath } = require("../publicUrl");

const router = express.Router();

function sendBackendError(res, status, data, fallbackMessage) {
  const message =
    (data && (data.message || data.statusMessage)) || fallbackMessage;
  return res.status(status || 500).json({
    success: false,
    message,
    ...(typeof data === "object" && data !== null ? { data } : {}),
  });
}

function sendCaughtError(res, error, fallbackMessage) {
  if (error instanceof BackendUnreachableError) {
    return res.status(502).json({
      success: false,
      message: error.message,
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

async function refreshLocalTokens(res, refreshToken) {
  const { ok, data, status } = await backendFetch("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });

  if (!ok || !data?.accessToken) {
    clearAuthCookies(res);
    return { success: false, status: status || 401 };
  }

  setSessionCookies(res, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || refreshToken,
  });

  return { success: true, accessToken: data.accessToken };
}

async function refreshKeycloakSession(res, refreshToken) {
  try {
    const config = await getKeycloakConfig();
    const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
    const tokens = await refreshKeycloakTokens({
      endpoints,
      clientId: config.publicClient,
      refreshToken,
    });
    if (!tokens?.access_token) {
      clearAuthCookies(res);
      return { success: false, status: 401 };
    }
    setKeycloakSessionCookies(res, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
    });
    return { success: true, accessToken: tokens.access_token };
  } catch (error) {
    console.error("Keycloak token refresh failed:", error.message);
    clearAuthCookies(res);
    return { success: false, status: 401 };
  }
}

router.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body || {};
    if (!id || !password) {
      return res.status(400).json({
        success: false,
        message: "id and password are required",
      });
    }

    const { ok, data, status } = await backendFetch("/auth/signin", {
      method: "POST",
      body: { id, password },
    });

    if (!ok) {
      return sendBackendError(res, status, data, "Login failed");
    }

    const { accessToken, refreshToken, user, permissions } = data;
    if (!accessToken) {
      return res.status(502).json({
        success: false,
        message: "Backend did not return an access token",
      });
    }

    setSessionCookies(res, { accessToken, refreshToken });

    return res.json({
      success: true,
      data: { user, permissions },
    });
  } catch (error) {
    return sendCaughtError(res, error, "Login failed");
  }
});

router.post("/card/signin", async (req, res) => {
  try {
    const { appId, publicId, secret } = req.body || {};
    if (!appId || !publicId || !secret) {
      return res.status(400).json({
        success: false,
        message: "appId, publicId, and secret are required",
      });
    }

    const { ok, data, status } = await backendFetch("/auth/card/signin", {
      method: "POST",
      body: { appId, publicId, secret },
    });

    if (!ok) {
      return sendBackendError(res, status, data, "Card authentication failed");
    }

    if (data?.requiresRegistration) {
      return res.json({
        success: true,
        data: {
          requiresRegistration: true,
          prefill: data.prefill,
          cardInfo: data.cardInfo,
        },
      });
    }

    const { accessToken, refreshToken, user, permissions } = data;
    if (!accessToken) {
      return res.status(502).json({
        success: false,
        message: "Backend did not return an access token",
      });
    }

    setSessionCookies(res, { accessToken, refreshToken });

    return res.json({
      success: true,
      data: {
        requiresRegistration: false,
        user,
        permissions,
      },
    });
  } catch (error) {
    return sendCaughtError(res, error, "Card authentication failed");
  }
});

router.post("/logout", async (req, res) => {
  const wasKeycloak = getAuthType(req) === "keycloak";
  const refreshToken = getRefreshToken(req);
  const browserLogout = req.body?.browserLogout !== false;

  if (wasKeycloak && refreshToken) {
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

  let idpLogoutUrl = null;
  if (wasKeycloak && browserLogout) {
    try {
      // Prefer registered URI without query (Keycloak post_logout_redirect_uri)
      const postLogoutRedirectUri = `${getRequestOrigin(req)}${spaPath("/login")}`;
      idpLogoutUrl = await buildBrowserLogoutUrl({
        postLogoutRedirectUri,
        refreshToken,
      });
    } catch (err) {
      console.error("Keycloak browser logout URL error:", err);
    }
  }

  return res.json({ success: true, idpLogoutUrl });
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token",
      });
    }

    const result =
      getAuthType(req) === "keycloak"
        ? await refreshKeycloakSession(res, refreshToken)
        : await refreshLocalTokens(res, refreshToken);

    if (!result.success) {
      return res.status(result.status || 401).json({
        success: false,
        message: "Token refresh failed",
      });
    }

    return res.json({ success: true });
  } catch (error) {
    clearAuthCookies(res);
    if (error instanceof BackendUnreachableError) {
      return res.status(502).json({ success: false, message: error.message });
    }
    console.error("BFF refresh error:", error);
    return res.status(401).json({
      success: false,
      message: "Token refresh failed",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    let accessToken = getAccessToken(req);
    const refreshToken = getRefreshToken(req);

    if (!accessToken && !refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Access cookie missing/expired but refresh still present → renew first
    if (!accessToken && refreshToken) {
      const refreshed =
        getAuthType(req) === "keycloak"
          ? await refreshKeycloakSession(res, refreshToken)
          : await refreshLocalTokens(res, refreshToken);

      if (!refreshed.success) {
        return res.status(401).json({
          success: false,
          message: "Token refresh failed",
        });
      }
      accessToken = refreshed.accessToken;
    }

    let me = await backendFetch("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!me.ok && me.status === 401 && refreshToken) {
      const refreshed =
        getAuthType(req) === "keycloak"
          ? await refreshKeycloakSession(res, refreshToken)
          : await refreshLocalTokens(res, refreshToken);

      if (!refreshed.success) {
        return res.status(401).json({
          success: false,
          message: "Token refresh failed",
        });
      }

      accessToken = refreshed.accessToken;
      me = await backendFetch("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    if (!me.ok) {
      if (me.status === 401) {
        clearAuthCookies(res);
      }
      return sendBackendError(res, me.status, me.data, "Failed to get user info");
    }

    return res.json({ success: true, data: me.data });
  } catch (error) {
    return sendCaughtError(res, error, "Failed to get user info");
  }
});

module.exports = router;
