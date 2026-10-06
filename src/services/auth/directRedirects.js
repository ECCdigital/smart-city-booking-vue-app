/**
 * Rücksprungadressen of the admin UI in direct mode (keycloak-js in the
 * browser), built from one Adresse and the router base. Sign-in, silent check,
 * sign-out and „Benutzer wechseln“ hand these to Keycloak, and the guide in the
 * tab „Single Sign-On“ lists them for the realm, so a realm set up by the guide
 * fits the app.
 *
 * `keycloak` is what the Web-Client lists for this Adresse. Every entry is
 * exact except the one for „Benutzer wechseln“, which carries `*` at the end.
 *
 * @param {string} origin the Adresse, e.g. `https://booking.example.de`
 * @param {string} [base] router base, e.g. `/admin/`; defaults to `BASE_URL`
 * @returns {{
 *   login: string,
 *   silentCheck: string,
 *   logout: string,
 *   switchUser: string,
 *   keycloak: {
 *     origin: string,
 *     redirectUris: string[],
 *     postLogoutRedirectUris: string[],
 *   },
 * }}
 */
export function directRedirects(origin, base = process.env.BASE_URL || "/") {
  const path = String(base).replace(/^\/+|\/+$/g, "");
  const root = path ? `${origin}/${path}/` : `${origin}/`;

  const login = `${root}login/sso`;
  const silentCheck = `${root}silent-check-sso.html`;
  const logout = root;
  const switchUser = login;

  return {
    login,
    silentCheck,
    logout,
    switchUser,
    keycloak: {
      origin,
      redirectUris: [login, silentCheck],
      postLogoutRedirectUris: [logout, `${switchUser}*`],
    },
  };
}
