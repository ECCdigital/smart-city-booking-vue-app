import store from "@/store";

export default {
  open(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/bookings/${bookingId}/access/${accessPointId}/open`,
      {}
    );
  },

  close(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/bookings/${bookingId}/access/${accessPointId}/close`,
      {}
    );
  },

  getOpenStatus(bookingId, accessPointId, tenant, openProcessId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/bookings/${bookingId}/access/${accessPointId}/open-status?openProcessId=${openProcessId}`
    );
  },
};
