import ApiClient from "@/services/api/ApiClientService";

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
};
