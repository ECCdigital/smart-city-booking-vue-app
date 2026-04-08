import ApiClient from "./ApiClientService";
import keycloakService from "../KeycloakService";

export default {
  /**
   * Lokaler Login – wie bisher mit eigenem JWT
   */
  async login(userId, password) {
    const body = { id: userId, password: password };
    const response = await ApiClient.post("auth/signin", body);
    const { accessToken, refreshToken, user, permissions } = response.data;

    ApiClient.setTokens(accessToken, refreshToken);

    return { user, permissions };
  },

  /**
   * SSO Login – nutzt Keycloak-Token direkt, kein Token-Tausch
   */
  async ssoLogin(keycloakToken) {
    const response = await ApiClient.post("auth/sso/signin", {
      token: keycloakToken,
    });

    const { user, permissions } = response.data;

    // Keycloak-Auth-Modus aktivieren
    ApiClient.setKeycloakAuth();

    return { user, permissions };
  },

  /**
   * Silent SSO Check – wird beim App-Start aufgerufen.
   * Prüft ob eine Keycloak-Session existiert und loggt
   * automatisch ein.
   */
  async silentSsoCheck(ssoConfig) {
    if (!ssoConfig) return null;

    keycloakService.setConfig(ssoConfig);

    const authenticated = await keycloakService.silentCheck();

    if (!authenticated) {
      return null;
    }

    // Keycloak-Session existiert → Backend fragen ob User bekannt
    try {
      const token = keycloakService.token;
      const response = await ApiClient.post("auth/sso/verify", { token });

      if (response.data.success) {
        ApiClient.setKeycloakAuth();
        return {
          user: response.data.user,
          permissions: response.data.permissions,
        };
      }
    } catch (error) {
      console.debug("Silent SSO: User not found or error", error);
      // Kein Fehler – User ist in Keycloak eingeloggt aber
      // nicht im lokalen System registriert
    }

    return null;
  },

  async register(tenant, id, firstName, lastName, company, password, nextUrl) {
    const body = {
      id,
      firstName,
      lastName,
      company,
      password,
      nextUrl,
    };
    return ApiClient.post("auth/signup", body);
  },

  async ssoRegister(token) {
    return ApiClient.post("auth/sso/signup", { token });
  },

  /**
   * Logout – handhabt sowohl lokale als auch Keycloak-Sessions
   */
  async logout() {
    try {
      const authType = ApiClient.getAuthType();

      if (authType === "keycloak") {
        keycloakService.cleanup();
        keycloakService.destroy();
      } else {
        const refreshToken = ApiClient.getRefreshToken();
        if (refreshToken) {
          await ApiClient.post("auth/signout", { refreshToken });
        }
      }

      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    } finally {
      localStorage.removeItem("authType");
      ApiClient.clearTokens();
    }
  },

  async me() {
    const response = await ApiClient.get("auth/me");
    return response;
  },

  async resetPassword(id, password) {
    return ApiClient.post("auth/resetpassword", { id, password });
  },

  async requestPasswordReset(email) {
    return ApiClient.post("auth/reset", { email });
  },

  isAuthenticated() {
    return ApiClient.isAuthenticated();
  },
};
