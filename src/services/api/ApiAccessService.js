import store from "@/store";

export default {
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
    return ApiClient.get(
      `api/${t}/access/${accessPointId}/open-status?openProcessId=${openProcessId}&bookingId=${bookingId}`
    );
  },
};
