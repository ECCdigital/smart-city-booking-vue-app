const { backendFetch, BackendUnreachableError } = require("./backend");
const { getAccessToken } = require("./cookies");

function rejectSession(res) {
  return res.status(401).json({ success: false, message: "Not authenticated" });
}

/**
 * Lets a request through only when the backend accepts its access cookie
 * (`GET /auth/me`); answers `401` otherwise. Checks no role and does not
 * refresh — `POST /auth/refresh` and `GET /auth/me` do that.
 */
async function requireSession(req, res, next) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return rejectSession(res);
  }

  try {
    const me = await backendFetch("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!me.ok) {
      return rejectSession(res);
    }
  } catch (error) {
    if (error instanceof BackendUnreachableError) {
      return res.status(502).json({ success: false, message: error.message });
    }
    console.error("BFF session check error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Session check failed" });
  }

  return next();
}

module.exports = { requireSession };
