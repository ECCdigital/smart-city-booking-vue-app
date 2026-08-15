/**
 * Shared-session cookie contract with Storefront (path: /).
 * Keep in sync with smart-city-booking-store-front auth cookie setters
 * and docs/adr/0001-optional-admin-bff-shared-session.md.
 */

module.exports = {
  ACCESS_TOKEN: "access-token",
  REFRESH_TOKEN: "refresh-token",
  AUTH_TYPE: "auth-type",
  // Express res.cookie maxAge is milliseconds (HTTP Max-Age: 1 day / 7 days)
  ACCESS_MAX_AGE: 60 * 60 * 24 * 1000,
  REFRESH_MAX_AGE: 60 * 60 * 24 * 7 * 1000,
  SAME_SITE: "lax",
  PATH: "/",
  AUTH_TYPE_KEYCLOAK: "keycloak",
  // Local/card: auth-type cookie omitted (Storefront behaviour)
};
