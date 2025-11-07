import store from "@/store";
export default {
  getCoupons(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/coupons`);
  },
  submitCoupon(tenant, coupon) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.put(`api/${t}/coupons`, coupon);
  },
  deleteCoupon(tenant, couponId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/coupons/${couponId}`);
  },
  getCoupon(tenant, couponId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/coupons/${couponId}`);
  },
};
