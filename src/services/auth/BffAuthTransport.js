import { getApiHttpBaseUrl } from "./authMode";
import {
  broadcastSessionEnded,
  endAdminSession,
  isPublicAuthPath,
} from "./sessionSync";

const SESSION_MARKER_KEY = "bffAuthSession";

function readAuthTypeCookie() {
  const match = document.cookie.match(/(?:^|; )auth-type=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function spaPath(pathname = "/") {
  const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!base) return path;
  if (path === "/") return `${base}/`;
  return `${base}${path}`;
}

/**
 * Opt-in BFF auth: HttpOnly cookies via Admin BFF. No auth tokens in localStorage.
 * Keycloak/SSO uses server-side OIDC+PKCE (no keycloak-js).
 */
class BffAuthTransport {
  constructor() {
    this.mode = "bff";
    this.client = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this._sessionActive = sessionStorage.getItem(SESSION_MARKER_KEY) === "1";
  }

  createClient(axiosLib) {
    return axiosLib.create({
      baseURL: `${getApiHttpBaseUrl()}/`,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  bindClient(client) {
    this.client = client;
  }

  setKeycloakRestoring() {
    // no-op — SSO restore is cookie/silent-check based
  }

  /** Strip Direct-mode token keys — must never hold JWTs in BFF mode. */
  scrubLegacyTokenStorage() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authType");
    localStorage.removeItem("kcTokens");
  }

  markSession() {
    this._sessionActive = true;
    sessionStorage.setItem(SESSION_MARKER_KEY, "1");
    this.scrubLegacyTokenStorage();
  }

  clearSession() {
    this._sessionActive = false;
    sessionStorage.removeItem(SESSION_MARKER_KEY);
    this.scrubLegacyTokenStorage();
  }

  onTokenRefreshed(ok = true) {
    this.refreshSubscribers.forEach((callback) => callback(ok));
    this.refreshSubscribers = [];
  }

  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  async onRequest(config) {
    if (config.headers) {
      delete config.headers.Authorization;
    }
    config.withCredentials = true;
    return config;
  }

  async onResponseError(error) {
    const originalRequest = error.config || {};

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Axios often uses relative urls without a leading slash ("auth/me")
    const url = String(originalRequest.url || "");
    const onPublicPath = isPublicAuthPath();

    const isAuthRoute = (name) =>
      url.includes(`auth/${name}`) || url.endsWith(`/${name}`);

    // Login / SSO / logout / card manage their own UX
    if (
      isAuthRoute("login") ||
      isAuthRoute("logout") ||
      url.includes("auth/sso/") ||
      url.includes("auth/card/")
    ) {
      return Promise.reject(error);
    }

    // /auth/me refreshes server-side; /auth/refresh failing means session is dead.
    // Never try to refresh again here — that deadlocks while isRefreshing=true.
    // Cold visits (no session marker) must not hard-redirect — e.g. /register.
    if (isAuthRoute("me") || isAuthRoute("refresh")) {
      if (!onPublicPath && this._sessionActive) {
        await endAdminSession({ redirect: true });
      } else {
        this.clearSession();
      }
      return Promise.reject(error);
    }

    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.addRefreshSubscriber((ok) => {
          if (!ok) {
            reject(error);
            return;
          }
          this.client(originalRequest).then(resolve).catch(reject);
        });
      });
    }

    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      await this.refresh();
      this.onTokenRefreshed(true);
      return this.client(originalRequest);
    } catch (refreshError) {
      this.onTokenRefreshed(false);
      if (!onPublicPath && this._sessionActive) {
        await endAdminSession({ redirect: true });
      } else {
        this.clearSession();
      }
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
    }
  }

  setTokens() {
    this.markSession();
  }

  setKeycloakAuth() {
    this.markSession();
  }

  async refresh() {
    const response = await this.client.post("auth/refresh");
    if (response.data?.success === false) {
      throw new Error("Token refresh failed");
    }
    this.markSession();
    return true;
  }

  async login(userId, password) {
    const response = await this.client.post("auth/login", {
      id: userId,
      password,
    });
    if (!response.data?.success) {
      const error = new Error(response.data?.message || "Login failed");
      error.response = response;
      throw error;
    }
    this.markSession();
    return response.data.data;
  }

  async cardLogin(appId, publicId, secret) {
    const response = await this.client.post("auth/card/signin", {
      appId,
      publicId,
      secret,
    });
    const payload = response.data?.data ?? response.data;

    if (payload?.requiresRegistration) {
      return {
        requiresRegistration: true,
        prefill: payload.prefill,
        cardInfo: payload.cardInfo,
      };
    }

    if (response.data?.success === false) {
      const error = new Error(response.data?.message || "Card login failed");
      error.response = response;
      throw error;
    }

    this.markSession();
    return {
      requiresRegistration: false,
      user: payload.user,
      permissions: payload.permissions,
    };
  }

  startSsoLogin(redirectPath) {
    const redirect = redirectPath || spaPath("/");
    const url = `${getApiHttpBaseUrl()}/auth/sso/login?redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  }

  startSilentSso(redirectPath) {
    const redirect = redirectPath || window.location.pathname + window.location.search;
    const url = `${getApiHttpBaseUrl()}/auth/sso/silent-check?redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  }

  _ssoTicketParams(ticket) {
    return ticket ? { ticket } : {};
  }

  async getPendingSsoUser(ticket) {
    const response = await this.client.get("auth/sso/pending-user", {
      params: this._ssoTicketParams(ticket),
    });
    return response.data?.data ?? response.data;
  }

  async confirmSso(ticket) {
    const response = await this.client.post("auth/sso/confirm", {
      ...this._ssoTicketParams(ticket),
    });
    if (!response.data?.success) {
      const error = new Error(response.data?.message || "SSO confirmation failed");
      error.response = response;
      throw error;
    }
    this.markSession();
    return response.data.data;
  }

  async registerSso(legalAcceptance, ticket) {
    const response = await this.client.post("auth/sso/register", {
      legalAcceptance,
      ...this._ssoTicketParams(ticket),
    });
    if (!response.data?.success && response.status !== 201) {
      const error = new Error(response.data?.message || "SSO registration failed");
      error.response = response;
      throw error;
    }
    this.markSession();
    return {
      status: response.status,
      ...(response.data?.data || {}),
    };
  }

  changeSsoUser(redirectPath, ticket) {
    const redirect = redirectPath || spaPath("/login/sso");
    const params = new URLSearchParams({ redirect });
    if (ticket) params.set("ticket", ticket);
    const url = `${getApiHttpBaseUrl()}/auth/sso/change-user?${params.toString()}`;
    window.location.href = url;
  }

  async logout() {
    try {
      const response = await this.client.post("auth/logout", {
        browserLogout: true,
      });
      this.clearSession();
      // Survives Keycloak IdP redirect round-trip on the same origin
      sessionStorage.setItem("bffJustLoggedOut", "1");
      broadcastSessionEnded();
      return {
        success: response.data?.success !== false,
        idpLogoutUrl: response.data?.idpLogoutUrl || null,
      };
    } catch (error) {
      console.error("Logout error:", error);
      this.clearSession();
      sessionStorage.setItem("bffJustLoggedOut", "1");
      broadcastSessionEnded();
      return { success: false, idpLogoutUrl: null };
    }
  }

  async me() {
    const response = await this.client.get("auth/me");
    // Reject SPA/HTML fallbacks (misconfigured nginx proxy → index.html 200)
    if (
      typeof response.data === "string" ||
      response.data?.success !== true ||
      !response.data?.data
    ) {
      const error = new Error("Not authenticated");
      error.response = response;
      throw error;
    }
    this.markSession();
    return { ...response, data: response.data.data };
  }

  isAuthenticated() {
    return this._sessionActive;
  }

  getAuthType() {
    if (!this._sessionActive) return null;
    return readAuthTypeCookie() === "keycloak" ? "keycloak" : "local";
  }

  getRefreshToken() {
    return null;
  }

  supportsClientSideKeycloak() {
    return false;
  }
}

export default BffAuthTransport;
