export default {
  async login(userId, password) {
    const body = { id: userId, password: password };

    try {
      const response = await ApiClient.post("auth/signin", body);

      const { accessToken, refreshToken, user, permissions } = response.data;

      ApiClient.setTokens(accessToken, refreshToken);

      return { user, permissions };
    } catch (error) {
      throw error;
    }
  },
  async ssoLogin(token) {
    const body = { token: token };

    try {
      const response = await ApiClient.post("auth/sso/signin", body);
      const { accessToken, refreshToken, user } = response.data;

      ApiClient.setTokens(accessToken, refreshToken);

      return user;
    } catch (error) {
      throw error;
    }
  },
 async register(tenant, id, firstName, lastName, company, password, nextUrl = null) {
    const body = {
      id: id,
      firstName: firstName,
      lastName: lastName,
      company: company,
      password: password,
      nextUrl: nextUrl,
    };

    try {
      const response = await ApiClient.post("auth/signup", body);
      return response;
    } catch (error) {
      throw error;
    }
  },
  async ssoRegister(token) {
    const body = { token: token };

    try {
      const response = await ApiClient.post("auth/sso/signup", body);
      return response;
    } catch (error) {
      throw error;
    }
  },
  async logout() {
    try {
      await ApiClient.get("auth/signout");
    } catch (error) {
      console.warn("Server logout failed:", error);
    } finally {
      ApiClient.clearTokens();
    }
  },
  async me(populatePermissions) {
    try {
      const response = await ApiClient.get(
        `auth/me?populatePermissions=${populatePermissions ? 1 : 0}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
  async resetPassword(id, password) {
    const body = { id: id, password: password };

    try {
      const response = await ApiClient.post("auth/resetpassword", body);
      return response;
    } catch (error) {
      throw error;
    }
  },
  //request password reset
  async requestPasswordReset(email) {
    const body = { email: email };

    try {
      const response = await ApiClient.post("auth/reset", body);
      return response;
    } catch (error) {
      throw error;
    }
  },
  isAuthenticated() {
    return ApiClient.isAuthenticated();
  },
};
