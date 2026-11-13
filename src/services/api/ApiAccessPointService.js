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

  /**
   * Upsert an access point. A payload with `id` updates, one without creates
   * with a server-side id.
   */
  storeAccessPoint(accessPoint, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.put(`api/${t}/accesspoints`, accessPoint);
  },

  /**
   * Set the bookables that carry the access point (ECCdigital/tickets#1110):
   * `bookableIds` names every one of them, the backend adds the access point
   * where it is missing and removes it from every other bookable. A bookable
   * that gets its first access point has its access switched on.
   */
  assignBookables(id, bookableIds, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.put(`api/${t}/accesspoints/${id}/bookables`, {
      bookableIds,
    });
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

  /**
   * The QR code of one Fach of a Schließfachanlage that carries its own
   * Fächer (ECCdigital/tickets#1056), addressed by the Anlage and the Fach's
   * UUID, rendered by the server like the door's.
   */
  getCompartmentQrCode(id, compartmentId, format = "pdf", tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/accesspoints/${id}/compartments/${compartmentId}/qrcode?format=${format}`,
      { responseType: "blob" }
    );
  },

  /**
   * The Sammel-PDF of a Schließfachanlage that carries its own Fächer
   * (ECCdigital/tickets#1062): the QR codes of all its Fächer on an
   * Etikettenbogen, rendered by the server.
   */
  getCompartmentQrSheet(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/accesspoints/${id}/compartments/qrcodes`, {
      responseType: "blob",
    });
  },

  rotateScanCode(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`api/${t}/accesspoints/${id}/rotate-scan-code`, {});
  },

  /**
   * Rotate the scan code of one Fach of a Schließfachanlage that carries its
   * own Fächer (ECCdigital/tickets#1061), addressed by the Anlage and the
   * Fach's UUID. The answer carries no code.
   */
  rotateCompartmentScanCode(id, compartmentId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/accesspoints/${id}/compartments/${compartmentId}/rotate-scan-code`,
      {}
    );
  },

  /**
   * Rotate the scan codes of all Fächer of a Schließfachanlage that carries
   * its own Fächer at once (ECCdigital/tickets#1063). The answer carries no
   * code.
   */
  rotateAllCompartmentScanCodes(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/accesspoints/${id}/compartments/rotate-scan-codes`,
      {}
    );
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
