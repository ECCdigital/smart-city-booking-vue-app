import store from "@/store";
export default {
  payments(bookingIds, tenant, aggregated) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/payments`,
      {
        bookingIds: bookingIds,
        aggregated,
      },
      {
        withCredentials: true,
      }
    );
  },
  testConnection(provider, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/payments/providers/${provider}/test`);
  },
};
