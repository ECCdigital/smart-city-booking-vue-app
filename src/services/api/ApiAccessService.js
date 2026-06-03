import store from "@/store";

export default {
  getAccessPoints(bookingId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/access?bookingId=${bookingId}`);
  },

  getStatus(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/access/${accessPointId}/status?bookingId=${bookingId}`
    );
  },

  open(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/access/${accessPointId}/open?bookingId=${bookingId}`,
      {}
    );
  },

  close(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/access/${accessPointId}/close?bookingId=${bookingId}`,
      {}
    );
  },

  getOpenStatus(bookingId, accessPointId, tenant, openProcessId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const openProcessQuery = openProcessId
      ? `openProcessId=${openProcessId}&`
      : "";
    return ApiClient.get(
      `api/${t}/access/${accessPointId}/open-status?${openProcessQuery}bookingId=${bookingId}`
    );
  },
};
