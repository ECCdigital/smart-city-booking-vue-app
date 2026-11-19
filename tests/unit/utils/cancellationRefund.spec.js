import { describe, expect, it } from "vitest";
import {
  filterBookingsByRefundState,
  getCancellationRefundAudit,
  refundAtPercentage,
  refundPolicyText,
  refundStateMarker,
  refundStateOf,
  rejectPaymentOutcome,
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

describe("refundPolicyText", () => {
  it("names the calendar days before the start in the customer's summary", () => {
    expect(
      refundPolicyText("userPolicySummary", { days: 3, percentage: 50 })
    ).toBe("Bei 3 Kalendertagen bis zum Beginn beträgt die Erstattung 50 %.");
  });

  it("says the booking has no time span where there are no days", () => {
    expect(
      refundPolicyText("userPolicySummary", { days: null, percentage: 50 })
    ).toBe(
      "Die Buchung hat keinen festen Zeitraum. Die Erstattung beträgt 50 %."
    );
    expect(
      refundPolicyText("userPolicySummary", { days: undefined, percentage: 0 })
    ).toBe(
      "Die Buchung hat keinen festen Zeitraum. Die Erstattung beträgt 0 %."
    );
  });
});

/** The one cent rounding of a refund at a percentage, as preview and payment hint share it. */
describe("refundAtPercentage", () => {
  it("rounds the refund to the cent", () => {
    expect(refundAtPercentage(33.33, 50)).toBe(16.67);
  });
});

/**
 * A preview that failed to load leaves the amount unknown, while the
 * cancellation still follows the tenant's tiers: the hint says so.
 */
describe("rejectPaymentOutcome without a preview", () => {
  it("warns of an unknown refund on a paid booking once the preview failed", () => {
    expect(
      rejectPaymentOutcome({
        paid: true,
        priceEur: 40,
        refundAmountEur: null,
        previewFailed: true,
      })
    ).toEqual({
      type: "warning",
      status: "Bereits bezahlt: 40,00\u00a0€",
      text: "Betrag unbekannt: Die Erstattung konnte nicht berechnet werden. Der Buchende bekommt trotzdem zurück, was die Staffel des Mandanten vorsieht.",
    });
  });

  it("warns of an unknown fee on an unpaid booking once the preview failed", () => {
    expect(
      rejectPaymentOutcome({
        paid: false,
        priceEur: 40,
        refundAmountEur: null,
        previewFailed: true,
      })
    ).toEqual({
      type: "warning",
      status: "Noch nicht bezahlt",
      text: "Betrag unbekannt: Der Einbehalt konnte nicht berechnet werden. Er fällt trotzdem nach der Staffel des Mandanten an.",
    });
  });

  it("names no amount while the preview is still loading", () => {
    expect(
      rejectPaymentOutcome({
        paid: true,
        priceEur: 40,
        refundAmountEur: null,
        previewFailed: false,
      })
    ).toEqual({
      type: "info",
      status: "Bereits bezahlt: 40,00\u00a0€",
      text: "",
    });
  });

  it("leaves a rejected request free of charge, without any tiers", () => {
    expect(
      rejectPaymentOutcome({
        request: true,
        paid: true,
        priceEur: 40,
        refundAmountEur: null,
        previewFailed: true,
      })
    ).toEqual({
      type: "warning",
      status: "Buchung bereits bezahlt",
      text: "Die abgelehnte Buchungsanfrage ist für den Buchenden kostenfrei. Der vollständige Betrag von 40,00\u00a0€ wird zurückerstattet.",
    });
    expect(
      rejectPaymentOutcome({
        request: true,
        paid: false,
        priceEur: 40,
        refundAmountEur: null,
        previewFailed: true,
      })
    ).toEqual({
      type: "success",
      status: "Noch nicht bezahlt",
      text: "Die abgelehnte Buchungsanfrage ist für den Buchenden kostenfrei. Es steht somit keine Zahlung mehr aus.",
    });
  });
});
