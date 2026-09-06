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
 * The verb for an action. A cancel is "Ablehnen" while the booking is only
 * requested and "Stornieren" once it has been confirmed - the one place the
 * wording depends on the state.
 */
export function actionLabel(action, status) {
  if (action === BOOKING_ACTION.CANCEL) {
    return status === BOOKING_STATUS.REQUESTED
      ? i18n.t("booking.action.reject")
      : i18n.t("booking.action.cancel");
  }
  return i18n.t(`booking.action.${action}`);
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
