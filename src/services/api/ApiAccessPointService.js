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
   * The running and future bookings at Fächer of a Schließfachanlage, read
   * before a save takes them out of service or out of the Anlage
   * (ECCdigital/tickets#1043): `{ total, bookings }`, each booking with
   * `state` (`running` | `future`) and the `compartment` it holds.
   */
  getCompartmentBookings(id, compartmentIds, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/accesspoints/${id}/compartment-bookings`, {
      params: { compartmentIds: compartmentIds.join(",") },
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
   * Ask the provider where the lock stands. The answer is a suggestion only -
   * adopting it into `location` stays an explicit save by the admin.
   */
  getLocationPrefill(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/accesspoints/${id}/location-prefill`);
  },
};
