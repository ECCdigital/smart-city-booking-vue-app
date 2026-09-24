import ApiClient from "@/services/api/ApiClientService";

/**
 * The tenant approval queue (glossary "Freigabeliste der Mandanten"): every
 * tenant at `pending`, instance owners only. The backend orders it - longest
 * waiting first - and cuts the page; it takes no filters, and `total` is its
 * counter.
 */
class ApiTenantApprovalQueueService {
  /**
   * @param {Object} params
   * @param {number} [params.page] 1-based
   * @param {number} [params.pageSize] The backend caps it at 200
   * @returns {Promise<{items: Object[], total: number, page: number, pageSize: number}>}
   *   A row is `{ tenantId, tenantName, waitingSince, contact, owners,
   *   offerCount, lastChange }`
   */
  static async getTenantApprovalQueue({ page, pageSize } = {}) {
    const response = await ApiClient.get(
      "api/instances/tenant-approval-queue",
      { params: { page, pageSize } }
    );
    return response.data;
  }
}

export default ApiTenantApprovalQueueService;
