const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const q = "\"";
    const sq = "'";
    if (
      (value.startsWith(q) && value.endsWith(q)) ||
      (value.startsWith(sq) && value.endsWith(sq))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
}

loadEnvFile();

const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_API_BASE_URL = "http://localhost:8081";

let apiBaseUrl = (process.env.API_BASE_URL || "").replace(/\/$/, "");
if (!apiBaseUrl) {
  if (isProduction) {
    console.error("API_BASE_URL is required");
    process.exit(1);
  }
  apiBaseUrl = DEFAULT_API_BASE_URL;
  console.warn(
    `API_BASE_URL not set — using ${DEFAULT_API_BASE_URL} (create bff/.env to override)`
  );
}

const cookieSecure =
  process.env.COOKIE_SECURE !== undefined && process.env.COOKIE_SECURE !== ""
    ? parseBool(process.env.COOKIE_SECURE, false)
    : isProduction;

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// External path prefix where the browser reaches this BFF (vue proxy / nginx)
const bffPublicPath = String(process.env.BFF_PUBLIC_PATH || "").replace(
  /\/$/,
  ""
);

// Admin SPA base path for post-SSO redirects ("" or "/admin")
const spaBasePath = String(process.env.ADMIN_SPA_BASE_PATH || "").replace(
  /\/$/,
  ""
);

// Browser-facing origin for OIDC redirect_uri (e.g. http://localhost:8080).
// Prefer this over req Host when behind vue-cli proxy (Host becomes :300x).
const publicOrigin = String(process.env.PUBLIC_ORIGIN || "")
  .trim()
  .replace(/\/$/, "");

module.exports = {
  apiBaseUrl,
  port: Number(process.env.PORT) || 3001,
  cookieSecure,
  corsOrigins,
  bffPublicPath,
  spaBasePath,
  publicOrigin,
};
