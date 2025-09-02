import store from "@/store";
export default {
  getBookings(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const p = populate || false;
    return ApiClient.get(`api/${t}/bookings?populate=${p}`, {
      withCredentials: true,
    });
  },
  getBooking(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const p = populate || false;
    return ApiClient.get(`api/${t}/bookings/${id}?populate=${p}`, {
      withCredentials: true,
    });
  },
  getPublicBookings(tenant) {
    var t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings?public=true`, {
      withCredentials: true,
    });
  },
  getBookingStatus(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings/${id}/status`, {
      withCredentials: true,
    });
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
      `api/${t}/bookables/${bookableId}/bookings?related=${irb}&parent=${ipb}&public=${po}`,
      { withCredentials: true }
    );
  },
  storeBooking(booking) {
    const cleansedBooking = Object.assign(new Object(), booking);
    return ApiClient.put(
      `api/${store.getters["tenants/currentTenantId"]}/bookings`,
      cleansedBooking,
      {
        withCredentials: true,
      }
    );
  },
  checkoutBooking(bookingAttempt, simulate, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/checkout?simulate=${simulate || false}`,
      bookingAttempt,
      { withCredentials: true }
    );
  },
  async commitBooking(id) {
    const response = await ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/commit`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  },
  rejectBooking(id, tenantId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/bookings/${id}/reject`,
      { reason: reason },
      {
        withCredentials: true,
      }
    );
  },
  requestRejectBooking(id, tenantId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/bookings/${id}/request-reject`,
      { reason: reason },
      {
        withCredentials: true,
      }
    );
  },
  releaseBookingHook(id, tenantId, hookId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings/${id}/hooks/${hookId}/release`, {
      withCredentials: true,
    });
  },
  deleteBooking(id) {
    return ApiClient.delete(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}`,
      {
        withCredentials: true,
      }
    );
  },
  async generateReceipt(id) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/receipt`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  },
  getReceipt(id, receiptId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/receipt/${receiptId}`,
      {
        responseType: "blob",
        withCredentials: true,
      }
    );
  },
  checkPublicBookingStatus(id, lastname, tenantId) {
    return ApiClient.get(`api/${tenantId}/bookings/${id}/status/public`, {
      params: {
        lastname: lastname,
      },
      withCredentials: true,
    });
  },
  verifyBookingOwnership(tenantId, bookingId, bookingName) {
    return ApiClient.get(
      `api/${tenantId}/bookings/${bookingId}/verify-ownership`,
      {
        params: {
          name: bookingName,
        },
        withCredentials: true,
      }
    );
  },
};
