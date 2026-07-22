/**
 * Auth mode selection (build-time via VUE_APP_AUTH_MODE).
 * Default / unset = direct (legacy Bearer + localStorage).
 * See docs/adr/0001-optional-admin-bff-shared-session.md
 */

export function getAuthMode() {
  const mode = String(process.env.VUE_APP_AUTH_MODE || "direct")
    .trim()
    .toLowerCase();
  return mode === "bff" ? "bff" : "direct";
}

export function isBffAuthMode() {
  return getAuthMode() === "bff";
}

/**
 * HTTP base URL for ApiClientService (no trailing slash).
 * Direct → backend API; BFF → Admin BFF (cookies).
 */
export function getApiHttpBaseUrl() {
  if (isBffAuthMode()) {
    const base = process.env.VUE_APP_BFF_BASE_URL || "/admin/api";
    return String(base).replace(/\/$/, "");
  }
  return String(process.env.VUE_APP_SERVER_BASE_URL || "").replace(/\/$/, "");
}
