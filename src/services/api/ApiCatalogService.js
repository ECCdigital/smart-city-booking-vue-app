import store from "@/store";

export default {
  getCatalog(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    return ApiClient.get(`api/${t}/catalog`);
  },
  updateCatalog(tenantId, catalog) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    return ApiClient.put(`api/${t}/catalog`, catalog);
  },

  slugAvailability(slug) {
    return ApiClient.get(`api/catalog/availability/${slug}`);
  },
};
