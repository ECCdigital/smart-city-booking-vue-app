import store from "@/store";
export default {
  getBookings(tenant, populate) {
    var t = tenant || store.getters["tenants/tenant"].id;
    var p = populate || false;
    return ApiClient.get(`api/${t}/bookings?populate=${p}`, {
      withCredentials: true,
    });
  },
  getBooking(id, tenant, populate) {
    var t = tenant || store.getters["tenants/tenant"].id;
    var p = populate || false;
    return ApiClient.get(`api/${t}/bookings/${id}?populate=${p}`, {
      withCredentials: true,
    });
  },
  getPublicBookings(tenant) {
    var t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/bookings?public=true`, {
      withCredentials: true,
    });
  },
  getBookingStatus(id, tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
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
    var t = tenant || store.getters["tenants/tenant"].id;
    var irb = includeRelatedBookables || false;
    var ipb = includeParentBookables || false;
    var po = publicOnly || false;

    //TODO: check if typo-correction interferes anywhere
    return ApiClient.get(
      `api/${t}/bookables/${bookableId}/bookings?related=${irb}&parent=${ipb}&public=${po}`,
      { withCredentials: true }
    );
  },
  storeBooking(booking) {
    const cleansedBooking = Object.assign(new Object(), booking);
    delete cleansedBooking._populated;
    return ApiClient.put(
      `api/${store.getters["tenants/tenant"].id}/bookings`,
      cleansedBooking,
      {
        withCredentials: true,
      }
    );
  },
  checkoutBooking(bookingAttempt, simulate, tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.post(
      `api/${t}/checkout?simulate=${simulate || false}`,
      bookingAttempt,
      { withCredentials: true }
    );
  },
  commitBooking(id) {
    return ApiClient.get(
      `api/${store.getters["tenants/tenant"].id}/bookings/${id}/commit`,
      {
        withCredentials: true,
      }
    );
  },
  rejectBooking(id) {
    return ApiClient.get(
      `api/${store.getters["tenants/tenant"].id}/bookings/${id}/reject`,
      {
        withCredentials: true,
      }
    );
  },
  deleteBooking(booking) {
    return ApiClient.delete(
      `api/${store.getters["tenants/tenant"].id}/bookings/${booking.id}`,
      {
        withCredentials: true,
      }
    );
  },
  generateReceipt(id) {
    return ApiClient.post(
      `api/${store.getters["tenants/tenant"].id}/bookings/${id}/receipt`,
      {},
      {
        withCredentials: true,
      }
    );
  },
  getReceipt(id, receiptId) {
    return ApiClient.get(
      `api/${store.getters["tenants/tenant"].id}/bookings/${id}/receipt/${receiptId}`,
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
};
