const { bffPublicPath, spaBasePath, publicOrigins } = require("./config");

/**
 * Derive browser origin from forwarded headers / Host.
 * Always takes the first value of comma-separated X-Forwarded-* lists.
 */
function deriveOrigin(req) {
  const proto = (
    req.headers["x-forwarded-proto"] ||
    req.protocol ||
    "http"
  )
    .toString()
    .split(",")[0]
    .trim();
  const host = (
    req.headers["x-forwarded-host"] ||
    req.headers["x-forwarded-server"] ||
    req.get("host") ||
    "localhost"
  )
    .toString()
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (!publicOrigins.length) return true;
  try {
    return publicOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

/**
 * Map a derived request origin onto the PUBLIC_ORIGIN allowlist.
 * Exact match preferred; if only the scheme differs (common behind TLS
 * termination where the app sees http), match hostname+port and return the
 * allowlisted origin (correct public scheme).
 */
function resolveAllowlistedOrigin(derived) {
  if (!publicOrigins.length) {
    return derived;
  }

  let derivedUrl;
  try {
    derivedUrl = new URL(derived);
  } catch {
    return null;
  }

  const exact = derivedUrl.origin;
  if (publicOrigins.includes(exact)) {
    return exact;
  }

  for (const allowed of publicOrigins) {
    try {
      const allowedUrl = new URL(allowed);
      if (
        allowedUrl.hostname === derivedUrl.hostname &&
        allowedUrl.port === derivedUrl.port
      ) {
        return allowedUrl.origin;
      }
    } catch {
      // skip invalid allowlist entries (already filtered at startup)
    }
  }

  return null;
}

/**
 * Request origin for redirects / CSRF. Returns null when an allowlist is
 * configured and the derived host is not on it (never falls back to the
 * first allowlist entry).
 */
function getRequestOrigin(req) {
  return resolveAllowlistedOrigin(deriveOrigin(req));
}

/**
 * Same as getRequestOrigin, but throws statusCode 400 when the host is not
 * allowlisted (SSO start, logout redirect, absolute BFF URLs).
 */
function requireRequestOrigin(req) {
  const origin = getRequestOrigin(req);
  if (origin) {
    return origin;
  }
  const derived = deriveOrigin(req);
  const err = new Error(
    `Request origin ${derived} is not in the PUBLIC_ORIGIN allowlist. ` +
      "Check proxy headers (X-Forwarded-Host / X-Forwarded-Proto) and config."
  );
  err.statusCode = 400;
  throw err;
}

/** External BFF base, e.g. http://localhost:8080/api */
function getBffPublicBase(req) {
  const origin = requireRequestOrigin(req);
  const prefix = bffPublicPath.replace(/\/$/, "");
  return `${origin}${prefix}`;
}

function getSsoCallbackUri(req) {
  return `${getBffPublicBase(req)}/auth/sso/callback`;
}

/** Admin SPA path prefix, e.g. "" or "/admin" */
function spaPath(pathname = "/") {
  const base = spaBasePath.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!base) return path;
  if (path === "/") return `${base}/`;
  return `${base}${path}`;
}

module.exports = {
  deriveOrigin,
  isAllowedOrigin,
  resolveAllowlistedOrigin,
  getRequestOrigin,
  requireRequestOrigin,
  getBffPublicBase,
  getSsoCallbackUri,
  spaPath,
};
