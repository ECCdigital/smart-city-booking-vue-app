const { publicOrigins } = require("./config");
const { getRequestOrigin } = require("./publicUrl");

/**
 * Status for a failed CSRF check. Deliberately not 403: the request never
 * reached the backend, so a 403 would be indistinguishable from the backend's
 * own `ForbiddenError` and the Admin UI would tell the user they lack a
 * permission instead of asking them to reload. 419 is unassigned in the IANA
 * registry, so it cannot contradict a registered meaning the way 428
 * (Precondition Required, RFC 6585) would. Mirrored in the UI as
 * `CSRF_FAILED_STATUS` (`src/services/api/apiErrorMessage.js`).
 */
const CSRF_FAILED_STATUS = 419;

function rejectCsrf(res) {
  return res.status(CSRF_FAILED_STATUS).json({
    success: false,
    message: "CSRF check failed",
  });
}

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
      return rejectCsrf(res);
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
      return rejectCsrf(res);
    }

    if (requestOrigin !== target) {
      return rejectCsrf(res);
    }

    return next();
  };
}

module.exports = { createCsrfGuard };
