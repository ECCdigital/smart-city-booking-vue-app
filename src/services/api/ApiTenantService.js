export default {
  getTenants() {
    return ApiClient.get("api/tenants",  { withCredentials : true });
  },
  submitTenant(tenant) {
    return ApiClient.put("api/tenants", tenant ,{ withCredentials : true })
  },
  deleteTenant(tenant) {
    return ApiClient.delete(`api/tenants/${tenant.id}`, {withCredentials: true})
  },
  getTenant(id) {
    return ApiClient.get(`api/tenants/${id}`,  { withCredentials : true });
  }
};
