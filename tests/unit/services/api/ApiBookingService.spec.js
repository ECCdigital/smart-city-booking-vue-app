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
      put: vi.fn().mockResolvedValue({ data: {} }),
      get: vi.fn().mockResolvedValue({ data: "pdf" }),
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

  it("posts an accepted withdrawal to the booking's accept-withdrawal route", async () => {
    const data = await ApiBookingService.acceptWithdrawal("bk-1");

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/bookings/bk-1/accept-withdrawal",
      {}
    );
    expect(data).toEqual({ success: true, data: null, errors: [] });
  });

  it("fetches a withdrawal receipt by its file name as a blob", async () => {
    await ApiBookingService.getWithdrawalReceipt("bk-1", "WB-1.pdf");

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t1/bookings/bk-1/withdrawal-receipt/WB-1.pdf",
      { responseType: "blob" }
    );
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

  it("creates a manual booking over POST and updates one over PUT", async () => {
    await ApiBookingService.createBooking({ name: "Neu" });
    await ApiBookingService.updateBooking({ id: "bk-1", name: "Alt" });

    expect(global.ApiClient.post).toHaveBeenCalledWith("api/t1/bookings", {
      name: "Neu",
    });
    expect(global.ApiClient.put).toHaveBeenCalledWith("api/t1/bookings", {
      id: "bk-1",
      name: "Alt",
    });
  });

  // A check of an upload of a series names the
  // other bookings ticked in the dialog; one of a single booking none.
  it("posts a check with the other bookings of a series it counts for", async () => {
    await ApiBookingService.reviewCustomerUpload(
      "t1",
      "B1",
      "f1",
      "m1",
      "accepted",
      "",
      ["B2"]
    );
    await ApiBookingService.reviewCustomerUpload(
      "t1",
      "B1",
      "f1",
      "m1",
      "accepted",
      ""
    );

    expect(global.ApiClient.post.mock.calls).toEqual([
      [
        "api/v2/t1/bookings/B1/customer-uploads/f1/m1/review",
        { result: "accepted", reason: "", alsoFor: ["B2"] },
      ],
      [
        "api/v2/t1/bookings/B1/customer-uploads/f1/m1/review",
        { result: "accepted", reason: "" },
      ],
    ]);
  });
});
