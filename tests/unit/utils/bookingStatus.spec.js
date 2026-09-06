import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUS,
  MIXED,
  actionLabel,
  allowedActions,
  allowsAction,
  freeMarker,
  groupAllowsAction,
  groupBookingStatus,
  isFree,
  isAwaitingPayment,
  isPaid,
  isRejectedOrCancelled,
  paymentLabel,
  statusColor,
  statusExportValue,
  statusIcon,
  statusLabel,
  statusRank,
} from "@/utils/bookingStatus";

/**
 * The state module reads `booking.status` - the one stored value of the 4.3.x
 * lifecycle - and nothing else. Rewritten from the flag characterisation
 * (`bookingPaymentStatus.spec.js`) when the booking strand moved the UI off
 * `isCommitted` / `isPayed` / `isRejected`. The expected words are the
 * glossary's (spec §2), not the module's.
 */
describe("presentation of a booking status", () => {
  it.each([
    [BOOKING_STATUS.REQUESTED, "Angefragt", "orange", "mdi-clock-outline"],
    [BOOKING_STATUS.PAYMENT_DUE, "Zahlung offen", "blue", "mdi-cash-clock"],
    [BOOKING_STATUS.CONFIRMED, "Bestätigt", "success", "mdi-check-circle"],
    [BOOKING_STATUS.REJECTED, "Abgelehnt", "error", "mdi-cancel"],
    [BOOKING_STATUS.CANCELLED, "Storniert", "error", "mdi-close-circle"],
  ])("%s reads as %s", (status, label, color, icon) => {
    expect(statusLabel(status)).toBe(label);
    expect(statusColor(status)).toBe(color);
    expect(statusIcon(status)).toBe(icon);
  });

  it("names a group whose members disagree as Gemischt", () => {
    expect(statusLabel(MIXED)).toBe("Gemischt");
    expect(statusColor(MIXED)).toBe("grey");
  });

  it("shows the raw value of a status it does not know, in grey", () => {
    expect(statusLabel("archived")).toBe("archived");
    expect(statusColor("archived")).toBe("grey");
    expect(statusLabel(undefined)).toBe("");
  });
});

/**
 * The transitions of `booking-state.js` as the admin may trigger them, plus
 * the hard delete, which the backend allows only where nothing has been
 * confirmed yet. There is no "take back the confirmation" and no "take back
 * the payment" (spec E2).
 */
describe("allowedActions", () => {
  it.each([
    [BOOKING_STATUS.REQUESTED, ["confirm", "cancel", "delete"]],
    [BOOKING_STATUS.PAYMENT_DUE, ["pay", "cancel"]],
    [BOOKING_STATUS.CONFIRMED, ["cancel"]],
    [BOOKING_STATUS.REJECTED, ["reinstate", "delete"]],
    [BOOKING_STATUS.CANCELLED, ["reinstate"]],
  ])("at %s allows %j", (status, actions) => {
    expect(allowedActions(status)).toEqual(actions);
  });

  it("allows nothing for a mixed group or an unknown status", () => {
    expect(allowedActions(MIXED)).toEqual([]);
    expect(allowedActions(undefined)).toEqual([]);
  });

  it("answers for a booking through allowsAction", () => {
    expect(allowsAction({ status: "requested" }, "confirm")).toBe(true);
    expect(allowsAction({ status: "confirmed" }, "confirm")).toBe(false);
    expect(allowsAction({ status: "confirmed" }, "delete")).toBe(false);
    expect(allowsAction(undefined, "delete")).toBe(false);
  });
});

describe("actionLabel", () => {
  it("names the verbs of the glossary", () => {
    expect(actionLabel("confirm")).toBe("Freigeben");
    expect(actionLabel("pay")).toBe("Als bezahlt markieren");
    expect(actionLabel("reinstate")).toBe("Wiederherstellen");
    expect(actionLabel("delete")).toBe("Löschen");
  });

  it("calls a cancel from requested Ablehnen and from anywhere else Stornieren", () => {
    expect(actionLabel("cancel", BOOKING_STATUS.REQUESTED)).toBe("Ablehnen");
    expect(actionLabel("cancel", BOOKING_STATUS.PAYMENT_DUE)).toBe(
      "Stornieren"
    );
    expect(actionLabel("cancel", BOOKING_STATUS.CONFIRMED)).toBe("Stornieren");
    expect(actionLabel("cancel")).toBe("Stornieren");
  });
});

describe("statusRank", () => {
  it("orders the states requested < payment_due < confirmed < cancelled < rejected", () => {
    const shuffled = [
      "rejected",
      "confirmed",
      "requested",
      "cancelled",
      "payment_due",
    ];
    expect([...shuffled].sort((a, b) => statusRank(a) - statusRank(b))).toEqual(
      ["requested", "payment_due", "confirmed", "cancelled", "rejected"]
    );
  });

  it("sorts an unknown status after the known ones", () => {
    expect(statusRank("archived")).toBeGreaterThan(statusRank("rejected"));
    expect(statusRank(undefined)).toBeGreaterThan(statusRank("rejected"));
  });
});

describe("statusExportValue", () => {
  it("is the German label, and empty where there is no status", () => {
    expect(statusExportValue({ status: "payment_due" })).toBe("Zahlung offen");
    expect(statusExportValue({})).toBe("");
  });
});

/**
 * "Kostenfrei" is a marker derived from the price, not a state: a free
 * booking still runs through requested and confirmed.
 */
