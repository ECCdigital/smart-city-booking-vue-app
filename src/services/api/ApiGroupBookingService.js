import store from "@/store";
export default {
  getGroupBookings(tenantId, populate = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/group-bookings?populate=${populate}`, {
      withCredentials: true,
    });
  },
  commitGroupBooking(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/commit`,
      {},
      {
        withCredentials: true,
      }
    );
  },
  rejectGroupBooking(tenantId, groupBookingId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/reject`,
      { reason: reason },
      {
        withCredentials: true,
      }
    );
  },
  deleteGroupBooking(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/group-bookings/${groupBookingId}`, {
      withCredentials: true,
    });
  },
  generateGroupReceipt(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/receipt`,
      {},
      {
        withCredentials: true,
      }
    );
  }
};
