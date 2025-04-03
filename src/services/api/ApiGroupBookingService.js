import store from "@/store";
export default {
  getGroupBookings(tenantId, populate = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/group-bookings?populate=${populate}`, {
      withCredentials: true,
    });
  },
  commitGroupBooking(tenantId, groupBooking) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/group-bookings/commit`, groupBooking, {
      withCredentials: true,
    });
  }
};
