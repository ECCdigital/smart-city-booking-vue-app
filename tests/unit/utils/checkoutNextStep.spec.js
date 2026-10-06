import { describe, expect, it } from "vitest";
import { continuesToProvider, payableBookings } from "@/utils/checkoutNextStep";

/**
 * Where the public checkout goes once the backend answered (spec E12): to
 * the payment only while a booking awaits one, to the status page for every
 * other state - a requested booking waits for the tenant there, a confirmed
 * one is done.
 */
describe("payableBookings", () => {
  it("picks the members of a series that await payment", () => {
    const members = [
      { id: "a", status: "requested" },
      { id: "b", status: "payment_due" },
      { id: "c", status: "confirmed" },
      { id: "d", status: "payment_due" },
    ];

    expect(payableBookings(members).map((b) => b.id)).toEqual(["b", "d"]);
  });

  it("answers an empty list without members", () => {
    expect(payableBookings(undefined)).toEqual([]);
  });
});

describe("continuesToProvider", () => {
  it("does while every paid booking awaits payment", () => {
    expect(
      continuesToProvider([
        { status: "payment_due", priceEur: 25 },
        { status: "payment_due", priceEur: 15 },
      ])
    ).toBe(true);
  });

  it("does not when a booking is only requested", () => {
    expect(
      continuesToProvider([
        { status: "payment_due", priceEur: 25 },
        { status: "requested", priceEur: 15 },
      ])
    ).toBe(false);
  });

  it("does not when nothing is left to pay", () => {
    expect(continuesToProvider([{ status: "confirmed", priceEur: 25 }])).toBe(
      false
    );
  });

  it("does not for a free amount", () => {
    expect(continuesToProvider([{ status: "payment_due", priceEur: 0 }])).toBe(
      false
    );
  });

  it("does not when the payment answered no booking", () => {
    expect(continuesToProvider([])).toBe(false);
    expect(continuesToProvider([undefined])).toBe(false);
  });
});
