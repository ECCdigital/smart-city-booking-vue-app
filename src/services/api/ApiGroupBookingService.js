import store from "@/store";
export default {
  getGroupBookings(tenant, populate = false) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/group-bookings?populate=${populate}`, {
      withCredentials: true,
    });
  },
};
