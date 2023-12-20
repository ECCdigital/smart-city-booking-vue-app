import store from "@/store";
const currentTenant = store.getters["tenants/tenant"];

export default {
  payments(bookingId, tenant) {
    const t = tenant || currentTenant.id;
    return ApiClient.post(`api/${t}/payments`, { bookingId : bookingId }, { withCredentials : true });
  }
};
