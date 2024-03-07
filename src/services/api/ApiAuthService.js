import store from "@/store";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  login(tenant, id, password) {
    const body = {
      id: id,
      password: password,
    };

    return ApiClient.post(`auth/${tenant}/signin`, body, {
      withCredentials: true,
    });
  },
  register(tenant, id, firstName, lastName, password) {
    const body = {
      id: id,
      firstName: firstName,
      lastName: lastName,
      password: password,
    };

    return ApiClient.post(`auth/${tenant}/signup`, body, {
      withCredentials: true,
    }).then(async (response) => {
      return response;
    });
  },
  logout(tenant) {
    const currentTenant = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`auth/${currentTenant}/signout`, {
      withCredentials: true,
    });
  },
  me(tenant, populatePermissions) {
    let currentTenant = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(
      `auth/${currentTenant}/me?populatePermissions=${
        populatePermissions ? 1 : 0
      }`,
      { withCredentials: true }
    );
  },
  resetPassword(id, password, tenantId) {
    const currentTenant = tenantId || store.getters["tenants/tenant"].id;
    const body = {
      id: id,
      password: password,
    };

    return ApiClient.post(`auth/${currentTenant}/resetpassword`, body, {
      withCredentials: true,
    });
  },
  //request password reset
  requestPasswordReset(email) {
    const body = {
      email: email,
    };

    return ApiClient.post(
      `auth/${store.getters["tenants/tenant"].id}/reset`,
      body,
      { withCredentials: true }
    );
  },
};
