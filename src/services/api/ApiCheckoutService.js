import store from "@/store";
const currentTenant = store.getters["tenants/tenant"];

export default {
  validateCheckoutItem(tenant, item, timeBegin, timeEnd) {
    return ApiClient.post(
      `api/${tenant}/checkout/validateItem`,
      { ...item, tenant, timeBegin, timeEnd },
      {
        withCredentials: true,
      }
    );
  },
  checkout(tenant, payload, simulate = true) {
    return ApiClient.post(
      `api/${tenant}/checkout?simulate=${simulate === true ? "true" : "false"}`,
      payload,
      {
        withCredentials: true,
      }
    );
  },
};
