import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "t1" } },
}));

/**
 * The series' cancellation receipt reprint
 * (`POST …/group-bookings/:id/cancellation-receipt`, spec E8) had no caller
 * in the UI before.
 */
describe("ApiGroupBookingService", () => {
  beforeEach(() => {
    global.ApiClient = { post: vi.fn() };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("posts a cancellation receipt reprint and answers with the series", async () => {
    const reprinted = { id: "grp-1", bookingIds: ["bk-1"] };
    global.ApiClient.post.mockResolvedValue({
      data: { success: true, data: reprinted, errors: [] },
    });

    const data = await ApiGroupBookingService.reprintGroupCancellationReceipt(
      undefined,
      "grp-1"
    );

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/group-bookings/grp-1/cancellation-receipt",
      {}
    );
    expect(data).toEqual({ success: true, data: reprinted, errors: [] });
  });
});
