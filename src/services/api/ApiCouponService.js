import store from "@/store";
export default {
  getCoupons(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/coupons`);
  },
  // The id of a coupon is the discount code the user types, so the caller
  // says whether it creates or updates; the id alone cannot.
  createCoupon(tenant, coupon) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/coupons`, coupon);
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
