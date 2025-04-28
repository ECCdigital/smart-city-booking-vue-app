import store from "@/store";
export default {
  getGroupBookings(tenantId, populate = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/group-bookings?populate=${populate}`, {
      withCredentials: true,
    });
  },
  async commitGroupBooking(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/commit`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  },
  async rejectGroupBooking(tenantId, groupBookingId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/reject`,
      {reason: reason},
      {
        withCredentials: true,
      }
    );
    return response.data;
  },
  deleteGroupBooking(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/group-bookings/${groupBookingId}`, {
      withCredentials: true,
    });
  },
  async generateGroupReceipt(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/receipt`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  }
};
