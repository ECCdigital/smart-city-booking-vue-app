import store from "@/store";
export default {
  getGroupBookings(tenantId, populate = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/group-bookings?populate=${populate}`);
  },
  async commitGroupBooking(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/commit`,
      {}
    );
    return response.data;
  },
  async payGroupBooking({ tenantId, id, paymentMethod, timePaid }) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    const response = await ApiClient.post(`api/${t}/group-bookings/${id}/pay`, {
      paymentMethod: paymentMethod,
      timePaid,
    });
    return response.data;
  },
  async rejectGroupBooking(tenantId, groupBookingId, reason, skipCancellation) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/reject`,
      { reason: reason, skipCancellation: skipCancellation }
    );
    return response.data;
  },
  deleteGroupBooking(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/group-bookings/${groupBookingId}`);
  },
  async generateGroupReceipt(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/receipt`,
      {}
    );
    return response.data;
  },
  async updateGroupBooking(tenantId, groupBookingId, updateData) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.put(
      `api/${t}/group-bookings/${groupBookingId}`,
      { updateData }
    );
    return response.data;
  },
};