describe("isFree", () => {
  it("is true for a zero or negative price, in string or number form", () => {
    expect(isFree({ priceEur: 0 })).toBe(true);
    expect(isFree({ priceEur: "0" })).toBe(true);
    expect(isFree({ priceEur: -5 })).toBe(true);
  });

  it("is false for a positive, missing or unparsable price", () => {
    expect(isFree({ priceEur: 0.01 })).toBe(false);
    expect(isFree({ priceEur: "12.50" })).toBe(false);
    expect(isFree({})).toBe(false);
    expect(isFree({ priceEur: null })).toBe(false);
    expect(isFree(undefined)).toBe(false);
    expect(isFree({ priceEur: "free of charge" })).toBe(false);
  });

  it("carries one marker for the chip beside the status", () => {
    expect(freeMarker()).toEqual({
      label: "Kostenfrei",
      color: "grey lighten-1",
      textColor: "grey darken-3",
      icon: "mdi-gift",
    });
  });
});

/**
 * "Paid" is read off the state (spec E6): `confirmed` says so, and a
 * `cancelled` booking was paid iff it was cancelled out of `confirmed`.
 */
describe("isPaid", () => {
  it.each([
    ["requested", {}, false],
    ["payment_due", {}, false],
    ["confirmed", {}, true],
    ["rejected", {}, false],
    ["cancelled", { cancellationRefund: { cancelledFrom: "confirmed" } }, true],
    [
      "cancelled",
      { cancellationRefund: { cancelledFrom: "payment_due" } },
      false,
    ],
    ["cancelled", {}, false],
  ])("at %s with %j is %s", (status, extra, paid) => {
    expect(isPaid({ status, priceEur: 10, ...extra })).toBe(paid);
  });

  it("does not read a flag", () => {
    expect(isPaid({ status: "payment_due", priceEur: 10, isPayed: true })).toBe(
      false
    );
  });
});

describe("paymentLabel", () => {
  it("answers Kostenfrei for a free booking whatever its state", () => {
    expect(paymentLabel({ status: "requested", priceEur: 0 })).toBe(
      "Kostenfrei"
    );
    expect(paymentLabel({ status: "rejected", priceEur: 0 })).toBe(
      "Kostenfrei"
    );
  });

  it.each([
    ["requested", {}, "Nein"],
    ["payment_due", {}, "Nein"],
    ["confirmed", {}, "Ja"],
    ["rejected", {}, "Nein"],
    ["cancelled", { cancellationRefund: { cancelledFrom: "confirmed" } }, "Ja"],
    [
      "cancelled",
      { cancellationRefund: { cancelledFrom: "payment_due" } },
      "Nein",
    ],
  ])("answers Ja/Nein for a priced booking at %s", (status, extra, label) => {
    expect(paymentLabel({ status, priceEur: 25, ...extra })).toBe(label);
  });
});

describe("isRejectedOrCancelled", () => {
  it("is true for the two ended states only", () => {
    expect(isRejectedOrCancelled({ status: "rejected" })).toBe(true);
    expect(isRejectedOrCancelled({ status: "cancelled" })).toBe(true);
    expect(isRejectedOrCancelled({ status: "requested" })).toBe(false);
    expect(isRejectedOrCancelled({ status: "confirmed" })).toBe(false);
    expect(isRejectedOrCancelled(undefined)).toBe(false);
  });
});

/** A group has one state when its members agree, and is "mixed" otherwise (E9). */
describe("isAwaitingPayment", () => {
  it("is true at payment_due only", () => {
    expect(isAwaitingPayment({ status: "payment_due" })).toBe(true);
    expect(isAwaitingPayment({ status: "requested" })).toBe(false);
    expect(isAwaitingPayment({ status: "confirmed" })).toBe(false);
    expect(isAwaitingPayment({ status: "cancelled" })).toBe(false);
    expect(isAwaitingPayment(undefined)).toBe(false);
  });
});

describe("groupBookingStatus", () => {
  it("is the shared status of the members", () => {
    expect(
      groupBookingStatus([{ status: "confirmed" }, { status: "confirmed" }])
    ).toBe("confirmed");
  });

  it("is mixed as soon as one member differs", () => {
    expect(
      groupBookingStatus([
        { status: "confirmed" },
        { status: "cancelled" },
        { status: "confirmed" },
      ])
    ).toBe(MIXED);
  });

  it("is null for no members", () => {
    expect(groupBookingStatus([])).toBeNull();
    expect(groupBookingStatus(undefined)).toBeNull();
  });
});

/**
 * A series-wide action is offered only where the members share one state and
 * that state allows the action (spec E9); a mixed series acts per member.
 */
describe("groupAllowsAction", () => {
  it("allows the action every member's shared state allows", () => {
    const requested = [{ status: "requested" }, { status: "requested" }];
    expect(groupAllowsAction(requested, "confirm")).toBe(true);
    expect(groupAllowsAction(requested, "cancel")).toBe(true);
  });

  it("refuses the action the shared state does not allow", () => {
    const requested = [{ status: "requested" }, { status: "requested" }];
    expect(groupAllowsAction(requested, "pay")).toBe(false);
  });

  it("refuses everything for a mixed series", () => {
    const mixed = [{ status: "requested" }, { status: "confirmed" }];
    expect(groupAllowsAction(mixed, "confirm")).toBe(false);
    expect(groupAllowsAction(mixed, "cancel")).toBe(false);
  });

  it("refuses everything without members", () => {
    expect(groupAllowsAction([], "confirm")).toBe(false);
    expect(groupAllowsAction(undefined, "confirm")).toBe(false);
  });
});
