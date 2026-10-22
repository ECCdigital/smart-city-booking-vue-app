import ApiClient from "@/services/api/ApiClientService";

/**
 * The route each way of the administration asks before it saves
 * (ECCdigital/tickets#629), under the right of that way.
 */
const MATCH_PATHS = {
  manualBooking: (tenantId) => `api/${tenantId}/bookings/blacklist-match`,
  bookingMail: (tenantId) => `api/${tenantId}/bookings/blacklist-match/mail`,
  tenantUser: (tenantId) => `api/tenants/${tenantId}/users/blacklist-match`,
};

/**
 * The blacklist of the instance (glossary „Blacklist“,
 * ECCdigital/tickets#625), the instance owner's alone.
 */
export default {
  getEntries() {
    return ApiClient.get("api/instances/blacklist");
  },
  /** The accounts an entry of this value would hit, before it is added. */
  getPreview(value) {
    return ApiClient.get("api/instances/blacklist/preview", {
      params: { value },
    });
  },
  /** Adds an entry; it suspends the matching accounts at once. */
  createEntry(value, reason) {
    return ApiClient.post("api/instances/blacklist", { value, reason });
  },
  updateReason(id, reason) {
    return ApiClient.put(`api/instances/blacklist/${id}`, { reason });
  },
  /** Removes an entry; `unsuspend` lifts the suspensions it made. */
  removeEntry(id, unsuspend) {
    return ApiClient.delete(`api/instances/blacklist/${id}`, {
      params: { unsuspend },
    });
  },
  /**
   * Whether an entry hits `address` (ECCdigital/tickets#629): the warning
   * of a way of the administration, which names neither the entry nor its
   * reason.
   *
   * @param {"manualBooking"|"bookingMail"|"tenantUser"} way
   * @param {string} address
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(way, address, tenantId) {
    const response = await ApiClient.post(MATCH_PATHS[way](tenantId), {
      address,
    });
    return response.data?.blacklisted === true;
  },
};
