/**
 * Shared-session cookie contract with Storefront (path: /).
 * Keep in sync with smart-city-booking-store-front auth cookie setters
 * and docs/adr/0001-optional-admin-bff-shared-session.md.
 */

module.exports = {
  ACCESS_TOKEN: "access-token",
  REFRESH_TOKEN: "refresh-token",
  AUTH_TYPE: "auth-type",
  ACCESS_MAX_AGE: 60 * 60 * 24,
  REFRESH_MAX_AGE: 60 * 60 * 24 * 7,
  SAME_SITE: "lax",
  PATH: "/",
  AUTH_TYPE_KEYCLOAK: "keycloak",
  // Local/card: auth-type cookie omitted (Storefront behaviour)
};
