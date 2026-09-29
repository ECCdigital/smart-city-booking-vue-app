import ApiClient from "@/services/api/ApiClientService";

const isSet = (value) => value !== undefined && value !== null && value !== "";

/**
 * The active review queue (glossary "Aktive Prüfliste"): every pending offer
 * of a supervised tenant, instance owners only. The backend computes it on
 * read and orders it - longest waiting first, stable across pages.
 */
class ApiReviewQueueService {
  /**
   * @param {Object} params
   * @param {number} [params.page] 1-based
   * @param {number} [params.pageSize] The backend caps it at 200
   * @param {string} [params.tenantId] Only the rows of this tenant
   * @param {string} [params.offerType] `bookable` or `event`
   * @returns {Promise<{items: Object[], total: number, page: number, pageSize: number}>}
   */
  static async getReviewQueue(params = {}) {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => isSet(value))
    );
    const response = await ApiClient.get("api/instances/review-queue", {
      params: query,
    });
    return response.data;
  }
}

export default ApiReviewQueueService;
