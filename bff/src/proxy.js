const { createProxyMiddleware } = require("http-proxy-middleware");
const { apiBaseUrl } = require("./config");
const { getAccessToken } = require("./cookies");

/**
 * Generic proxy: browser → Admin BFF → Backend API with Bearer from cookie.
 * Auth routes under /auth/* are mounted first and are not proxied.
 * POSTs that need a JSON body (signup, login, …) must be BFF-owned —
 * express.json consumes the stream before this middleware runs.
 */
function createApiProxy() {
  return createProxyMiddleware({
    target: apiBaseUrl,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.removeHeader("cookie");
        const accessToken = getAccessToken(req);
        if (accessToken) {
          proxyReq.setHeader("Authorization", `Bearer ${accessToken}`);
        } else {
          proxyReq.removeHeader("authorization");
        }
      },
      error: (err, req, res) => {
        console.error("BFF proxy error:", err.message);
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            message: "Bad gateway",
          });
        }
      },
    },
  });
}

module.exports = { createApiProxy };
