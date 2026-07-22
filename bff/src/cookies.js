const { cookieSecure } = require("./config");
const contract = require("./cookieContract");

const {
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  AUTH_TYPE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  SAME_SITE,
  PATH,
  AUTH_TYPE_KEYCLOAK,
} = contract;

const KC_CODE_VERIFIER = "kc-code-verifier";
const KC_STATE = "kc-state";
const KC_REDIRECT = "kc-redirect";
const KC_PENDING_TOKEN = "kc-pending-token";
const KC_PENDING_REFRESH = "kc-pending-refresh";
const KC_PENDING_REDIRECT = "kc-pending-redirect";

const SHORT_MAX_AGE = 5 * 60 * 1000;

function clearOptions(httpOnly) {
  const opts = {
    path: PATH,
    secure: cookieSecure,
    sameSite: SAME_SITE,
  };
  if (httpOnly !== undefined) {
    opts.httpOnly = httpOnly;
  }
  return opts;
}

function baseOptions(maxAge, httpOnly = true) {
  return {
    httpOnly,
    secure: cookieSecure,
    sameSite: SAME_SITE,
    path: PATH,
    maxAge,
  };
}

function setSessionCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_TOKEN, accessToken, baseOptions(ACCESS_MAX_AGE));
  if (refreshToken) {
    res.cookie(REFRESH_TOKEN, refreshToken, baseOptions(REFRESH_MAX_AGE));
  }
  // Local/card: omit auth-type (Storefront alignment)
  res.clearCookie(AUTH_TYPE, clearOptions(false));
}

function setKeycloakSessionCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_TOKEN, accessToken, baseOptions(ACCESS_MAX_AGE));
  if (refreshToken) {
    res.cookie(REFRESH_TOKEN, refreshToken, baseOptions(REFRESH_MAX_AGE));
  }
  res.cookie(
    AUTH_TYPE,
    AUTH_TYPE_KEYCLOAK,
    baseOptions(REFRESH_MAX_AGE, false)
  );
}

function clearAuthCookies(res) {
  // Match flags used when setting — required for reliable shared-session logout
  res.clearCookie(ACCESS_TOKEN, clearOptions(true));
  res.clearCookie(REFRESH_TOKEN, clearOptions(true));
  res.clearCookie(AUTH_TYPE, clearOptions(false));
}

function setPkceCookies(res, { codeVerifier, state, redirect }) {
  const opts = baseOptions(SHORT_MAX_AGE);
  res.cookie(KC_CODE_VERIFIER, codeVerifier, opts);
  res.cookie(KC_STATE, state, opts);
  res.cookie(KC_REDIRECT, redirect || "/", opts);
}

function clearPkceCookies(res) {
  res.clearCookie(KC_CODE_VERIFIER, clearOptions(true));
  res.clearCookie(KC_STATE, clearOptions(true));
  res.clearCookie(KC_REDIRECT, clearOptions(true));
}

function setPendingSsoCookies(res, { accessToken, refreshToken, redirect }) {
  const opts = baseOptions(SHORT_MAX_AGE);
  res.cookie(KC_PENDING_TOKEN, accessToken, opts);
  if (refreshToken) {
    res.cookie(KC_PENDING_REFRESH, refreshToken, opts);
  }
  res.cookie(
    KC_PENDING_REDIRECT,
    redirect || "/",
    baseOptions(SHORT_MAX_AGE, false)
  );
}

function clearPendingSsoCookies(res) {
  res.clearCookie(KC_PENDING_TOKEN, clearOptions(true));
  res.clearCookie(KC_PENDING_REFRESH, clearOptions(true));
  res.clearCookie(KC_PENDING_REDIRECT, clearOptions(false));
}

function getAccessToken(req) {
  return req.cookies?.[ACCESS_TOKEN] || null;
}

function getRefreshToken(req) {
  return req.cookies?.[REFRESH_TOKEN] || null;
}

function getAuthType(req) {
  return req.cookies?.[AUTH_TYPE] || null;
}

function getPkceCookies(req) {
  return {
    codeVerifier: req.cookies?.[KC_CODE_VERIFIER] || null,
    state: req.cookies?.[KC_STATE] || null,
    redirect: req.cookies?.[KC_REDIRECT] || "/",
  };
}

function getPendingSsoCookies(req) {
  return {
    accessToken: req.cookies?.[KC_PENDING_TOKEN] || null,
    refreshToken: req.cookies?.[KC_PENDING_REFRESH] || null,
    redirect: req.cookies?.[KC_PENDING_REDIRECT] || "/",
  };
}

module.exports = {
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  AUTH_TYPE,
  AUTH_TYPE_KEYCLOAK,
  setSessionCookies,
  setKeycloakSessionCookies,
  clearAuthCookies,
  setPkceCookies,
  clearPkceCookies,
  setPendingSsoCookies,
  clearPendingSsoCookies,
  getAccessToken,
  getRefreshToken,
  getAuthType,
  getPkceCookies,
  getPendingSsoCookies,
};
