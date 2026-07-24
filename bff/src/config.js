const fs = require("fs");
const path = require("path");

/**
 * Load KEY=VALUE lines into process.env when the key is unset.
 * Later files win over earlier ones for still-unset keys only;
 * real process env (Docker / shell) always wins.
 */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
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

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

// Repo root .env (UI) first, then bff/.env overrides — same keys work for both.
loadEnvFile(path.join(__dirname, "..", "..", ".env"));
loadEnvFile(path.join(__dirname, "..", ".env"));

const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_API_BASE_URL = "http://localhost:8081";

// Prefer BFF-specific names; fall back to Admin UI env names.
let apiBaseUrl = stripTrailingSlash(
  firstEnv("API_BASE_URL", "VUE_APP_SERVER_BASE_URL")
);
if (!apiBaseUrl) {
  if (isProduction) {
    console.error(
      "API_BASE_URL or VUE_APP_SERVER_BASE_URL is required in production"
    );
    process.exit(1);
  }
  apiBaseUrl = DEFAULT_API_BASE_URL;
  console.warn(
    `API_BASE_URL / VUE_APP_SERVER_BASE_URL not set — using ${DEFAULT_API_BASE_URL}`
  );
}

const cookieSecure =
  process.env.COOKIE_SECURE !== undefined && process.env.COOKIE_SECURE !== ""
    ? parseBool(process.env.COOKIE_SECURE, false)
    : parseBool(process.env.VUE_APP_IS_PRODUCTION, isProduction);

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Browser-facing BFF path (must match VUE_APP_BFF_BASE_URL in the SPA)
const bffPublicPath = stripTrailingSlash(
  firstEnv("BFF_PUBLIC_PATH", "VUE_APP_BFF_BASE_URL")
);

// Admin SPA base path for post-SSO redirects ("" or "/admin")
const spaBasePath = stripTrailingSlash(
  firstEnv("ADMIN_SPA_BASE_PATH", "BASE_URL")
);

// Browser-facing origin for OIDC redirect_uri + CSRF checks
const publicOrigin = stripTrailingSlash(firstEnv("PUBLIC_ORIGIN"));

module.exports = {
  apiBaseUrl,
  port: Number(process.env.PORT) || 3001,
  cookieSecure,
  corsOrigins,
  bffPublicPath,
  spaBasePath,
  publicOrigin,
};
