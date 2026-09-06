import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiBookingService from "@/services/api/ApiBookingService";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "t1" } },
}));

/**
 * Wiederherstellen is a transition of its own since 4.3.x
 * (`POST …/bookings/:id/reinstate`, spec E1.3) - it used to be a PUT with
 * `isRejected: false`, which the admin PUT no longer reads. The cancellation
 * receipt's reprint (`POST …/bookings/:id/cancellation-receipt`, spec E8)
 * had no caller in the UI before.
 */
describe("ApiBookingService", () => {
  beforeEach(() => {
    global.ApiClient = {
      post: vi
        .fn()
        .mockResolvedValue({ data: { success: true, data: null, errors: [] } }),
    };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("posts a reinstate to the booking's reinstate route", async () => {
    const data = await ApiBookingService.reinstateBooking("bk-1");

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/bookings/bk-1/reinstate",
      {}
    );
    expect(data).toEqual({ success: true, data: null, errors: [] });
  });

  it("posts a cancellation receipt reprint and answers with the booking", async () => {
    const reprinted = { id: "bk-1", status: "cancelled", attachments: [] };
    global.ApiClient.post.mockResolvedValue({
      data: { success: true, data: reprinted, errors: [] },
    });

    const data = await ApiBookingService.reprintCancellationReceipt("bk-1");

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/bookings/bk-1/cancellation-receipt",
      {}
    );
    expect(data).toEqual({ success: true, data: reprinted, errors: [] });
  });
});
