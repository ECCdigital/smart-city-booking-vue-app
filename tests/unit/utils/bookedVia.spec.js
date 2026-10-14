import { describe, expect, it } from "vitest";
import {
  BOOKED_VIA,
  bookedViaLabel,
  bookedViaOf,
  bookedViaTitle,
  filterBookingsByBookedVia,
} from "@/utils/bookedVia";

/** The Buchungsweg: how a booking was made, in the list, detail and XLSX. */
describe("bookedViaTitle", () => {
  it("reads Buchungsweg", () => {
    expect(bookedViaTitle()).toBe("Buchungsweg");
  });
});

describe("bookedViaLabel", () => {
  it.each([
    ["user", "Angemeldet"],
    ["guest", "Gast"],
    ["admin", "Admin"],
  ])("reads %s as %s", (code, label) => {
    expect(bookedViaLabel(code)).toBe(label);
  });

  it.each([["kiosk"], [null], [undefined], [""]])(
    "reads „Unbekannt“ for %s",
    (code) => {
      expect(bookedViaLabel(code)).toBe("Unbekannt");
    }
  );
});

describe("bookedViaOf", () => {
  it.each([
    ["user", BOOKED_VIA.USER],
    ["guest", BOOKED_VIA.GUEST],
    ["admin", BOOKED_VIA.ADMIN],
    ["kiosk", BOOKED_VIA.UNKNOWN],
    [undefined, BOOKED_VIA.UNKNOWN],
  ])("reads a booking made via %s as %s", (bookedVia, way) => {
    expect(bookedViaOf({ bookedVia })).toBe(way);
  });
});

describe("filterBookingsByBookedVia", () => {
  const bookings = [
    { id: "a", bookedVia: "user" },
    { id: "b", bookedVia: "guest" },
    { id: "c" },
  ];

  it("keeps the bookings made one of the ways asked for", () => {
    expect(
      filterBookingsByBookedVia(bookings, [
        BOOKED_VIA.GUEST,
        BOOKED_VIA.UNKNOWN,
      ]).map((booking) => booking.id)
    ).toEqual(["b", "c"]);
  });
});
