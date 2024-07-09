export default {
  getTenants(publicTenants = false) {
    return ApiClient.get(`api/tenants?publicTenants=${publicTenants}`, {
      withCredentials: true,
    });
  },
  submitTenant(tenant) {
    return ApiClient.put("api/tenants", tenant, { withCredentials: true });
  },
  deleteTenant(tenant) {
    return ApiClient.delete(`api/tenants/${tenant.id}`, {
      withCredentials: true,
    });
  },
  getTenant(id, withCredentials = true) {
    return ApiClient.get(`api/tenants/${id}`, {
      withCredentials: withCredentials,
    });
  },
  async tenantCountCheck() {
    return (await ApiClient.get("api/tenants/count/check", {
      withCredentials: true,
    })).data
  },
  async tenantSsoConfig(id) {
    return (await ApiClient.get(`api/tenants/${id}/sso/config`, {
      withCredentials: true,
    })).data;
  },
};
