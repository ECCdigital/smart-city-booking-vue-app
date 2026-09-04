import store from "@/store";

export default {
  getLocations(tenantID, provider) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/locker/${provider}/locations`);
  },
  getLocationById(tenantID, provider, locationId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `/api/${t}/locker/${provider}/locations/${locationId}`
    );
  },
  getLocationStatus(tenantID, provider, locationId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `/api/${t}/locker/${provider}/locations/${locationId}/status`
    );
  },
  getPrice(tenantID, provider, locationId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `/api/${t}/locker/${provider}/locations/${locationId}/price`
    );
  },
};
