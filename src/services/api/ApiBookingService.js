import store from "@/store";
export default {
  getBookings(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const p = populate || false;
    return ApiClient.get(`api/${t}/bookings?populate=${p}`);
  },
  getBooking(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const p = populate || false;
    return ApiClient.get(`api/${t}/bookings/${id}?populate=${p}`);
  },
  getPublicBookings(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings?public=true`);
  },
  getBookingStatus(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings/${id}/status`);
  },
  getRelatedBookings(
    bookableId,
    tenant,
    includeRelatedBookables,
    includeParentBookables,
    publicOnly
  ) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const irb = includeRelatedBookables || false;
    const ipb = includeParentBookables || false;
    const po = publicOnly || false;

    //TODO: check if typo-correction interferes anywhere
    return ApiClient.get(
      `api/${t}/bookables/${bookableId}/bookings?related=${irb}&parent=${ipb}&public=${po}`
    );
  },
  storeBooking(booking) {
    const cleansedBooking = Object.assign(new Object(), booking);
    return ApiClient.put(
      `api/${store.getters["tenants/currentTenantId"]}/bookings`,
      cleansedBooking
    );
  },
  checkoutBooking(bookingAttempt, simulate, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/checkout?simulate=${simulate || false}`,
      bookingAttempt,
    );
  },
  async commitBooking(id) {
    const response = await ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/commit`
    );
    return response.data;
  },
  async payBooking(id, paymentMethod, timePaid) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/pay`,
      { paymentMethod: paymentMethod, timePaid }
    );
    return response.data;
  },
  rejectBooking(id, tenantId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/bookings/${id}/reject`, { reason: reason });
  },
  requestRejectBooking(id, tenantId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/bookings/${id}/request-reject`, {
      reason: reason,
    });
  },
  releaseBookingHook(id, tenantId, hookId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings/${id}/hooks/${hookId}/release`);
  },
  deleteBooking(id) {
    return ApiClient.delete(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}`
    );
  },
  async generateReceipt(id) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/receipt`,
      {}
    );
    return response.data;
  },
  getReceipt(id, receiptId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/receipt/${receiptId}`,
      {
        responseType: "blob",
      }
    );
  },
  getInvoice(id, invoiceId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/invoice/${invoiceId}`,
      {
        responseType: "blob",
      }
    );
  },
  checkPublicBookingStatus(id, lastname, tenantId) {
    return ApiClient.get(`api/${tenantId}/bookings/${id}/status/public`, {
      params: {
        lastname: lastname,
      },
    });
  },
  verifyBookingOwnership(tenantId, bookingId, bookingName) {
    return ApiClient.get(
      `api/${tenantId}/bookings/${bookingId}/verify-ownership`,
      {
        params: {
          name: bookingName,
        },
      }
    );
  },
};
