const fs = require("fs");
const path = require("path");

function readBffPort() {
  try {
    const envPath = path.join(__dirname, "bff", ".env");
    if (!fs.existsSync(envPath)) return null;
    const match = fs
      .readFileSync(envPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#") && line.startsWith("PORT="));
    if (!match) return null;
    const port = Number(match.slice("PORT=".length).trim());
    return Number.isFinite(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

const bffPort = readBffPort() || 3001;
const bffDevTarget =
  process.env.BFF_DEV_URL || `http://localhost:${bffPort}`;

function bffProxy(pathPrefix) {
  const escaped = pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    target: bffDevTarget,
    changeOrigin: true,
    xfwd: true,
    cookiePathRewrite: "/",
    pathRewrite: { [`^${escaped}`]: "" },
  };
}

console.log(`[vue.config] BFF dev proxy → ${bffDevTarget}`);

module.exports = {
  publicPath: process.env.BASE_URL,
  devServer: {
    allowedHosts: "all",
    // BFF mode: proxy SPA → local Admin BFF (strip prefix; BFF listens at /).
    // Support both production-like /admin/api and local short /api (VUE_APP_BFF_BASE_URL).
    proxy: {
      "/admin/api": bffProxy("/admin/api"),
      "/api": bffProxy("/api"),
    },
  },
  lintOnSave: false,
  transpileDependencies: ["vuetify"],
};
