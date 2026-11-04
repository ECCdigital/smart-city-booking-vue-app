import { describe, expect, it } from "vitest";
import {
  bookingStartsInText,
  filterBookingsByRefundState,
  getCancellationRefundAudit,
  formatAppliedTierRule,
  formatTierDeadline,
  formatTierRule,
  formatTimeBeforeStart,
  formatTimeBeforeStartForBooker,
  refundPolicyText,
  refundStateMarker,
  tierDeadline,
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

describe("refundPolicyText", () => {
  it("names the time before the start in the customer's summary", () => {
    expect(
      refundPolicyText("userPolicySummary", { time: "3 Tage", percentage: 50 })
    ).toBe(
      "Sie stornieren 3 Tage vor Beginn der Buchung.\n\nDie Erstattung beträgt voraussichtlich 50 %."
    );
  });

  it("names the tier that applied, so the percentage can be read off it", () => {
    expect(
      refundPolicyText("userPolicySummary", {
        time: "1 Tag",
        tier: "bis 26 Stunden vor Beginn",
        percentage: 11,
      })
    ).toBe(
      "Sie stornieren 1 Tag vor Beginn der Buchung. Es gilt die Erstattungsstufe: bis 26 Stunden vor Beginn.\n\nDie Erstattung beträgt voraussichtlich 11 %."
    );
  });

  it("says the booking has no time span where there are no days", () => {
    expect(
      refundPolicyText("userPolicySummary", { time: null, percentage: 50 })
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

/**
 * A tier's deadline is stored in hours and reads in days where it divides by
 * 24; the time before the start of a calculation reads in whole days from one
 * day on, in hours below.
 */
describe("tierDeadline", () => {
  it("reads a deadline that divides by 24 as days, any other as hours", () => {
    expect(tierDeadline(48)).toEqual({ amount: 2, unit: "days" });
    expect(tierDeadline(0)).toEqual({ amount: 0, unit: "days" });
    expect(tierDeadline(12)).toEqual({ amount: 12, unit: "hours" });
    expect(tierDeadline(36)).toEqual({ amount: 36, unit: "hours" });
  });

  it("names the deadline with its unit", () => {
    expect(formatTierDeadline(24)).toBe("1 Tag");
    expect(formatTierDeadline(48)).toBe("2 Tage");
    expect(formatTierDeadline(12)).toBe("12 Stunden");
    expect(formatTierDeadline(1)).toBe("1 Stunde");
  });
});

describe("formatTimeBeforeStart", () => {
  it("names whole days from one day on and hours below", () => {
    expect(formatTimeBeforeStart({ hoursBeforeStart: 47 })).toBe("1 Tag");
    expect(formatTimeBeforeStart({ hoursBeforeStart: 48 })).toBe("2 Tage");
    expect(formatTimeBeforeStart({ hoursBeforeStart: 13 })).toBe("13 Stunden");
  });

  it("names the calendar days of an audit from before", () => {
    expect(formatTimeBeforeStart({ daysBeforeStart: 3 })).toBe("3 Tage");
  });

  it("answers null without a time span", () => {
    expect(formatTimeBeforeStart({ hoursBeforeStart: null })).toBeNull();
    expect(formatTimeBeforeStart(null)).toBeNull();
  });
});

describe("formatTierRule", () => {
  it("names a tier as „bis … vor Beginn“, the lowest at 0 hours as „bis zum Beginn“", () => {
    expect(formatTierRule(26)).toBe("bis 26 Stunden vor Beginn");
    expect(formatTierRule(48)).toBe("bis 2 Tage vor Beginn");
    expect(formatTierRule(0)).toBe("bis zum Beginn");
  });
});

describe("formatTimeBeforeStartForBooker", () => {
  it("names days and hours below three days", () => {
    const time = (hours) =>
      formatTimeBeforeStartForBooker({ hoursBeforeStart: hours });

    expect(time(30)).toBe("1 Tag und 6 Stunden");
    expect(time(49)).toBe("2 Tage und 1 Stunde");
    expect(time(48)).toBe("2 Tage");
    expect(time(71)).toBe("2 Tage und 23 Stunden");
  });

  it("names whole days from three days on and hours below one day", () => {
    const time = (hours) =>
      formatTimeBeforeStartForBooker({ hoursBeforeStart: hours });

    expect(time(72)).toBe("3 Tage");
    expect(time(95)).toBe("3 Tage");
    expect(time(13)).toBe("13 Stunden");
  });

  it("keeps the days of an audit from before and null without a time span", () => {
    expect(formatTimeBeforeStartForBooker({ daysBeforeStart: 2 })).toBe(
      "2 Tage"
    );
    expect(
      formatTimeBeforeStartForBooker({ hoursBeforeStart: null })
    ).toBeNull();
  });
});

describe("formatAppliedTierRule", () => {
  it("names the tier as the booker reads it", () => {
    expect(formatAppliedTierRule({ appliedTierHours: 36 })).toBe(
      "bis 36 Stunden vor Beginn"
    );
    expect(formatAppliedTierRule({ appliedTierHours: 48 })).toBe(
      "bis 2 Tage vor Beginn"
    );
    expect(formatAppliedTierRule({ appliedTierHours: 0 })).toBe(
      "bis zum Beginn"
    );
    expect(formatAppliedTierRule({ appliedTierDays: 3 })).toBe(
      "bis 3 Tage vor Beginn"
    );
    expect(formatAppliedTierRule({ appliedTierHours: null })).toBeNull();
  });
});

describe("bookingStartsInText", () => {
  const startsIn = (hours) => bookingStartsInText({ hoursBeforeStart: hours });

  it("names days and hours below three days", () => {
    expect(startsIn(30)).toBe("Die Buchung beginnt in 1 Tag und 6 Stunden.");
    expect(startsIn(49)).toBe("Die Buchung beginnt in 2 Tagen und 1 Stunde.");
    expect(startsIn(48)).toBe("Die Buchung beginnt in 2 Tagen.");
  });

  it("names whole days from three days on and hours below one day", () => {
    expect(startsIn(72)).toBe("Die Buchung beginnt in 3 Tagen.");
    expect(startsIn(95)).toBe("Die Buchung beginnt in 3 Tagen.");
    expect(startsIn(13)).toBe("Die Buchung beginnt in 13 Stunden.");
  });

  it("says nothing without a time span or under an hour", () => {
    expect(startsIn(null)).toBeNull();
    expect(startsIn(0)).toBeNull();
    expect(startsIn(-5)).toBeNull();
  });
});
