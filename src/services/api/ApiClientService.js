import axios from "axios";
import keycloakService from "../KeycloakService";

class ApiClientService {
  constructor() {
    this.client = axios.create({
      baseURL: `${process.env.VUE_APP_SERVER_BASE_URL}/`,
      withCredentials: false,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Lokale Tokens (für lokale Authentifizierung)
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");

    // Auth-Typ: "local" oder "keycloak"
    this.authType = localStorage.getItem("authType") || null;

    this.isRefreshing = false;
    this.refreshSubscribers = [];

    this._keycloakRestoring = false;

    this.setupInterceptors();
  }

  setKeycloakRestoring(value) {
    this._keycloakRestoring = value;
  }

  onTokenRefreshed(newToken) {
    this.refreshSubscribers.forEach((callback) => callback(newToken));
    this.refreshSubscribers = [];
  }

  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        console.log("[Interceptor]", {
          url: config.url,
          authType: this.authType,
          kcAuthenticated: keycloakService.isAuthenticated,
          kcInitialized: keycloakService._initialized,
          kcHasToken: !!keycloakService.token,
        });

        if (this.authType === "keycloak") {
          const token = await keycloakService.getValidToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            console.warn("[Interceptor] No token for:", config.url);
          }
        } else if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response-Interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        if (this.authType === "keycloak") {
          // WICHTIG: Wenn gerade restored wird, NICHT ausloggen!
          if (this._keycloakRestoring) {
            console.debug(
              "401 during Keycloak restore – skipping logout"
            );
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          try {
            const newToken =
              await keycloakService.getValidToken();
            if (newToken) {
              originalRequest.headers.Authorization =
                `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch {
            // Keycloak-Session abgelaufen
          }

          this.clearTokens();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }

        // Lokale Auth: Refresh-Token-Logik wie bisher
        if (
          !originalRequest.url?.includes("/auth/refresh") &&
          this.refreshToken
        ) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.addRefreshSubscriber((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await this.refreshAccessToken();
            this.onTokenRefreshed(this.accessToken);
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Lokale Tokens setzen
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.authType = "local";

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("authType", "local");
  }

  /**
   * Keycloak-Auth aktivieren (kein Token-Speichern nötig)
   */
  setKeycloakAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.authType = "keycloak";

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.setItem("authType", "keycloak");
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.authType = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authType");
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(
      `${process.env.VUE_APP_SERVER_BASE_URL}/auth/refresh`,
      { refreshToken: this.refreshToken },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const { accessToken, refreshToken } = response.data;
    this.setTokens(accessToken, refreshToken);
    return accessToken;
  }

  isAuthenticated() {
    if (this.authType === "keycloak") {
      if (!keycloakService.keycloak) {
        return true;
      }
      return keycloakService.isAuthenticated;
    }
    return !!this.accessToken;
  }

  getAuthType() {
    return this.authType;
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  get(url, config = {}) {
    return this.client.get(url, config);
  }

  post(url, data, config = {}) {
    return this.client.post(url, data, config);
  }

  put(url, data, config = {}) {
    return this.client.put(url, data, config);
  }

  delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  patch(url, data, config = {}) {
    return this.client.patch(url, data, config);
  }
}

const apiClientService = new ApiClientService();
export default apiClientService;
