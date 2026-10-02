import { describe, expect, it } from "vitest";
import { amountUnit, bookingAmountLimit } from "@/utils/bookingAmountLimit";

/**
 * The Höchstmenge je Buchung and the capacity („Verfügbare Anzahl“) both
 * limit one self-booking; the stricter decides. Neither is a limit while it
 * is empty, zero or missing.
 */
describe("bookingAmountLimit", () => {
  it("takes the Höchstmenge je Buchung when it is below the capacity", () => {
    expect(bookingAmountLimit({ amount: 10, maxAmountPerBooking: 3 })).toEqual({
      max: 3,
      perBooking: true,
    });
  });

  it("takes the capacity when it is below the Höchstmenge je Buchung", () => {
    expect(bookingAmountLimit({ amount: 2, maxAmountPerBooking: 5 })).toEqual({
      max: 2,
      perBooking: false,
    });
  });

  it("names the Höchstmenge je Buchung when both are the same", () => {
    expect(bookingAmountLimit({ amount: 4, maxAmountPerBooking: 4 })).toEqual({
      max: 4,
      perBooking: true,
    });
  });

  it("takes the Höchstmenge je Buchung of an unlimited capacity", () => {
    expect(bookingAmountLimit({ amount: 0, maxAmountPerBooking: 3 })).toEqual({
      max: 3,
      perBooking: true,
    });
    expect(
      bookingAmountLimit({ amount: null, maxAmountPerBooking: 3 })
    ).toEqual({ max: 3, perBooking: true });
  });

  it("takes the capacity while the Höchstmenge je Buchung is unlimited", () => {
    expect(
      bookingAmountLimit({ amount: 6, maxAmountPerBooking: null })
    ).toEqual({ max: 6, perBooking: false });
    expect(bookingAmountLimit({ amount: "6" })).toEqual({
      max: 6,
      perBooking: false,
    });
  });

  it("sets no limit when neither limits", () => {
    expect(
      bookingAmountLimit({ amount: 0, maxAmountPerBooking: null })
    ).toEqual({ max: null, perBooking: false });
    expect(bookingAmountLimit({})).toEqual({ max: null, perBooking: false });
    expect(bookingAmountLimit(null)).toEqual({ max: null, perBooking: false });
  });
});

describe("amountUnit", () => {
  it("books square meters in m²", () => {
    expect(amountUnit({ priceType: "per-square-meter" })).toBe("m²");
  });

  it("books every other price type in Stück", () => {
    expect(amountUnit({ priceType: "per-hour" })).toBe("Stück");
    expect(amountUnit({ priceType: "per-item" })).toBe("Stück");
    expect(amountUnit(undefined)).toBe("Stück");
  });
});
