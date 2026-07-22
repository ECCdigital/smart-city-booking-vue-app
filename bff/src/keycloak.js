const { apiBaseUrl } = require("./config");
const {
  backendFetch,
  fetchWithTimeout,
  BackendUnreachableError,
} = require("./backend");

let cachedConfig = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

async function getKeycloakConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  const { ok, data, status } = await backendFetch("/api/instances/public");
  if (!ok) {
    const error = new Error("Failed to load instance for Keycloak config");
    error.status = status || 503;
    throw error;
  }

  const keycloakApp = (data?.applications || []).find(
    (app) => app.id === "keycloak" && app.active
  );

  if (!keycloakApp) {
    const error = new Error("Keycloak SSO is not configured or inactive");
    error.status = 503;
    throw error;
  }

  cachedConfig = keycloakApp;
  cacheTimestamp = now;
  return keycloakApp;
}

function getKeycloakEndpoints(serverUrl, realm) {
  const base = `${String(serverUrl).replace(/\/$/, "")}/realms/${realm}/protocol/openid-connect`;
  return {
    authorization: `${base}/auth`,
    token: `${base}/token`,
    userinfo: `${base}/userinfo`,
    logout: `${base}/logout`,
  };
}

function invalidateKeycloakCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}

async function keycloakFormPost(url, params) {
  try {
    return await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
  } catch (error) {
    if (error instanceof BackendUnreachableError) {
      const timedOut = new Error(error.cause?.message || "Keycloak request timed out");
      timedOut.status = 504;
      throw timedOut;
    }
    throw error;
  }
}

async function exchangeCodeForTokens({
  endpoints,
  clientId,
  code,
  redirectUri,
  codeVerifier,
}) {
  const response = await keycloakFormPost(endpoints.token, {
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || "Token exchange failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function refreshKeycloakTokens({
  endpoints,
  clientId,
  refreshToken,
}) {
  const response = await keycloakFormPost(endpoints.token, {
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || "Keycloak refresh failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function revokeKeycloakSession({
  endpoints,
  clientId,
  refreshToken,
}) {
  const response = await keycloakFormPost(endpoints.logout, {
    client_id: clientId,
    refresh_token: refreshToken,
  });
  if (!response.ok) {
    const error = new Error("Keycloak session revocation failed");
    error.status = response.status;
    throw error;
  }
}

async function checkUserExists(kcAccessToken) {
  const { ok, status } = await backendFetch("/auth/sso/signin", {
    method: "POST",
    body: { token: kcAccessToken },
  });
  if (ok) return true;
  if (status === 404) return false;
  const error = new Error("SSO user check failed");
  error.status = status;
  throw error;
}

/**
 * Browser IdP logout URL (clears Keycloak SSO session for shared Admin↔Storefront).
 * Do not put refresh_token in the query string — revoke server-side instead.
 */
async function buildBrowserLogoutUrl({ postLogoutRedirectUri }) {
  const config = await getKeycloakConfig();
  const endpoints = getKeycloakEndpoints(config.serverUrl, config.realm);
  const logoutUrl = new URL(endpoints.logout);
  logoutUrl.searchParams.set("client_id", config.publicClient);
  logoutUrl.searchParams.set(
    "post_logout_redirect_uri",
    postLogoutRedirectUri
  );
  return logoutUrl.toString();
}

module.exports = {
  apiBaseUrl,
  getKeycloakConfig,
  getKeycloakEndpoints,
  invalidateKeycloakCache,
  exchangeCodeForTokens,
  refreshKeycloakTokens,
  revokeKeycloakSession,
  checkUserExists,
  buildBrowserLogoutUrl,
};
