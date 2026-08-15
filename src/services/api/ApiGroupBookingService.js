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
  async getCancellationRefundPreview(tenantId, groupBookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.get(
      `api/${t}/group-bookings/${groupBookingId}/cancellation-refund-preview`
    );
    return response.data;
  },
  async rejectGroupBooking(
    tenantId,
    groupBookingId,
    reason,
    skipCancellation,
    bankDetails,
    refundPercentage
  ) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const payload = {
      reason: reason,
      skipCancellation: skipCancellation,
    };
    if (bankDetails) {
      payload.bankDetails = bankDetails;
    }
    if (refundPercentage !== undefined) {
      payload.refundPercentage = refundPercentage;
    }
    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/reject`,
      payload
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
  async generateGroupInvoice(tenantId, groupBookingId, sendEmail = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.post(
      `api/${t}/group-bookings/${groupBookingId}/invoice?sendEmail=${sendEmail}`,
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
