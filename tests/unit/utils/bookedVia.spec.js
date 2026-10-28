import { describe, expect, it } from "vitest";
import {
  BOOKED_VIA,
  bookedViaLabel,
  bookedViaOf,
  bookedViaTitle,
  filterBookingsByBookedVia,
  ownerMovedTo,
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

/**
 * A booking of the Buchungsweg Admin belongs to its first mail: when the
 * admin corrects that address, the backend moves the booking to it.
 */
describe("ownerMovedTo", () => {
  const original = {
    bookedVia: "admin",
    mail: "max@exmaple.test",
    assignedUserId: "max@exmaple.test",
  };

  it("names the corrected first address of a booking made by an admin", () => {
    expect(
      ownerMovedTo(original, {
        ...original,
        mail: " Max@Example.test, erika@example.test",
      })
    ).toBe("max@example.test");
  });

  it.each([
    ["the first address is unchanged", "max@exmaple.test, erika@example.test"],
    ["only the case differs", "MAX@exmaple.test"],
    ["the mail is empty", ""],
  ])("names nobody when %s", (_, mail) => {
    expect(ownerMovedTo(original, { ...original, mail })).toBeNull();
  });

  it.each([["user"], ["guest"], [undefined]])(
    "names nobody for a booking made via %s",
    (bookedVia) => {
      const booking = { ...original, bookedVia };
      expect(
        ownerMovedTo(booking, { ...booking, mail: "max@example.test" })
      ).toBeNull();
    }
  );
});
