import axios from "axios";

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

    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");

    this.isRefreshing = false;
    this.refreshSubscribers = [];

    this.setupInterceptors();
  }

  onTokenRefreshed(newToken) {
    this.refreshSubscribers.forEach(callback => callback(newToken));
    this.refreshSubscribers = [];
  }

  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
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

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
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
    } catch (error) {
      console.error("Token refresh failed:", error.response?.data || error.message);
      this.clearTokens();
      throw error;
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
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
