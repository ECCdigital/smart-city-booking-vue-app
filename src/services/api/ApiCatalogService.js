import store from "@/store";

export default {
  getTenantCatalog(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    return ApiClient.get(`api/${t}/catalog`);
  },
  updateTenantCatalog(tenantId, catalog) {
    const t = tenantId || store.getters["tenants/currentTenantId"];

    return ApiClient.put(`api/${t}/catalog`, catalog);
  },

  getCatalog() {
    return ApiClient.get("api/catalog");
  },
  updateCatalog(catalog) {
    return ApiClient.put("api/catalog", catalog);
  },

  slugAvailability(slug) {
    return ApiClient.get(`api/catalog/availability/${slug}`);
  },
};
