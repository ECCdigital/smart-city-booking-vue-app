import store from "@/store";
export default {
  payments(bookingIds, tenant, aggregated) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/payments`, { bookingIds : bookingIds, aggregated }, { withCredentials : true });
  }
};
