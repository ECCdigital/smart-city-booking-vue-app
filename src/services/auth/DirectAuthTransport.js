import axios from "axios";
import keycloakService from "../KeycloakService";
import { getApiHttpBaseUrl } from "./authMode";

function redirectToLogin() {
  if (/\/login(?:\/|$)/.test(window.location.pathname)) return;
  const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
  window.location.href = `${base}/login`;
}

/**
 * Legacy auth: Bearer tokens in localStorage, direct calls to the backend API.
 */
class DirectAuthTransport {
  constructor() {
    this.mode = "direct";
    this.client = null;
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
    this.authType = localStorage.getItem("authType") || null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this._keycloakRestoring = false;
  }

  createClient(axiosLib) {
    return axiosLib.create({
      baseURL: `${getApiHttpBaseUrl()}/`,
      withCredentials: false,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  bindClient(client) {
    this.client = client;
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

  async onRequest(config) {
    if (this.authType === "keycloak") {
      const token = await keycloakService.getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return config;
  }

  async onResponseError(error) {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (this.authType === "keycloak") {
      if (this._keycloakRestoring) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await keycloakService.getValidToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return this.client(originalRequest);
        }
      } catch {
        // fall through to clear + redirect
      }

      this.clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

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
        await this.refresh();
        this.onTokenRefreshed(this.accessToken);
        originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
        return this.client(originalRequest);
      } catch (refreshError) {
        this.clearSession();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        this.isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.authType = "local";

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("authType", "local");
  }

  setKeycloakAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.authType = "keycloak";

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.setItem("authType", "keycloak");
  }

  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.authType = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authType");
  }

  async refresh() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(
      `${getApiHttpBaseUrl()}/auth/refresh`,
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

  async login(userId, password) {
    const response = await this.client.post("auth/signin", {
      id: userId,
      password,
    });
    const { accessToken, refreshToken, user, permissions } = response.data;
    this.setTokens(accessToken, refreshToken);
    return { user, permissions };
  }

  async cardLogin(appId, publicId, secret) {
    const response = await this.client.post("/auth/card/signin", {
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

    this.setTokens(data.accessToken, data.refreshToken);
    return {
      requiresRegistration: false,
      user: data.user,
      permissions: data.permissions,
    };
  }

  async logout() {
    try {
      if (this.authType === "keycloak") {
        keycloakService.cleanup();
        keycloakService.destroy();
      } else if (this.refreshToken) {
        await this.client.post("auth/signout", {
          refreshToken: this.refreshToken,
        });
      }
      return { success: true, idpLogoutUrl: null };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, idpLogoutUrl: null };
    } finally {
      localStorage.removeItem("authType");
      this.clearSession();
    }
  }

  async me() {
    return this.client.get("auth/me");
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

  supportsClientSideKeycloak() {
    return true;
  }
}

export default DirectAuthTransport;
