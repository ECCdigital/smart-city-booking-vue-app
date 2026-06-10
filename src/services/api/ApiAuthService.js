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

    let authenticated = await keycloakService.restoreFromStoredTokens(ssoConfig);

    if (!authenticated) {
      keycloakService.setConfig(ssoConfig);
      authenticated = await keycloakService.silentCheck();
    }

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
    }

    return null;
  },

  async register(
    tenant,
    id,
    firstName,
    lastName,
    company,
    password,
    nextUrl,
    legalAcceptance,
    invitationToken,
    invitationTenantId
  ) {
    const body = {
      id,
      firstName,
      lastName,
      company,
      password,
      nextUrl,
    };

    if (legalAcceptance && Object.keys(legalAcceptance).length > 0) {
      body.legalAcceptance = legalAcceptance;
    }

    if (invitationToken) {
      body.invitationToken = invitationToken;
    }

    if (invitationTenantId) {
      body.invitationTenantId = invitationTenantId;
    }

    return ApiClient.post("auth/signup", body);
  },

  async ssoRegister(token, legalAcceptance) {
    const body = { token };

    if (legalAcceptance && Object.keys(legalAcceptance).length > 0) {
      body.legalAcceptance = legalAcceptance;
    }

    return ApiClient.post("auth/sso/signup", body);
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

  async getCardAuthMethods() {
    const response = await ApiClient.get("/auth/card-methods");
    return response.data.methods;
  },

  async cardLogin(appId, publicId, secret) {
    const response = await ApiClient.post("/auth/card/signin", {
      appId,
      publicId,
      secret,
    });

    const data = response.data;

    if (data.requiresRegistration) {
      return {
        requiresRegistration: true,
        prefill: data.prefill,
        cardInfo: data.cardInfo,
      };
    }

    ApiClient.setTokens(data.accessToken, data.refreshToken);
    return {
      requiresRegistration: false,
      user: data.user,
      permissions: data.permissions,
    };
  },

  async cardSignup(payload) {
    const response = await ApiClient.post("/auth/card/signup", payload);
    return {
      status: response.data.status, // 'registered' | 'link_requested'
      message: response.data.message,
    };
  },

  isAuthenticated() {
    return ApiClient.isAuthenticated();
  },
};
