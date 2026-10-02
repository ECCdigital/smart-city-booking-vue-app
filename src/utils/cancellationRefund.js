import i18n from "@/language/index";
import { isRejectedOrCancelled } from "@/utils/bookingStatus";

/**
 * The refund state of a cancelled booking (glossary „Erstattungsstand“):
 * whether the refund has been paid out. The backend writes `open` at the
 * cancellation where a refund is due - cancelled out of Bestätigt with a
 * refund above zero - and drops it with a reinstatement; the administration
 * sets `completed` by hand. A marker beside Storniert, never a state.
 */
export const REFUND_STATE = Object.freeze({
  OPEN: "open",
  COMPLETED: "completed",
});

const REFUND_STATE_MARKERS = {
  [REFUND_STATE.OPEN]: {
    color: "warning",
    textColor: "white",
    icon: "mdi-cash-refund",
  },
  [REFUND_STATE.COMPLETED]: {
    color: "grey lighten-1",
    textColor: "grey darken-3",
    icon: "mdi-cash-check",
  },
};

/**
 * The booking's refund state, or `null` where none is due - and where the
 * reader's reach is *own*, since the backend leaves it out for them.
 */
export function refundStateOf(booking) {
  const state = booking?.cancellationRefund?.refundState;
  return Object.values(REFUND_STATE).includes(state) ? state : null;
}

/** The list's refund filter: the bookings whose refund state is among `states`. */
export function filterBookingsByRefundState(bookings, states) {
  return bookings.filter((booking) => states.includes(refundStateOf(booking)));
}

/** The chip of a refund state beside the booking's state, as `freeMarker()`; `null` for none. */
export function refundStateMarker(state) {
  if (!REFUND_STATE_MARKERS[state]) return null;
  return {
    label: i18n.t(`booking.refundState.marker.${state}`),
    ...REFUND_STATE_MARKERS[state],
  };
}

export function getCancellationRefundAudit(booking) {
  if (!isRejectedOrCancelled(booking)) {
    return null;
  }

  if (booking.cancellationRefund) {
    return booking.cancellationRefund;
  }

  const attachments = Array.isArray(booking.attachments)
    ? booking.attachments
    : [];
  const cancellationAttachments = attachments
    .filter((item) => item.type === "cancellation" && item.cancellation)
    .sort(
      (left, right) => Number(right.timeCreated || 0) - Number(left.timeCreated || 0)
    );

  return cancellationAttachments[0]?.cancellation || null;
}
