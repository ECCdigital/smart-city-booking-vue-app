const { bffPublicPath, spaBasePath, publicOrigin } = require("./config");

function getRequestOrigin(req) {
  if (publicOrigin) {
    return publicOrigin;
  }

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

/** External BFF base, e.g. http://localhost:8080/api */
function getBffPublicBase(req) {
  const origin = getRequestOrigin(req);
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
  getRequestOrigin,
  getBffPublicBase,
  getSsoCallbackUri,
  spaPath,
};
