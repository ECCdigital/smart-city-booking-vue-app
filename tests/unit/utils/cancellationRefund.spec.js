import { describe, expect, it } from "vitest";
import {
  filterBookingsByRefundState,
  getCancellationRefundAudit,
  refundStateMarker,
  refundStateOf,
} from "@/utils/cancellationRefund";

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

function cancelled(id, refundState) {
  return {
    id,
    status: "cancelled",
    cancellationRefund: { cancelledFrom: "confirmed", refundState },
  };
}

/**
 * The refund state (glossary „Erstattungsstand“) as the backend writes it at
 * the refund audit: `open` or `completed`, absent where no refund is due.
 */
describe("refundStateOf", () => {
  it("reads open and completed off the refund audit", () => {
    expect(refundStateOf(cancelled("bk-1", "open"))).toBe("open");
    expect(refundStateOf(cancelled("bk-1", "completed"))).toBe("completed");
  });

  it("answers null without a refund state, and for a value it does not know", () => {
    expect(refundStateOf(cancelled("bk-1", undefined))).toBeNull();
    expect(refundStateOf(cancelled("bk-1", "paid"))).toBeNull();
    expect(refundStateOf({ status: "cancelled" })).toBeNull();
    expect(refundStateOf(undefined)).toBeNull();
  });
});

describe("filterBookingsByRefundState", () => {
  const bookings = [
    cancelled("bk-open", "open"),
    cancelled("bk-completed", "completed"),
    cancelled("bk-none", undefined),
    { id: "bk-confirmed", status: "confirmed" },
  ];

  it("keeps only the bookings whose refund state is selected", () => {
    expect(
      filterBookingsByRefundState(bookings, ["open"]).map((b) => b.id)
    ).toEqual(["bk-open"]);
    expect(
      filterBookingsByRefundState(bookings, ["open", "completed"]).map(
        (b) => b.id
      )
    ).toEqual(["bk-open", "bk-completed"]);
  });
});

describe("refundStateMarker", () => {
  it("words the chip beside the state", () => {
    expect(refundStateMarker("open").label).toBe("Rückerstattung offen");
    expect(refundStateMarker("completed").label).toBe("Rückerstattung erfolgt");
  });

  it("has no chip without a refund state", () => {
    expect(refundStateMarker(null)).toBeNull();
  });
});
