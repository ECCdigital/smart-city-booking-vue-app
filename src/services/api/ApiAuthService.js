import ApiClient from "./ApiClientService";
import keycloakService from "../KeycloakService";

export default {
  /**
   * Lokaler Login – Direct: Bearer tokens; BFF: HttpOnly cookies via /auth/login
   */
  async login(userId, password) {
    return ApiClient.transport.login(userId, password);
  },

  /**
   * SSO Login – Direct: keycloak-js token → API. BFF: confirm pending cookie session.
   */
  async ssoLogin(keycloakToken, ticket) {
    if (!ApiClient.supportsClientSideKeycloak()) {
      return ApiClient.transport.confirmSso(ticket);
    }

    const response = await ApiClient.post("auth/sso/signin", {
      token: keycloakToken,
    });

    const { user, permissions } = response.data;
    ApiClient.setKeycloakAuth();
    return { user, permissions };
  },

  startSsoLogin(redirectPath) {
    if (!ApiClient.supportsClientSideKeycloak()) {
      return ApiClient.transport.startSsoLogin(redirectPath);
    }
    throw new Error("startSsoLogin is only available in BFF auth mode");
  },

  startSilentSso(redirectPath) {
    if (!ApiClient.supportsClientSideKeycloak()) {
      return ApiClient.transport.startSilentSso(redirectPath);
    }
    throw new Error("startSilentSso is only available in BFF auth mode");
  },

  getPendingSsoUser(ticket) {
    return ApiClient.transport.getPendingSsoUser(ticket);
  },

  changeSsoUser(redirectPath, ticket) {
    return ApiClient.transport.changeSsoUser(redirectPath, ticket);
  },

  /**
   * Silent SSO Check – Direct mode (keycloak-js). BFF uses redirect silent-check.
   */
  async silentSsoCheck(ssoConfig) {
    if (!ApiClient.supportsClientSideKeycloak()) {
      return null;
    }

    if (!ssoConfig) return null;

    let authenticated = await keycloakService.restoreFromStoredTokens(ssoConfig);

    if (!authenticated) {
      keycloakService.setConfig(ssoConfig);
      authenticated = await keycloakService.silentCheck();
    }

    if (!authenticated) {
      return null;
    }

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

  async ssoRegister(token, legalAcceptance, ticket) {
    if (!ApiClient.supportsClientSideKeycloak()) {
      const result = await ApiClient.transport.registerSso(
        legalAcceptance,
        ticket
      );
      return { status: result.status || 201, data: result };
    }

    const body = { token };

    if (legalAcceptance && Object.keys(legalAcceptance).length > 0) {
      body.legalAcceptance = legalAcceptance;
    }

    return ApiClient.post("auth/sso/signup", body);
  },

  /**
   * Logout – Direct (local/Keycloak) or BFF cookie clear
   */
  async logout() {
    return ApiClient.transport.logout();
  },

  async me() {
    return ApiClient.transport.me();
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
    return ApiClient.transport.cardLogin(appId, publicId, secret);
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
