import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";

describe("ApiSupervisionNotificationService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
    ApiClient.post.mockReset();
  });

  it("reads one page of the outbox with the asked status", async () => {
    const page = { items: [{ id: "n-1" }], total: 1, page: 2, pageSize: 25 };
    ApiClient.get.mockResolvedValue({ data: page });

    const result = await ApiSupervisionNotificationService.getNotifications({
      status: "failed",
      page: 2,
      pageSize: 25,
    });

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/instances/supervision/notifications",
      { params: { status: "failed", page: 2, pageSize: 25 } }
    );
    expect(result).toEqual(page);
  });

  it("leaves the status out when every row is asked for", async () => {
    ApiClient.get.mockResolvedValue({ data: { items: [], total: 0 } });

    await ApiSupervisionNotificationService.getNotifications({
      status: null,
      page: 1,
      pageSize: 50,
    });

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/instances/supervision/notifications",
      { params: { page: 1, pageSize: 50 } }
    );
  });

  it("sends a row again and answers the row as it is after", async () => {
    ApiClient.post.mockResolvedValue({ data: { id: "n 1", status: "sent" } });

    const row = await ApiSupervisionNotificationService.retry("n 1");

    expect(ApiClient.post).toHaveBeenCalledWith(
      "api/instances/supervision/notifications/n%201/retry"
    );
    expect(row).toEqual({ id: "n 1", status: "sent" });
  });
});
