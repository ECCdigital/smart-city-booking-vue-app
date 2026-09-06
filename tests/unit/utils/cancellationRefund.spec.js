import { describe, expect, it } from "vitest";
import { getCancellationRefundAudit } from "@/utils/cancellationRefund";

const audit = { cancelledFrom: "confirmed", refundPercentage: 50 };

/**
 * The refund audit is only shown on a booking that has ended - read off
 * `status`, never off `isRejected`.
 */
describe("getCancellationRefundAudit", () => {
  it("hands out the audit of a cancelled or rejected booking", () => {
    expect(
      getCancellationRefundAudit({
        status: "cancelled",
        cancellationRefund: audit,
      })
    ).toBe(audit);
    expect(
      getCancellationRefundAudit({
        status: "rejected",
        cancellationRefund: audit,
      })
    ).toBe(audit);
  });

  it("answers null while the booking is still running, whatever the flag says", () => {
    expect(
      getCancellationRefundAudit({
        status: "confirmed",
        isRejected: true,
        cancellationRefund: audit,
      })
    ).toBeNull();
    expect(getCancellationRefundAudit(undefined)).toBeNull();
  });

  it("falls back to the newest cancellation attachment", () => {
    const older = {
      type: "cancellation",
      timeCreated: 1,
      cancellation: { n: 1 },
    };
    const newer = {
      type: "cancellation",
      timeCreated: 2,
      cancellation: { n: 2 },
    };

    expect(
      getCancellationRefundAudit({
        status: "cancelled",
        attachments: [older, { type: "receipt" }, newer],
      })
    ).toEqual({ n: 2 });
    expect(getCancellationRefundAudit({ status: "cancelled" })).toBeNull();
  });
});
