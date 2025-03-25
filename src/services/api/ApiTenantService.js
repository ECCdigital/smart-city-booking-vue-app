export default {
  getTenants(publicTenants = false) {
    return ApiClient.get(`api/tenants?publicTenants=${publicTenants}`, {
      withCredentials: true,
    });
  },
  submitTenant(tenant) {
    return ApiClient.put("api/tenants", tenant, { withCredentials: true });
  },
  createTenant(tenant) {
    return ApiClient.post("api/tenants", tenant, { withCredentials: true });
  },
  deleteTenant(tenant) {
    return ApiClient.delete(`api/tenants/${tenant.id}`, {
      withCredentials: true,
    });
  },
  getTenantActivePaymentApps(tenantId, withCredentials = true) {
    return ApiClient.get(`api/tenants/${tenantId}/payment-apps`, {
      withCredentials: withCredentials,
    });
  },
  getTenant(tenantId, withCredentials = true) {
    return ApiClient.get(`api/tenants/${tenantId}`, {
      withCredentials: withCredentials,
    });
  },
  async addTenantUser(tenantId, userId, roles) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/add-user`,
      {userId, roles},
      {withCredentials: true}
    );
    return response.data;
  },
  async removeTenantUser(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-user`,
      {userId},
      {withCredentials: true}
    );
    return response.data;
  },
  async getTenantUsers(tenantId) {
    const response = await ApiClient.get(`api/${tenantId}/users`, {
      withCredentials: true,
    });
    return response.data;
  },
  async removeTenantUserRole(tenantId, userId, roleId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-user-role`,
      {userId, roleId},
      {withCredentials: true}
    );
    return response.data;
  },
  async addTenantOwner(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/add-owner`,
      {userId},
      {withCredentials: true}
    );
    return response.data;
  },
  async removeTenantOwner(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-owner`,
      {userId},
      {withCredentials: true}
    );
    return response.data;
  },
  async editTenantUserRoles(tenantId, userId, roles) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/edit-user-roles`,
      {userId, roles},
      {withCredentials: true}
    );
    return response.data;
  },
  async tenantCountCheck() {
    return (
      await ApiClient.get("api/tenants/count/check", {
        withCredentials: true,
      })
    ).data;
  },
};
