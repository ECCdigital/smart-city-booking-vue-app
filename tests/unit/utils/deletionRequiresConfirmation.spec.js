import { describe, expect, it } from "vitest";
import { deletionRequiresConfirmation } from "@/utils/bookingStatus";

/**
 * The rule of the backend's `requiresConfirmation`: a confirmed booking,
 * and a paid one with a price, also once cancelled or withdrawn, are
 * deleted only with `?confirmed=true`.
 */
describe("deletionRequiresConfirmation", () => {
  it("holds for a confirmed booking, whatever its price", () => {
    expect(
      deletionRequiresConfirmation({ status: "confirmed", priceEur: 0 })
    ).toBe(true);
    expect(
      deletionRequiresConfirmation({ status: "confirmed", priceEur: 25 })
    ).toBe(true);
  });

  it.each(["cancelled", "withdrawn"])(
    "holds for a %s booking paid before",
    (status) => {
      expect(
        deletionRequiresConfirmation({
          status,
          priceEur: 25,
          cancellationRefund: { cancelledFrom: "confirmed" },
        })
      ).toBe(true);
    }
  );

  it.each([
    ["requested", {}],
    ["payment_due", {}],
    ["rejected", {}],
    ["cancelled", { cancellationRefund: { cancelledFrom: "payment_due" } }],
    ["withdrawn", { cancellationRefund: { cancelledFrom: "requested" } }],
  ])("does not hold for an unpaid %s booking", (status, extra) => {
    expect(
      deletionRequiresConfirmation({ status, priceEur: 25, ...extra })
    ).toBe(false);
  });

  it("does not hold for a free booking cancelled after its confirmation", () => {
    expect(
      deletionRequiresConfirmation({
        status: "cancelled",
        priceEur: 0,
        cancellationRefund: { cancelledFrom: "confirmed" },
      })
    ).toBe(false);
  });
});
