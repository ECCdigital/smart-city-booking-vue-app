const { publicOrigin } = require("./config");

/**
 * Light CSRF guard for cookie-authenticated mutating requests.
 *
 * Primary protection remains SameSite=lax on auth cookies (browser will not
 * send them on cross-site POSTs). When PUBLIC_ORIGIN is set, also require
 * Origin/Referer to match that origin for non-GET requests that carry cookies.
 *
 * Requests without Origin/Referer (curl, health checks) are allowed so ops
 * tooling keeps working — classic browser CSRF always sends Origin on POST.
 */
function createCsrfGuard() {
  let allowedOrigin = null;
  if (publicOrigin) {
    try {
      allowedOrigin = new URL(publicOrigin).origin;
    } catch {
      console.warn(
        `CSRF: PUBLIC_ORIGIN is not a valid URL (${publicOrigin}) — Origin check disabled`
      );
    }
  }

  return function csrfGuard(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    if (!allowedOrigin) {
      return next();
    }

    const originHeader = req.get("origin");
    const refererHeader = req.get("referer");

    if (!originHeader && !refererHeader) {
      // Non-browser client — SameSite already covers browser CSRF
      return next();
    }

    let requestOrigin = null;
    try {
      if (originHeader) {
        requestOrigin = new URL(originHeader).origin;
      } else if (refererHeader) {
        requestOrigin = new URL(refererHeader).origin;
      }
    } catch {
      return res.status(403).json({
        success: false,
        message: "CSRF check failed",
      });
    }

    if (requestOrigin !== allowedOrigin) {
      return res.status(403).json({
        success: false,
        message: "CSRF check failed",
      });
    }

    return next();
  };
}

module.exports = { createCsrfGuard };
