import store from "@/store";

export default {
  getAccessPoints(bookingId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/access?bookingId=${bookingId}`);
  },

  getStatus(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/access/${accessPointId}/status?bookingId=${bookingId}`
    );
  },

  open(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/access/${accessPointId}/open?bookingId=${bookingId}`,
      {}
    );
  },

  close(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/access/${accessPointId}/close?bookingId=${bookingId}`,
      {}
    );
  },

  getOpenStatus(bookingId, accessPointId, tenant, openProcessId) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const openProcessQuery = openProcessId
      ? `openProcessId=${openProcessId}&`
      : "";
    return ApiClient.get(
      `api/${t}/access/${accessPointId}/open-status?${openProcessQuery}bookingId=${bookingId}`
    );
  },

  /**
   * The Fächer a Fach the platform assigned can be moved to (Umsetzen):
   * `[{ id, number, lockerBankName }]`, free and in service.
   */
  getFreeCompartments(bookingId, accessPointId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/access/${accessPointId}/free-compartments?bookingId=${bookingId}`
    );
  },

  /** Moves the Fach to `to`, an `id` `getFreeCompartments` named. */
  reassignCompartment(bookingId, accessPointId, to, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/access/${accessPointId}/reassign?bookingId=${bookingId}`,
      { to }
    );
  },

  exportAudit(filters = {}, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });
    const query = params.toString();
    return ApiClient.get(
      `api/${t}/access/audit/export${query ? `?${query}` : ""}`,
      { responseType: "blob" }
    );
  },
};
