import { describe, expect, it } from "vitest";
import {
  bookingPageRoute,
  groupBookingPageRoute,
} from "@/utils/bookingPageRoutes";

/**
 * The Buchungslink as a route (CONTEXT.md): the page's named route with the
 * tenant in `?tenant=`, the one shape every opener pushes.
 */
describe("bookingPageRoute", () => {
  it("names the Buchungsseite with the booking and the tenant", () => {
    expect(bookingPageRoute("bk-1", "tenant-1")).toEqual({
      name: "booking-details",
      params: { bookingId: "bk-1" },
      query: { tenant: "tenant-1" },
    });
  });
});

describe("groupBookingPageRoute", () => {
  it("names the Serienbuchungsseite with the series and the tenant", () => {
    expect(groupBookingPageRoute("grp-1", "tenant-1")).toEqual({
      name: "group-booking-details",
      params: { groupBookingId: "grp-1" },
      query: { tenant: "tenant-1" },
    });
  });
});
