import store from "@/store";
export default {
  getCoupons(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/coupons`, { withCredentials: true });
  },
  submitCoupon(tenant, coupon) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.put(`api/${t}/coupons`, coupon, { withCredentials: true });
  },
  deleteCoupon(tenant, couponId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/coupons/${couponId}`, {
      withCredentials: true,
    });
  },
  getCoupon(tenant, couponId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/coupons/${couponId}`, { withCredentials: true });
  },
};
