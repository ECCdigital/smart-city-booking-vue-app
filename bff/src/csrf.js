const { publicOrigins } = require("./config");
const { getRequestOrigin } = require("./publicUrl");

/**
 * Light CSRF guard for cookie-authenticated mutating requests.
 *
 * Primary protection remains SameSite=lax on auth cookies (browser will not
 * send them on cross-site POSTs). When PUBLIC_ORIGIN allowlist is set, also
 * require Origin/Referer to match the *current* request origin (derived host
 * must be allowlisted and equal the browser Origin).
 *
 * Requests without Origin/Referer (curl, health checks) are allowed so ops
 * tooling keeps working — classic browser CSRF always sends Origin on POST.
 */
function createCsrfGuard() {
  const allowlistActive = publicOrigins.length > 0;

  return function csrfGuard(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    if (!allowlistActive) {
      return next();
    }

    const target = getRequestOrigin(req);
    if (!target) {
      return res.status(403).json({
        success: false,
        message: "CSRF check failed",
      });
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

    if (requestOrigin !== target) {
      return res.status(403).json({
        success: false,
        message: "CSRF check failed",
      });
    }

    return next();
  };
}

module.exports = { createCsrfGuard };
