import store from "@/store";

export default {
  testConnection({ tenantID, provider, config }) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`/api/${t}/locker/${provider}/test`, config);
  },
  getLocations(tenantID, provider) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/locker/${provider}/locations`);
  },
  getLocationById(tenantID, provider, locationId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/locker/${provider}/locations/${locationId}`);
  },
  getLocationStatus(tenantID, provider, locationId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `/api/${t}/locker/${provider}/locations/${locationId}/status`
    );
  }
};
