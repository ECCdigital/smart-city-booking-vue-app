export default {
  getTenants(publicTenants = false) {
    return ApiClient.get(`api/tenants?publicTenants=${publicTenants}`);
  },
  submitTenant(tenant) {
    return ApiClient.put("api/tenants", tenant);
  },
  createTenant(tenant) {
    return ApiClient.post("api/tenants", tenant);
  },
  deleteTenant(tenant) {
    return ApiClient.delete(`api/tenants/${tenant.id}`);
  },
  getTenantActivePaymentApps(tenantId) {
    return ApiClient.get(`api/tenants/${tenantId}/payment-apps`);
  },
  getTenant(tenantId, withCredentials = true) {
    return ApiClient.get(`api/tenants/${tenantId}`, {
      withCredentials: withCredentials,
    });
  },
  async addTenantUser(tenantId, userId, roles, challenges, type) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/add-user`,
      { userId, roles, challenges, type }
    );
    return response.data;
  },
  async removeTenantUser(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-user`,
      { userId }
    );
    return response.data;
  },
  async getTenantUsers(tenantId) {
    const response = await ApiClient.get(`api/${tenantId}/users`);
    return response.data;
  },
  async removeTenantUserRole(tenantId, userId, roleId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-user-role`,
      { userId, roleId }
    );
    return response.data;
  },
  async addTenantOwner(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/add-owner`,
      { userId }
    );
    return response.data;
  },
  async removeTenantOwner(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-owner`,
      { userId }
    );
    return response.data;
  },
  async editTenantUserRoles(tenantId, userId, roles) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/edit-user-roles`,
      { userId, roles }
    );
    return response.data;
  },
  async tenantCountCheck() {
    return (await ApiClient.get("api/tenants/count/check")).data;
  },
  async updateUserStatus(tenantId, userId, status) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/update-user-status`,
      { userId, status },
    );
    return response.data;
  },
};
