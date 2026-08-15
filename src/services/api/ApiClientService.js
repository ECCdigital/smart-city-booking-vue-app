import axios from "axios";
import { createAuthTransport } from "../auth/createAuthTransport";
import { getAuthMode } from "../auth/authMode";

class ApiClientService {
  constructor() {
    this.transport = createAuthTransport();
    this.client = this.transport.createClient(axios);
    this.transport.bindClient(this.client);
    this.setupInterceptors();
  }

  get authMode() {
    return getAuthMode();
  }

  setKeycloakRestoring(value) {
    this.transport.setKeycloakRestoring?.(value);
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => this.transport.onRequest(config),
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.transport.onResponseError(error)
    );
  }

  /**
   * Lokale Tokens setzen (Direct mode). In BFF mode only marks session.
   */
  setTokens(accessToken, refreshToken) {
    return this.transport.setTokens(accessToken, refreshToken);
  }

  /**
   * Keycloak-Auth aktivieren (Direct mode only).
   */
  setKeycloakAuth() {
    return this.transport.setKeycloakAuth();
  }

  clearTokens() {
    return this.transport.clearSession();
  }

  async refreshAccessToken() {
    return this.transport.refresh();
  }

  isAuthenticated() {
    return this.transport.isAuthenticated();
  }

  getAuthType() {
    return this.transport.getAuthType();
  }

  getRefreshToken() {
    return this.transport.getRefreshToken();
  }

  supportsClientSideKeycloak() {
    return this.transport.supportsClientSideKeycloak();
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
