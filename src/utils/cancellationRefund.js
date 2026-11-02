import i18n from "@/language/index";
import FormatService from "@/services/FormatService";
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

/**
 * The policy line of a single booking's refund preview or audit: the calendar
 * days before the start where there are any, else that the booking has no
 * time span. `key` is `singlePolicy`, `auditOverride` or `userPolicySummary`.
 */
export function refundPolicyText(key, { days, ...values }) {
  return days === null || days === undefined
    ? i18n.t(`booking.cancellationRefund.${key}WithoutTimeSpan`, values)
    : i18n.t(`booking.cancellationRefund.${key}`, { days, ...values });
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
      (left, right) =>
        Number(right.timeCreated || 0) - Number(left.timeCreated || 0)
    );

  return cancellationAttachments[0]?.cancellation || null;
}

function refundAtPercentage(originalAmountEur, percentage) {
  const originalCents = Math.round(Number(originalAmountEur || 0) * 100);
  return Math.round((originalCents * Number(percentage)) / 100) / 100;
}

/**
 * The refund a cancellation will pay out, as its preview names it - one
 * booking or the members of a series summed - or at the admin's override
 * `refundPercentage`; `null` while no preview is at hand.
 */
export function expectedRefundEur(preview, refundPercentage) {
  if (!preview) return null;
  const bookings = Array.isArray(preview.bookings) ? preview.bookings : null;
  const refundOf = (booking) =>
    refundPercentage === undefined
      ? Number(booking.refundAmountEur || 0)
      : refundAtPercentage(booking.originalAmountEur, refundPercentage);
  if (!bookings) return refundOf(preview);
  const cents = bookings.reduce(
    (sum, booking) => sum + Math.round(refundOf(booking) * 100),
    0
  );
  return cents / 100;
}

/**
 * The payment hint of the reject dialogs: whether the customer has paid, and
 * what the cancellation leaves them - money back, a fee still to pay, or
 * nothing more, all settled. Mirrors the cancellation document: a paid
 * booking gets the refund back, an unpaid one owes the fee only. A rejected
 * request costs nothing: what was paid comes back in full, without a
 * preview to weigh. `refundAmountEur` is `null` while no
 * preview is at hand.
 *
 * @returns {{ type: string, status: string, text: string }} The alert's type, its bold line and the line under it
 */
export function rejectPaymentOutcome({
  request,
  free,
  paid,
  priceEur,
  refundAmountEur,
}) {
  const t = (key, values) =>
    i18n.t(`booking.reject.dialog.payment.${key}`, values);
  const currency = (value) => FormatService.currency(Number(value || 0));

  if (free) {
    return { type: "success", status: t("free"), text: t("settled") };
  }

  if (request) {
    return paid
      ? {
          type: "warning",
          status: t("request.paid"),
          text: t("request.refund", { amount: currency(priceEur) }),
        }
      : { type: "success", status: t("unpaid"), text: t("request.settled") };
  }

  if (paid) {
    const status = t("paid", { amount: currency(priceEur) });
    if (refundAmountEur === null) return { type: "info", status, text: "" };
    return refundAmountEur > 0
      ? {
          type: "warning",
          status,
          text: t("refund", { amount: currency(refundAmountEur) }),
        }
      : { type: "success", status, text: t("noRefund") };
  }

  const status = t("unpaid");
  if (refundAmountEur === null) return { type: "info", status, text: "" };
  const fee = Math.round((Number(priceEur || 0) - refundAmountEur) * 100) / 100;
  return fee > 0
    ? { type: "warning", status, text: t("feeDue", { amount: currency(fee) }) }
    : { type: "success", status, text: t("settled") };
}
