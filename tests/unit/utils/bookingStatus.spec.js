import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUS,
  MIXED,
  STATE_KEYS,
  STEP_STATE,
  actionLabel,
  allowedActions,
  allowsAction,
  filterBookingsByStatus,
  freeMarker,
  groupAllowsAction,
  transitionTarget,
  groupBookingStatus,
  isFree,
  isAwaitingPayment,
  isPaid,
  isRejectedOrCancelled,
  mixedCounts,
  pathOf,
  paymentLabel,
  seriesActionLabel,
  seriesPathOf,
  splitActions,
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

/** The list's status filter (spec E11): a booking stays iff its state is selected. */
describe("filterBookingsByStatus", () => {
  const bookings = [
    { id: "b-requested", status: "requested" },
    { id: "b-payment-due", status: "payment_due" },
    { id: "b-confirmed", status: "confirmed" },
    { id: "b-rejected", status: "rejected" },
    { id: "b-cancelled", status: "cancelled" },
  ];

  it("keeps the bookings whose state is selected, in their order", () => {
    expect(
      filterBookingsByStatus(bookings, ["cancelled", "requested"]).map(
        (booking) => booking.id
      )
    ).toEqual(["b-requested", "b-cancelled"]);
  });

  it("keeps every booking while all five states are selected", () => {
    expect(
      filterBookingsByStatus(bookings, Object.values(BOOKING_STATUS))
    ).toEqual(bookings);
  });

  it("keeps nothing for an empty selection", () => {
    expect(filterBookingsByStatus(bookings, [])).toEqual([]);
  });

  it("drops a booking without a state", () => {
    expect(filterBookingsByStatus([{ id: "b-none" }], ["requested"])).toEqual(
      []
    );
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

/** What a save must never carry (spec E1.1): the stored state and its three derivations. */
describe("STATE_KEYS", () => {
  it("names the stored value and the three flags", () => {
    expect([...STATE_KEYS]).toEqual([
      "status",
      "isCommitted",
      "isPayed",
      "isRejected",
    ]);
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

/**
 * The target a host hands `BookingTransitions.start()`: a member with its
 * series and members where the members are at hand, the booking alone
 * otherwise (spec E3, E9).
 */
describe("transitionTarget", () => {
  const booking = { id: "bk-1", status: "requested" };

  it("hands a single booking alone", () => {
    expect(transitionTarget(booking, null)).toEqual({ booking });
    expect(transitionTarget(booking, undefined)).toEqual({ booking });
  });

  it("hands a series member with its series and members", () => {
    const other = { id: "bk-2", status: "requested" };
    const groupBooking = { id: "grp-1", bookings: [booking, other] };

    expect(transitionTarget(booking, groupBooking)).toEqual({
      booking,
      groupBooking,
      bookings: [booking, other],
    });
  });

  it("acts on the member alone where the series' members are not at hand", () => {
    expect(
      transitionTarget(booking, { id: "grp-1", bookingIds: ["bk-1", "bk-2"] })
    ).toEqual({ booking });
    expect(transitionTarget(booking, { id: "grp-1", bookings: [] })).toEqual({
      booking,
    });
  });

  it("drops a member the list has not loaded", () => {
    const groupBooking = { id: "grp-1", bookings: [booking, undefined] };

    expect(transitionTarget(booking, groupBooking).bookings).toEqual([booking]);
  });
});

/**
 * The path view (spec N2): the main path Angefragt -> (Zahlung offen) ->
 * Bestätigt, each step with a state, and for Abgelehnt / Storniert the
 * point where the path was cut. The headline draws the segments from it.
 */
describe("pathOf", () => {
  const CREATED = 1_700_000_000_000;
  const PAID = 1_700_100_000_000;
  const CANCELLED_AT = 1_700_200_000_000;

  function priced(overrides = {}) {
    return { priceEur: 25, timeCreated: CREATED, ...overrides };
  }

  function free(overrides = {}) {
    return { priceEur: 0, timeCreated: CREATED, ...overrides };
  }

  function cancelled(from, overrides = {}) {
    return {
      status: BOOKING_STATUS.CANCELLED,
      cancellationRefund: { cancelledFrom: from, cancelledAt: CANCELLED_AT },
      ...overrides,
    };
  }

  function stepStates(path) {
    return path.steps.map((step) => step.state);
  }

  it("walks Angefragt · Zahlung offen · Bestätigt for a priced booking", () => {
    const path = pathOf(priced({ status: BOOKING_STATUS.REQUESTED }));
    expect(path.steps.map((step) => step.status)).toEqual([
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.PAYMENT_DUE,
      BOOKING_STATUS.CONFIRMED,
    ]);
    expect(path.free).toBe(false);
    expect(path.steps.map((step) => step.label)).toEqual([
      "Angefragt",
      "Zahlung offen",
      "Bestätigt",
    ]);
  });

  it("skips Zahlung offen for a free booking and marks Bestätigt as Kostenfrei", () => {
    const path = pathOf(free({ status: BOOKING_STATUS.REQUESTED }));
    expect(path.steps.map((step) => step.status)).toEqual([
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.CONFIRMED,
    ]);
    expect(path.free).toBe(true);
    expect(path.steps.map((step) => step.free)).toEqual([false, true]);
    expect(
      pathOf(priced({ status: BOOKING_STATUS.CONFIRMED })).steps.map(
        (step) => step.free
      )
    ).toEqual([false, false, false]);
  });

  describe("on the path", () => {
    it.each([
      [BOOKING_STATUS.REQUESTED, ["current", "upcoming", "upcoming"], 0],
      [BOOKING_STATUS.PAYMENT_DUE, ["done", "current", "upcoming"], 1],
      [BOOKING_STATUS.CONFIRMED, ["done", "done", "current"], 2],
    ])("a priced booking at %s", (status, states, reachedIndex) => {
      const path = pathOf(priced({ status }));
      expect(stepStates(path)).toEqual(states);
      expect(path.reachedIndex).toBe(reachedIndex);
      expect(path.terminal).toBe(false);
      expect(path.end).toBeNull();
      expect(path.current).toBe(path.steps[reachedIndex]);
      expect(path.current.status).toBe(status);
    });

    it.each([
      [BOOKING_STATUS.REQUESTED, ["current", "upcoming"], 0],
      [BOOKING_STATUS.CONFIRMED, ["done", "current"], 1],
    ])("a free booking at %s", (status, states, reachedIndex) => {
      const path = pathOf(free({ status }));
      expect(stepStates(path)).toEqual(states);
      expect(path.reachedIndex).toBe(reachedIndex);
      expect(path.end).toBeNull();
      expect(path.current.status).toBe(status);
    });
  });

  describe("cut off the path", () => {
    it("cuts Abgelehnt behind Angefragt", () => {
      const path = pathOf(
        priced({ status: BOOKING_STATUS.REJECTED, rejectionReason: "Zu spät" })
      );
      expect(stepStates(path)).toEqual(["done", "void", "void"]);
      expect(path.terminal).toBe(true);
      expect(path.reachedIndex).toBe(0);
      expect(path.end).toMatchObject({
        status: BOOKING_STATUS.REJECTED,
        label: "Abgelehnt",
        color: "error",
        afterIndex: 0,
        reason: "Zu spät",
      });
      expect(path.current).toBe(path.end);
    });

    it("cuts Storniert behind the step it was cancelled from", () => {
      const fromPaymentDue = pathOf(
        priced(cancelled(BOOKING_STATUS.PAYMENT_DUE))
      );
      expect(stepStates(fromPaymentDue)).toEqual(["done", "done", "void"]);
      expect(fromPaymentDue.end.afterIndex).toBe(1);

      const fromConfirmed = pathOf(priced(cancelled(BOOKING_STATUS.CONFIRMED)));
      expect(stepStates(fromConfirmed)).toEqual(["done", "done", "done"]);
      expect(fromConfirmed.end.afterIndex).toBe(2);
      expect(fromConfirmed.end.label).toBe("Storniert");
    });

    it("cuts Storniert behind Bestätigt where the origin is unknown", () => {
      const path = pathOf(
        priced({ status: BOOKING_STATUS.CANCELLED, cancellationRefund: null })
      );
      expect(stepStates(path)).toEqual(["done", "done", "done"]);
      expect(path.end.afterIndex).toBe(2);
      expect(path.end.date).toBeNull();
      expect(path.end.reason).toBeNull();
    });

    it("cuts a free booking's path the same way, without Zahlung offen", () => {
      expect(
        stepStates(pathOf(free({ status: BOOKING_STATUS.REJECTED })))
      ).toEqual(["done", "void"]);
      expect(
        stepStates(pathOf(free(cancelled(BOOKING_STATUS.CONFIRMED))))
      ).toEqual(["done", "done"]);
    });
  });

  describe("the dates", () => {
    it("carries the request date at Angefragt, raw", () => {
      const path = pathOf(priced({ status: BOOKING_STATUS.PAYMENT_DUE }));
      expect(path.steps[0].date).toBe(CREATED);
      expect(path.steps[1].date).toBeNull();
      expect(path.steps[2].date).toBeNull();
    });

    it("carries the paid date at Bestätigt only while the booking is Bestätigt and priced", () => {
      const paid = pathOf(
        priced({ status: BOOKING_STATUS.CONFIRMED, timePaid: PAID })
      );
      expect(paid.steps[2].date).toBe(PAID);

      const freePaid = pathOf(
        free({ status: BOOKING_STATUS.CONFIRMED, timePaid: PAID })
      );
      expect(freePaid.steps[1].date).toBeNull();

      const cancelledPaid = pathOf(
        priced(cancelled(BOOKING_STATUS.CONFIRMED, { timePaid: PAID }))
      );
      expect(cancelledPaid.steps[2].date).toBeNull();

      const notYet = pathOf(
        priced({ status: BOOKING_STATUS.PAYMENT_DUE, timePaid: PAID })
      );
      expect(notYet.steps[2].date).toBeNull();
    });

    it("reads a zero timestamp, as the backend delivers it, as no date", () => {
      const path = pathOf(
        priced({
          status: BOOKING_STATUS.CONFIRMED,
          timeCreated: 0,
          timePaid: 0,
        })
      );
      expect(path.steps[0].date).toBeNull();
      expect(path.steps[2].date).toBeNull();
      expect(
        pathOf(
          priced(
            cancelled(BOOKING_STATUS.CONFIRMED, {
              cancellationRefund: {
                cancelledFrom: BOOKING_STATUS.CONFIRMED,
                cancelledAt: 0,
              },
            })
          )
        ).end.date
      ).toBeNull();
    });

    it("carries the cancellation date at the end", () => {
      const path = pathOf(priced(cancelled(BOOKING_STATUS.PAYMENT_DUE)));
      expect(path.end.date).toBe(CANCELLED_AT);
    });
  });

  it("copes with no booking at all", () => {
    const path = pathOf(null);
    expect(path.steps.map((step) => step.status)).toEqual([
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.PAYMENT_DUE,
      BOOKING_STATUS.CONFIRMED,
    ]);
    expect(path.reachedIndex).toBe(0);
    expect(path.end).toBeNull();
  });

  it("names the four step states", () => {
    expect(STEP_STATE).toEqual({
      DONE: "done",
      CURRENT: "current",
      UPCOMING: "upcoming",
      VOID: "void",
    });
  });
});

/**
 * The headline shows one action along the path as a button and the side
 * ways in a menu (spec N2, N3).
 */
describe("splitActions", () => {
  it("takes Freigeben, Als bezahlt markieren or Wiederherstellen as the primary action", () => {
    expect(splitActions(["confirm", "cancel"])).toEqual({
      primary: "confirm",
      secondary: ["cancel"],
    });
    expect(splitActions(["pay", "cancel"])).toEqual({
      primary: "pay",
      secondary: ["cancel"],
    });
    expect(splitActions(["reinstate"])).toEqual({
      primary: "reinstate",
      secondary: [],
    });
  });

  it("leaves a lone Stornieren as a side way without a primary action", () => {
    expect(splitActions(["cancel"])).toEqual({
      primary: null,
      secondary: ["cancel"],
    });
    expect(splitActions([])).toEqual({ primary: null, secondary: [] });
  });

  it("keeps the side ways in their order", () => {
    expect(splitActions(["cancel", "reinstate", "delete"])).toEqual({
      primary: "reinstate",
      secondary: ["cancel", "delete"],
    });
  });
});

/**
 * The series read as a booking (spec N5): its path from the total price and
 * the members' shared state, cut where every member got to, dated by the
 * series' own request only, with the reason where the members agree on one.
 */
describe("seriesPathOf", () => {
  const CREATED = 1_700_000_000_000;

  function member(status, overrides = {}) {
    return {
      priceEur: 25,
      timeCreated: 1_600_000_000_000,
      timePaid: 1_600_100_000_000,
      status,
      ...overrides,
    };
  }

  function cancelledMember(from, overrides = {}) {
    return member(BOOKING_STATUS.CANCELLED, {
      cancellationRefund: {
        cancelledFrom: from,
        cancelledAt: 1_600_200_000_000,
      },
      ...overrides,
    });
  }

  function series(members, overrides = {}) {
    return {
      id: "grp-1",
      timeCreated: CREATED,
      ...overrides,
      bookings: members,
    };
  }

  function pathOfSeries(members, overrides = {}) {
    return seriesPathOf(series(members, overrides), members);
  }

  function stepStates(path) {
    return path.steps.map((step) => step.state);
  }

  it("walks Angefragt · Zahlung offen · Bestätigt for a series with a total price", () => {
    const path = pathOfSeries([
      member(BOOKING_STATUS.REQUESTED),
      member(BOOKING_STATUS.REQUESTED),
    ]);
    expect(path.free).toBe(false);
    expect(path.steps.map((step) => step.label)).toEqual([
      "Angefragt",
      "Zahlung offen",
      "Bestätigt",
    ]);
    expect(stepStates(path)).toEqual(["current", "upcoming", "upcoming"]);
  });

  it("is free where the total price is zero, whatever the members' shares", () => {
    const free = pathOfSeries([
      member(BOOKING_STATUS.REQUESTED, { priceEur: 0 }),
      member(BOOKING_STATUS.REQUESTED, { priceEur: "0" }),
    ]);
    expect(free.free).toBe(true);
    expect(free.steps.map((step) => step.status)).toEqual([
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.CONFIRMED,
    ]);
    expect(free.steps.map((step) => step.free)).toEqual([false, true]);

    const priced = pathOfSeries([
      member(BOOKING_STATUS.REQUESTED, { priceEur: 0 }),
      member(BOOKING_STATUS.REQUESTED, { priceEur: 25 }),
    ]);
    expect(priced.free).toBe(false);
  });

  it.each([
    [BOOKING_STATUS.REQUESTED, ["current", "upcoming", "upcoming"]],
    [BOOKING_STATUS.PAYMENT_DUE, ["done", "current", "upcoming"]],
    [BOOKING_STATUS.CONFIRMED, ["done", "done", "current"]],
  ])("stands at the members' shared state %s", (status, states) => {
    const path = pathOfSeries([member(status), member(status)]);
    expect(stepStates(path)).toEqual(states);
    expect(path.end).toBeNull();
    expect(path.current.status).toBe(status);
  });

  it("is null for a mixed series and for one without members", () => {
    expect(
      pathOfSeries([
        member(BOOKING_STATUS.REQUESTED),
        member(BOOKING_STATUS.CONFIRMED),
      ])
    ).toBeNull();
    expect(pathOfSeries([])).toBeNull();
    expect(seriesPathOf(series([]), null)).toBeNull();
  });

  it("cuts Abgelehnt behind Angefragt", () => {
    const path = pathOfSeries([
      member(BOOKING_STATUS.REJECTED),
      member(BOOKING_STATUS.REJECTED),
    ]);
    expect(stepStates(path)).toEqual(["done", "void", "void"]);
    expect(path.end).toMatchObject({
      status: BOOKING_STATUS.REJECTED,
      label: "Abgelehnt",
      afterIndex: 0,
    });
    expect(path.current).toBe(path.end);
  });

  it("cuts Storniert behind the step every member reached", () => {
    const shared = pathOfSeries([
      cancelledMember(BOOKING_STATUS.CONFIRMED),
      cancelledMember(BOOKING_STATUS.CONFIRMED),
    ]);
    expect(stepStates(shared)).toEqual(["done", "done", "done"]);
    expect(shared.end.afterIndex).toBe(2);

    const oneStillOpen = pathOfSeries([
      cancelledMember(BOOKING_STATUS.PAYMENT_DUE),
      cancelledMember(BOOKING_STATUS.CONFIRMED),
    ]);
    expect(stepStates(oneStillOpen)).toEqual(["done", "done", "void"]);
    expect(oneStillOpen.end.afterIndex).toBe(1);

    const oneOnlyRequested = pathOfSeries([
      cancelledMember(BOOKING_STATUS.REQUESTED),
      cancelledMember(BOOKING_STATUS.CONFIRMED),
    ]);
    expect(stepStates(oneOnlyRequested)).toEqual(["done", "void", "void"]);
    expect(oneOnlyRequested.end.afterIndex).toBe(0);
  });

  it("reads a member without an origin as cancelled out of Bestätigt", () => {
    const path = pathOfSeries([
      member(BOOKING_STATUS.CANCELLED, { cancellationRefund: null }),
      cancelledMember(BOOKING_STATUS.CONFIRMED),
    ]);
    expect(path.end.afterIndex).toBe(2);
  });

  it("cuts a free series' path the same way, without Zahlung offen", () => {
    const path = pathOfSeries([
      cancelledMember(BOOKING_STATUS.CONFIRMED, { priceEur: 0 }),
      cancelledMember(BOOKING_STATUS.REQUESTED, { priceEur: 0 }),
    ]);
    expect(stepStates(path)).toEqual(["done", "void"]);
    expect(path.end.afterIndex).toBe(0);
  });

  it("dates the series' request only - no paid date, no cancellation date", () => {
    const confirmed = pathOfSeries([
      member(BOOKING_STATUS.CONFIRMED),
      member(BOOKING_STATUS.CONFIRMED),
    ]);
    expect(confirmed.steps.map((step) => step.date)).toEqual([
      CREATED,
      null,
      null,
    ]);

    const cancelled = pathOfSeries([
      cancelledMember(BOOKING_STATUS.CONFIRMED),
      cancelledMember(BOOKING_STATUS.CONFIRMED),
    ]);
    expect(cancelled.steps[0].date).toBe(CREATED);
    expect(cancelled.end.date).toBeNull();

    expect(
      pathOfSeries([member(BOOKING_STATUS.REQUESTED)], { timeCreated: 0 })
        .steps[0].date
    ).toBeNull();
  });

  it("carries the reason only where every member gives the same one", () => {
    const agreed = pathOfSeries([
      member(BOOKING_STATUS.REJECTED, { rejectionReason: "Zu spät" }),
      member(BOOKING_STATUS.REJECTED, { rejectionReason: "Zu spät" }),
    ]);
    expect(agreed.end.reason).toBe("Zu spät");

    const differing = pathOfSeries([
      cancelledMember(BOOKING_STATUS.CONFIRMED, { rejectionReason: "Krank" }),
      cancelledMember(BOOKING_STATUS.CONFIRMED, { rejectionReason: "Umzug" }),
    ]);
    expect(differing.end.reason).toBeNull();

    const oneWithout = pathOfSeries([
      member(BOOKING_STATUS.REJECTED, { rejectionReason: "Zu spät" }),
      member(BOOKING_STATUS.REJECTED),
    ]);
    expect(oneWithout.end.reason).toBeNull();

    const none = pathOfSeries([
      member(BOOKING_STATUS.REJECTED),
      member(BOOKING_STATUS.REJECTED),
    ]);
    expect(none.end.reason).toBeNull();
  });
});

/**
 * A mixed series is counted per state instead of drawn as a path (spec N5).
 */
describe("mixedCounts", () => {
  function members(...statuses) {
    return statuses.map((status) => ({ status }));
  }

  it("counts the members per state in the vocabulary's order, states without members left out", () => {
    const counts = mixedCounts(
      members(
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.REQUESTED,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.REQUESTED,
        BOOKING_STATUS.CONFIRMED
      )
    );
    expect(counts.map((entry) => [entry.status, entry.count])).toEqual([
      [BOOKING_STATUS.REQUESTED, 2],
      [BOOKING_STATUS.CONFIRMED, 3],
      [BOOKING_STATUS.CANCELLED, 1],
    ]);
  });

  it("names each count with the state's word and colour", () => {
    const [requested, paymentDue] = mixedCounts(
      members(BOOKING_STATUS.PAYMENT_DUE, BOOKING_STATUS.REQUESTED)
    );
    expect(requested).toMatchObject({ label: "Angefragt", color: "orange" });
    expect(paymentDue).toMatchObject({
      label: "Zahlung offen",
      color: "blue",
      count: 1,
    });
  });

  it("is empty without members", () => {
    expect(mixedCounts([])).toEqual([]);
    expect(mixedCounts(null)).toEqual([]);
  });
});

/**
 * A series-wide action is worded with "Serie" (spec N5); the members' menus
 * keep the plain verbs of `actionLabel`.
 */
describe("seriesActionLabel", () => {
  it("names the series verbs", () => {
    expect(seriesActionLabel("confirm", BOOKING_STATUS.REQUESTED)).toBe(
      "Serie freigeben"
    );
    expect(seriesActionLabel("pay", BOOKING_STATUS.PAYMENT_DUE)).toBe(
      "Serie als bezahlt markieren"
    );
  });

  it("calls a cancel from requested Serie ablehnen and from anywhere else Serie stornieren", () => {
    expect(seriesActionLabel("cancel", BOOKING_STATUS.REQUESTED)).toBe(
      "Serie ablehnen"
    );
    expect(seriesActionLabel("cancel", BOOKING_STATUS.PAYMENT_DUE)).toBe(
      "Serie stornieren"
    );
    expect(seriesActionLabel("cancel", BOOKING_STATUS.CONFIRMED)).toBe(
      "Serie stornieren"
    );
  });
});
