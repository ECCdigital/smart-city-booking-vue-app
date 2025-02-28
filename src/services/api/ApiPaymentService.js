import store from "@/store";
export default {
  payments(bookingId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/payments`, { bookingId : bookingId }, { withCredentials : true });
  }
};
