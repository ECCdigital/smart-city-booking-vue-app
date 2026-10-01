const { backendFetch, sendCaughtError } = require("./backend");
const { getAccessToken } = require("./cookies");

function rejectSession(res) {
  return res.status(401).json({ success: false, message: "Not authenticated" });
}

/**
 * Lets a request through only when the backend accepts its access cookie
 * (`GET /auth/me`). Only a dead token answers `401`, which makes the browser
 * refresh; a suspended account stays `403`, and any other answer of the
 * backend is `502`, so a backend failure does not end the session. Checks
 * no role and does not refresh — `POST /auth/refresh` and `GET /auth/me` do
 * that.
 */
async function requireSession(req, res, next) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return rejectSession(res);
  }

  let me;
  try {
    me = await backendFetch("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    return sendCaughtError(res, error, "Session check failed");
  }

  if (me.status === 401) {
    return rejectSession(res);
  }
  if (me.status === 403) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (!me.ok) {
    return res
      .status(502)
      .json({ success: false, message: "Session check failed" });
  }
  return next();
}

module.exports = { requireSession };
