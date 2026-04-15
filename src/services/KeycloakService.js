import Keycloak from "keycloak-js";

class KeycloakService {
  constructor() {
    this._keycloak = null;
    this._initialized = false;
    this._config = null;
    this._initPromise = null;
  }

  setConfig(config) {
    if (
      this._config &&
      this._keycloak &&
      this._initialized &&
      this._config.serverUrl === config.serverUrl &&
      this._config.realm === config.realm &&
      this._config.publicClient === config.publicClient
    ) {
      return;
    }

    this._config = config;
    this.cleanup();
    this._keycloak = new Keycloak({
      url: config.serverUrl,
      realm: config.realm,
      clientId: config.publicClient,
    });
    this._initialized = false;
    this._initPromise = null;
  }

  get keycloak() {
    return this._keycloak;
  }

  get token() {
    return this._keycloak?.token || null;
  }

  get isAuthenticated() {
    return this._keycloak?.authenticated || false;
  }

  get tokenParsed() {
    return this._keycloak?.tokenParsed || null;
  }

  async silentCheck() {
    if (!this._keycloak || !this._config) {
      return false;
    }

    if (this._initialized) {
      return this._keycloak.authenticated;
    }

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._performSilentCheck();
    return this._initPromise;
  }

  async _performSilentCheck() {
    try {
      const authenticated = await this._keycloak.init({
        onLoad: "check-sso",
        silentCheckSsoRedirectUri:
          window.location.origin +
          (process.env.BASE_URL || "/") +
          "silent-check-sso.html",
        checkLoginIframe: false,
        pkceMethod: "S256",
        enableLogging: process.env.NODE_ENV === "development",
      });

      this._initialized = true;

      if (authenticated) {
        this._setupTokenRefresh();
      } else {
        console.debug("Keycloak: No active session found");
      }

      return authenticated;
    } catch (error) {
      console.warn(
        "Silent SSO check failed, app continues without SSO:",
        error
      );
      this._initPromise = null;
      return false;
    }
  }

  async login() {
    if (!this._keycloak) {
      throw new Error("Keycloak not configured");
    }

    if (!this._initialized) {
      const authenticated = await this._keycloak.init({
        onLoad: "login-required",
        checkLoginIframe: false,
        pkceMethod: "S256",
      });
      this._initialized = true;

      if (authenticated) {
        this._setupTokenRefresh();
      }

      return authenticated;
    }

    await this._keycloak.login();
    return this._keycloak.authenticated;
  }

  async logout(redirectUri = null) {
    if (!this._keycloak) return;
    const options = redirectUri ? { redirectUri } : {};
    this.cleanup();
    this._initialized = false;
    this._initPromise = null;
    await this._keycloak.logout(options);
  }

  _setupTokenRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }

    this._refreshInterval = setInterval(async () => {
      try {
        const refreshed = await this._keycloak.updateToken(60);
        if (refreshed) {
          console.debug("Keycloak token refreshed");
        }
      } catch (error) {
        console.error("Keycloak token refresh failed:", error);
        this.cleanup();
      }
    }, 30000);

    this._keycloak.onTokenExpired = async () => {
      try {
        await this._keycloak.updateToken(30);
      } catch {
        console.error("Token expired and refresh failed");
        this.cleanup();
      }
    };
  }

  async getValidToken() {
    if (!this._keycloak || !this._keycloak.authenticated) {
      return null;
    }

    try {
      await this._keycloak.updateToken(30);
      return this._keycloak.token;
    } catch {
      return null;
    }
  }

  cleanup() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  destroy() {
    this.cleanup();
    this._keycloak = null;
    this._initialized = false;
    this._initPromise = null;
  }
}

const keycloakService = new KeycloakService();
export default keycloakService;
