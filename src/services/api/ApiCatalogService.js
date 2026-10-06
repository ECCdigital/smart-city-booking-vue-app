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

  /**
   * The Hero Editor's three routes. It reads and writes the Hero Layout and
   * the Background through them, never through `getCatalog`: the read route
   * derives the Default Hero Layout while the catalog stores none and
   * enriches the media references, which the raw entity does not.
   */
  getHeroLayout() {
    return ApiClient.get("api/catalog/hero-layout");
  },
  updateHeroLayout(payload) {
    return ApiClient.put("api/catalog/hero-layout", payload);
  },
  /** Normalises, sanitises and enriches a Draft. Writes nothing. */
  previewHeroLayout(payload) {
    return ApiClient.post("api/catalog/hero-layout/preview", payload);
  },

  slugAvailability(slug) {
    return ApiClient.get(`api/catalog/availability/${slug}`);
  },
};
