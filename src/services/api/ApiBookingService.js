import store from "@/store";
const currentTenant = store.getters["tenants/tenant"];

export default {
  getBookings(tenant, populate) {
    var t = tenant || currentTenant.id;
    var p = populate || false;
    return ApiClient.get(`api/${t}/bookings?populate=${p}`, {
      withCredentials: true,
    });
  },
  getBooking(id, tenant, populate) {
    var t = tenant || currentTenant.id;
    var p = populate || false;
    return ApiClient.get(`api/${t}/bookings/${id}?populate=${p}`, {
      withCredentials: true,
    });
  },
  getPublicBookings(tenant) {
    var t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/bookings?public=true`, {
      withCredentials: true,
    });
  },
  getBookingStatus(id, tenant) {
    const t = tenant || currentTenant.id;
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
    var t = tenant || currentTenant.id;
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
    return ApiClient.put(`api/${currentTenant.id}/bookings`, cleansedBooking, {
      withCredentials: true,
    });
  },
  checkoutBooking(bookingAttempt, simulate, tenant) {
    const t = tenant || currentTenant.id;
    return ApiClient.post(
      `api/${t}/checkout?simulate=${simulate || false}`,
      bookingAttempt,
      { withCredentials: true }
    );
  },
  commitBooking(id) {
    return ApiClient.get(`api/${currentTenant.id}/bookings/${id}/commit`, {
      withCredentials: true,
    });
  },
  deleteBooking(booking) {
    return ApiClient.delete(`api/${currentTenant.id}/bookings/${booking.id}`, {
      withCredentials: true,
    });
  },
};
