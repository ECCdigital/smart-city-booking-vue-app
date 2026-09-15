import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "t1" } },
}));

/**
 * The series' cancellation receipt reprint
 * (`POST …/group-bookings/:id/cancellation-receipt`, spec E8) had no caller
 * in the UI before. The booking deep link pages fetch one series by id
 * (`GET …/group-bookings/:id`) and the series of a booking
 * (`GET …/group-bookings/booking/:bookingId`); both take `populate` the way
 * `ApiBookingService.getBooking` does.
 */
describe("ApiGroupBookingService", () => {
  beforeEach(() => {
    global.ApiClient = { get: vi.fn(), post: vi.fn() };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("gets one series by id from the current tenant, unpopulated by default", () => {
    const response = { data: { success: true, data: { id: "grp-1" } } };
    global.ApiClient.get.mockReturnValue(response);

    const result = ApiGroupBookingService.getGroupBooking("grp-1");

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t1/group-bookings/grp-1?populate=false"
    );
    expect(result).toBe(response);
  });

  it("gets one series by id from an explicit tenant, populated on request", () => {
    ApiGroupBookingService.getGroupBooking("grp-1", "t2", true);

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t2/group-bookings/grp-1?populate=true"
    );
  });

  it("gets the series of a booking from the current tenant, unpopulated by default", () => {
    const response = { data: { success: true, data: { id: "grp-1" } } };
    global.ApiClient.get.mockReturnValue(response);

    const result = ApiGroupBookingService.getGroupBookingByBooking("bk-1");

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t1/group-bookings/booking/bk-1?populate=false"
    );
    expect(result).toBe(response);
  });

  it("gets the series of a booking from an explicit tenant, populated on request", () => {
    ApiGroupBookingService.getGroupBookingByBooking("bk-1", "t2", true);

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t2/group-bookings/booking/bk-1?populate=true"
    );
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
