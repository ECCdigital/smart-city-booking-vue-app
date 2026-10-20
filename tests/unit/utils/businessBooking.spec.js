import { describe, expect, it } from "vitest";
import { bookingKindLabel, isBusinessBooking } from "@/utils/businessBooking";

describe("isBusinessBooking", () => {
  it("takes the stored answer over the company", () => {
    expect(isBusinessBooking({ isBusiness: true, company: "" })).toBe(true);
    expect(isBusinessBooking({ isBusiness: false, company: "ACME" })).toBe(
      false
    );
  });

  it("reads a booking without the answer off the company, blanks as none", () => {
    expect(isBusinessBooking({ company: "ACME" })).toBe(true);
    expect(isBusinessBooking({ company: "  " })).toBe(false);
    expect(isBusinessBooking(undefined)).toBe(false);
  });

  it("names it Privat or Geschäftlich", () => {
    expect(bookingKindLabel({ company: "" })).toBe("Privat");
    expect(bookingKindLabel({ isBusiness: true })).toBe("Geschäftlich");
  });
});
