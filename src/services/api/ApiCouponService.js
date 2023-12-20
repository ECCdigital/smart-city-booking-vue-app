import store from "@/store";

const currentTenant = store.getters["tenants/tenant"];
export default {
  getCoupons(tenant) {
    const t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/coupons`, { withCredentials: true });
  },
  submitCoupon(tenant, coupon) {
    const t = tenant || currentTenant.id;
    return ApiClient.put(`api/${t}/coupons`, coupon, { withCredentials: true });
  },
  deleteCoupon(tenant, couponId) {
    const t = tenant || currentTenant.id;
    return ApiClient.delete(`api/${t}/coupons/${couponId}`, {
      withCredentials: true,
    });
  },
  getCoupon(tenant, couponId) {
    const t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/coupons/${couponId}`, { withCredentials: true });
  },
};
