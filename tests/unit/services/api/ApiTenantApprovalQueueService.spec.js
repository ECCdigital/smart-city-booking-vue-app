import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiTenantApprovalQueueService from "@/services/api/ApiTenantApprovalQueueService";

describe("ApiTenantApprovalQueueService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
  });

  it("reads one page of the tenant approval queue", async () => {
    const page = {
      items: [{ tenantId: "t-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    };
    ApiClient.get.mockResolvedValue({ data: page });

    const result = await ApiTenantApprovalQueueService.getTenantApprovalQueue({
      page: 2,
      pageSize: 10,
    });

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/instances/tenant-approval-queue",
      { params: { page: 2, pageSize: 10 } }
    );
    expect(result).toEqual(page);
  });
});
