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
  addTenantUser(tenantId, userId, roles) {
    return ApiClient.post(
      `/api/tenants/${tenantId}/add-user`,
      { userId, roles },
      { withCredentials: true }
    );
  },
  removeTenantUser(tenantId, userId) {
    return ApiClient.post(
      `/api/tenants/${tenantId}/remove-user`,
      { userId },
      { withCredentials: true }
    );
  },
  removeTenantUserRole(tenantId, userId, roleId) {
    return ApiClient.post(
      `/api/tenants/${tenantId}/remove-user-role`,
      { userId, roleId },
      { withCredentials: true }
    );
  },
  addTenantOwner(tenantId, userId) {
    return ApiClient.post(
      `/api/tenants/${tenantId}/add-owner`,
      { userId },
      { withCredentials: true }
    );
  },
  removeTenantOwner(tenantId, userId) {
    return ApiClient.post(
      `/api/tenants/${tenantId}/remove-owner`,
      { userId },
      { withCredentials: true }
    );
  },
  async tenantCountCheck() {
    return (
      await ApiClient.get("api/tenants/count/check", {
        withCredentials: true,
      })
    ).data;
  },
};
