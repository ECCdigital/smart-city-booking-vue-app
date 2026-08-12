import store from "@/store";

/**
 * Management API for the tenant-wide access points.
 *
 * The scan code behind a QR code never leaves the server: it is neither part
 * of a GET response nor of the rotation answer, which is why the QR code is
 * requested as a rendered file instead of being drawn in the client.
 */
export default {
  getAccessPoints(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/accesspoints`);
  },

  getAccessPoint(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/accesspoints/${id}`);
  },

  /**
   * Upsert an access point. A payload with `id` updates, one without creates
   * with a server-side id.
   */
  storeAccessPoint(accessPoint, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.put(`api/${t}/accesspoints`, accessPoint);
  },

  deleteAccessPoint(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/accesspoints/${id}`);
  },

  getQrCode(id, format = "pdf", tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/accesspoints/${id}/qrcode?format=${format}`,
      {
        responseType: "blob",
      }
    );
  },

  rotateScanCode(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/accesspoints/${id}/rotate-scan-code`, {});
  },

  /**
   * Ask the provider where the lock stands. The answer is a suggestion only -
   * adopting it into `location` stays an explicit save by the admin.
   */
  getLocationPrefill(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/accesspoints/${id}/location-prefill`);
  },
};
