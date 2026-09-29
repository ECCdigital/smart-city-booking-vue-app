import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiReviewQueueService from "@/services/api/ApiReviewQueueService";

describe("ApiReviewQueueService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
  });

  it("reads one page of the active review queue with its filters", async () => {
    const page = {
      items: [{ offerId: "b-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    };
    ApiClient.get.mockResolvedValue({ data: page });

    const result = await ApiReviewQueueService.getReviewQueue({
      page: 2,
      pageSize: 10,
      tenantId: "t-1",
      offerType: "event",
    });

    expect(ApiClient.get).toHaveBeenCalledWith("api/instances/review-queue", {
      params: { page: 2, pageSize: 10, tenantId: "t-1", offerType: "event" },
    });
    expect(result).toEqual(page);
  });

  it("leaves an unset filter out of the query", async () => {
    ApiClient.get.mockResolvedValue({ data: { items: [], total: 0 } });

    await ApiReviewQueueService.getReviewQueue({
      page: 1,
      pageSize: 25,
      tenantId: null,
      offerType: "",
    });

    expect(ApiClient.get).toHaveBeenCalledWith("api/instances/review-queue", {
      params: { page: 1, pageSize: 25 },
    });
  });
});
