import i18n from "@/language/index";

/**
 * The booking state as the UI reads it: `booking.status`, the one stored
 * value of the 4.3.x lifecycle. The three flags (`isCommitted`, `isPayed`,
 * `isRejected`) are derivations the backend still delivers; nothing in here
 * reads them, and nothing in here should ever (spec E4, glossary in
 * `docs/agents/booking-status-vocabulary.md`).
 *
 * Labels are resolved through the app's i18n instance, the way
 * `checkoutErrors.js` and `utilities/access-points.js` do it, so callers get
 * the German word straight back and templates need no second lookup.
 */
export const BOOKING_STATUS = Object.freeze({
  REQUESTED: "requested",
  PAYMENT_DUE: "payment_due",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

/** What `groupBookingStatus()` answers when the members disagree. */
export const MIXED = "mixed";

/**
 * The keys of a booking that are state, not content: the stored value and
 * the three derivations the backend delivers with it. The write path drops
 * them before a PUT (spec E1.1) - a save never carries a state.
 */
export const STATE_KEYS = Object.freeze([
  "status",
  "isCommitted",
  "isPayed",
  "isRejected",
]);

const PRESENTATION = {
  [BOOKING_STATUS.REQUESTED]: { color: "orange", icon: "mdi-clock-outline" },
  [BOOKING_STATUS.PAYMENT_DUE]: { color: "blue", icon: "mdi-cash-clock" },
  [BOOKING_STATUS.CONFIRMED]: { color: "success", icon: "mdi-check-circle" },
  [BOOKING_STATUS.REJECTED]: { color: "error", icon: "mdi-cancel" },
  [BOOKING_STATUS.CANCELLED]: { color: "error", icon: "mdi-close-circle" },
  [MIXED]: { color: "grey", icon: "mdi-help-circle-outline" },
};

export function statusLabel(status) {
  if (status == null) return "";
  const key = `booking.status.${status}`;
  return i18n.te(key) ? i18n.t(key) : String(status);
}

export function statusColor(status) {
  return PRESENTATION[status]?.color || "grey";
}

export function statusIcon(status) {
  return PRESENTATION[status]?.icon || "mdi-help-circle-outline";
}

/** The admin's transitions (spec E2), plus the hard delete. */
export const BOOKING_ACTION = Object.freeze({
  CONFIRM: "confirm",
  PAY: "pay",
  CANCEL: "cancel",
  REINSTATE: "reinstate",
  DELETE: "delete",
});

const ACTIONS_BY_STATUS = {
  [BOOKING_STATUS.REQUESTED]: [
    BOOKING_ACTION.CONFIRM,
    BOOKING_ACTION.CANCEL,
    BOOKING_ACTION.DELETE,
  ],
  [BOOKING_STATUS.PAYMENT_DUE]: [BOOKING_ACTION.PAY, BOOKING_ACTION.CANCEL],
  [BOOKING_STATUS.CONFIRMED]: [BOOKING_ACTION.CANCEL],
  [BOOKING_STATUS.REJECTED]: [BOOKING_ACTION.REINSTATE, BOOKING_ACTION.DELETE],
  [BOOKING_STATUS.CANCELLED]: [BOOKING_ACTION.REINSTATE],
};

/** The actions a booking in `status` offers; `[]` for mixed or unknown. */
export function allowedActions(status) {
  return ACTIONS_BY_STATUS[status] || [];
}

export function allowsAction(booking, action) {
  return allowedActions(booking?.status).includes(action);
}

/**
 * The verb for an action under a key prefix. A cancel is "Ablehnen" while
 * the booking is only requested and "Stornieren" once it has been
 * confirmed - the one place the wording depends on the state.
 */
function verbOf(prefix, action, status) {
  if (action === BOOKING_ACTION.CANCEL) {
    return status === BOOKING_STATUS.REQUESTED
      ? i18n.t(`${prefix}.reject`)
      : i18n.t(`${prefix}.cancel`);
  }
  return i18n.t(`${prefix}.${action}`);
}

/** The verb for an action on one booking: Freigeben, Als bezahlt markieren, Ablehnen / Stornieren, Wiederherstellen. */
export function actionLabel(action, status) {
  return verbOf("booking.action", action, status);
}

/**
 * The verb of a series-wide action, worded with "Serie" (spec N5): "Serie
 * freigeben", "Serie als bezahlt markieren", "Serie ablehnen" / "Serie
 * stornieren". The members' menus keep `actionLabel`.
 */
export function seriesActionLabel(action, status) {
  return verbOf("group-booking.action", action, status);
}

/**
 * The transitions a host's menu offers (spec E2): the actions the state
 * allows except the hard delete, which is not a transition and keeps its own
 * entry.
 */
export function transitionActions(status) {
  return allowedActions(status).filter(
    (action) => action !== BOOKING_ACTION.DELETE
  );
}

const ACTION_PRESENTATION = {
  [BOOKING_ACTION.CONFIRM]: {
    icon: "mdi-checkbox-marked-circle",
    color: "success",
  },
  [BOOKING_ACTION.PAY]: { icon: "mdi-cash-check", color: "success" },
  [BOOKING_ACTION.CANCEL]: { icon: "mdi-close-circle", color: "orange" },
  [BOOKING_ACTION.REINSTATE]: { icon: "mdi-restore", color: "warning" },
};

export function actionIcon(action) {
  return ACTION_PRESENTATION[action]?.icon || "mdi-help-circle-outline";
}

export function actionColor(action) {
  return ACTION_PRESENTATION[action]?.color || "grey";
}

/** The order of the "Status" column: requested < payment_due < confirmed < cancelled < rejected. */
const RANK = [
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.PAYMENT_DUE,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
];

export function statusRank(status) {
  const rank = RANK.indexOf(status);
  return rank === -1 ? RANK.length : rank;
}

/**
 * The list's status filter (spec E11): the bookings whose state is among
 * `statuses`, in their order. An empty selection keeps nothing.
 */
export function filterBookingsByStatus(bookings, statuses) {
  return bookings.filter((booking) => statuses.includes(booking?.status));
}

/** The "Status" column of the Excel export (spec E6). */
export function statusExportValue(booking) {
  return statusLabel(booking?.status);
}

/** "Kostenfrei" is derived from the price - a marker beside the state, not a state. */
export function isFree(booking) {
  if (booking?.priceEur == null) {
    return false;
  }
  return Number(booking.priceEur) <= 0;
}

export function freeMarker() {
  return {
    label: i18n.t("booking.status.free"),
    color: "grey lighten-1",
    textColor: "grey darken-3",
    icon: "mdi-gift",
  };
}

/**
 * Whether the booking has been paid, read off the state: `confirmed` says so;
 * a `cancelled` booking was paid iff it was cancelled out of `confirmed`.
 */
export function isPaid(booking) {
  if (booking?.status === BOOKING_STATUS.CONFIRMED) {
    return true;
  }
  if (booking?.status === BOOKING_STATUS.CANCELLED) {
    return (
      booking.cancellationRefund?.cancelledFrom === BOOKING_STATUS.CONFIRMED
    );
  }
  return false;
}

/** The "Bezahlt" column of the Excel export: Kostenfrei / Ja / Nein (spec E6). */
export function paymentLabel(booking) {
  if (isFree(booking)) {
    return i18n.t("booking.status.free");
  }
  return isPaid(booking)
    ? i18n.t("booking.payment.paid")
    : i18n.t("booking.payment.unpaid");
}

export function isRejectedOrCancelled(booking) {
  return (
    booking?.status === BOOKING_STATUS.REJECTED ||
    booking?.status === BOOKING_STATUS.CANCELLED
  );
}

/** The one state with something left to pay - the checkout's cue to collect it. */
export function isAwaitingPayment(booking) {
  return booking?.status === BOOKING_STATUS.PAYMENT_DUE;
}

/**
 * The state of a group: the members' shared status, `MIXED` where they
 * disagree, `null` without members (spec E9).
 */
export function groupBookingStatus(members) {
  if (!Array.isArray(members) || members.length === 0) {
    return null;
  }
  const [first, ...rest] = members.map((member) => member?.status);
  return rest.every((status) => status === first) ? first : MIXED;
}

/**
 * Whether a series-wide action may be offered: only where the members share
 * one state and that state allows the action (spec E9). A mixed series acts
 * per member; `allowedActions(MIXED)` is empty, so it falls out of this too.
 */
export function groupAllowsAction(members, action) {
  return allowedActions(groupBookingStatus(members)).includes(action);
}

/**
 * The target a host hands `BookingTransitions.start()`: `{ booking }` for a
 * single booking, `{ booking, groupBooking, bookings }` for a member of a
 * series whose members are at hand (`groupBooking.bookings`, populated by
 * the page). Without the members the module could not tell the series'
 * shared state, so the member is acted on alone (spec E3, E9).
 */
export function transitionTarget(booking, groupBooking) {
  const members = Array.isArray(groupBooking?.bookings)
    ? groupBooking.bookings.filter(Boolean)
    : [];
  if (members.length === 0) {
    return { booking };
  }
  return { booking, groupBooking, bookings: members };
}

/** The state of one step of the main path, as the headline draws it (spec N2). */
export const STEP_STATE = Object.freeze({
  DONE: "done",
  CURRENT: "current",
  UPCOMING: "upcoming",
  VOID: "void",
});

const PRIMARY_ACTIONS = [
  BOOKING_ACTION.CONFIRM,
  BOOKING_ACTION.PAY,
  BOOKING_ACTION.REINSTATE,
];

function presentation(status) {
  return {
    status,
    label: statusLabel(status),
    color: statusColor(status),
    icon: statusIcon(status),
  };
}

function mainPathOf(free) {
  return [
    BOOKING_STATUS.REQUESTED,
    ...(free ? [] : [BOOKING_STATUS.PAYMENT_DUE]),
    BOOKING_STATUS.CONFIRMED,
  ];
}

/** The step a cancelled booking was cut behind: `cancelledFrom`, or Bestätigt where that is unknown. */
function cancelledOriginOf(booking) {
  return booking?.cancellationRefund?.cancelledFrom || BOOKING_STATUS.CONFIRMED;
}

/**
 * The path itself, shared by a booking and a series: the main path with a
 * `STEP_STATE` per step, cut behind Angefragt at Abgelehnt and behind
 * `cancelledFrom` at Storniert. `dateOf(step)` and `end` carry the raw
 * dates and the reason.
 */
function buildPath({ status, free, cancelledFrom, dateOf, end }) {
  const mainPath = mainPathOf(free);
  const terminal =
    status === BOOKING_STATUS.REJECTED || status === BOOKING_STATUS.CANCELLED;

  let reachedFrom = status;
  if (status === BOOKING_STATUS.REJECTED) {
    reachedFrom = BOOKING_STATUS.REQUESTED;
  } else if (status === BOOKING_STATUS.CANCELLED) {
    reachedFrom = cancelledFrom;
  }
  const reachedIndex = Math.max(0, mainPath.indexOf(reachedFrom));

  const steps = mainPath.map((step, index) => {
    let state;
    if (index < reachedIndex) {
      state = STEP_STATE.DONE;
    } else if (index === reachedIndex) {
      state = terminal ? STEP_STATE.DONE : STEP_STATE.CURRENT;
    } else {
      state = terminal ? STEP_STATE.VOID : STEP_STATE.UPCOMING;
    }
    return {
      ...presentation(step),
      state,
      free: free && step === BOOKING_STATUS.CONFIRMED,
      date: dateOf(step),
    };
  });

  const cut = terminal
    ? { ...presentation(status), afterIndex: reachedIndex, ...end }
    : null;

  return {
    free,
    terminal,
    reachedIndex,
    steps,
    end: cut,
    current: cut || steps[reachedIndex],
  };
}

/**
 * The booking's state read as a path (spec N2): the main path Angefragt ->
 * Zahlung offen -> Bestätigt (without Zahlung offen for a free booking), each
 * step with a `STEP_STATE`, and for Abgelehnt / Storniert the point where the
 * path was cut - behind Angefragt, or behind `cancelledFrom` (behind Bestätigt
 * where that is unknown). Dates are raw: `timeCreated` at Angefragt,
 * `timePaid` at Bestätigt only while the booking is Bestätigt and priced
 * (glossary), `cancelledAt` at the end; a missing or zero timestamp is
 * `null`. The headline formats them.
 */
export function pathOf(booking) {
  const free = isFree(booking);
  return buildPath({
    status: booking?.status,
    free,
    cancelledFrom: cancelledOriginOf(booking),
    dateOf: (step) => stepDate(step, booking, free),
    end: {
      date: booking?.cancellationRefund?.cancelledAt || null,
      reason: booking?.rejectionReason || null,
    },
  });
}

function stepDate(step, booking, free) {
  if (step === BOOKING_STATUS.REQUESTED) {
    return booking?.timeCreated || null;
  }
  if (
    step === BOOKING_STATUS.CONFIRMED &&
    booking?.status === BOOKING_STATUS.CONFIRMED &&
    !free
  ) {
    return booking.timePaid || null;
  }
  return null;
}

/** The price of a series: its members' prices summed; a missing or unparsable one counts nothing. */
export function totalPriceOf(members) {
  return (Array.isArray(members) ? members : []).reduce(
    (sum, member) => sum + (Number(member?.priceEur) || 0),
    0
  );
}

/**
 * The series read as a booking (spec N5): the path from the total price
 * (free where it is zero) at the members' shared state; `null` for a mixed
 * series or one without members, which the headline draws without a path.
 * Abgelehnt cuts behind Angefragt, Storniert behind the step every member
 * reached - the lowest of their `cancelledFrom`s, a missing one read as
 * Bestätigt. The only date is the series' own request; there is no paid and
 * no cancellation date. The reason stands only where every member gives the
 * same one - the rule after "Serie stornieren".
 */
export function seriesPathOf(groupBooking, members) {
  const status = groupBookingStatus(members);
  if (status == null || status === MIXED) {
    return null;
  }
  const free = totalPriceOf(members) <= 0;
  const mainPath = mainPathOf(free);

  return buildPath({
    status,
    free,
    cancelledFrom: members
      .map(cancelledOriginOf)
      .reduce((lowest, from) =>
        mainPath.indexOf(from) < mainPath.indexOf(lowest) ? from : lowest
      ),
    dateOf: (step) =>
      step === BOOKING_STATUS.REQUESTED
        ? groupBooking?.timeCreated || null
        : null,
    end: { date: null, reason: sharedReason(members) },
  });
}

function sharedReason(members) {
  const [first, ...rest] = members.map(
    (member) => member?.rejectionReason || null
  );
  return first && rest.every((reason) => reason === first) ? first : null;
}

/**
 * A mixed series counted per state (spec N5), in the vocabulary's order and
 * only the states with members: `{ status, label, color, icon, count }`.
 */
export function mixedCounts(members) {
  const list = Array.isArray(members) ? members : [];
  return Object.values(BOOKING_STATUS)
    .map((status) => ({
      ...presentation(status),
      count: list.filter((member) => member?.status === status).length,
    }))
    .filter((entry) => entry.count > 0);
}

/**
 * The one action that moves along the path (Freigeben, Als bezahlt
 * markieren, Wiederherstellen), and the side ways (Ablehnen / Stornieren,
 * the delete) in their order (spec N2).
 */
export function splitActions(actions) {
  const primary =
    actions.find((action) => PRIMARY_ACTIONS.includes(action)) || null;
  return {
    primary,
    secondary: actions.filter((action) => action !== primary),
  };
}
