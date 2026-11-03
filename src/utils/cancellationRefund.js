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

export const HOURS_PER_DAY = 24;

function formatDays(days) {
  return i18n.tc("booking.cancellationRefund.timeDays", days, { n: days });
}

function formatHours(hours) {
  return i18n.tc("booking.cancellationRefund.timeHours", hours, { n: hours });
}

/**
 * The deadline of a tier of the refund scale, stored in hours: in days where
 * it divides by 24, else in hours.
 *
 * @returns {{ amount: number, unit: "days"|"hours" }}
 */
export function tierDeadline(hoursBeforeStart) {
  const hours = Number(hoursBeforeStart);
  return hours % HOURS_PER_DAY === 0
    ? { amount: hours / HOURS_PER_DAY, unit: "days" }
    : { amount: hours, unit: "hours" };
}

/** The deadline of a tier as text, such as „2 Tage“ or „12 Stunden“. */
export function formatTierDeadline(hoursBeforeStart) {
  const { amount, unit } = tierDeadline(hoursBeforeStart);
  return unit === "days" ? formatDays(amount) : formatHours(amount);
}

/**
 * The time from the cancellation to the start of a refund calculation as
 * text: whole days of 24 hours from one day on, hours below. An audit of
 * before backend 4.4 counted calendar days (`daysBeforeStart`). `null`
 * without a time span.
 */
export function formatTimeBeforeStart(calculation) {
  const hours = calculation?.hoursBeforeStart;
  if (Number.isFinite(hours)) {
    return hours >= HOURS_PER_DAY
      ? formatDays(Math.floor(hours / HOURS_PER_DAY))
      : formatHours(hours);
  }
  const days = calculation?.daysBeforeStart;
  return Number.isFinite(days) ? formatDays(days) : null;
}

/**
 * The tier a refund calculation applied, as text: its deadline
 * (`formatTierDeadline`), „Bis zum Beginn“ for the lowest at 0 hours. An
 * audit of before backend 4.4 named it in days (`appliedTierDays`). `null`
 * where no tier applied - no scale, or no time span.
 */
export function formatAppliedTier(calculation) {
  const hours = calculation?.appliedTierHours;
  if (Number.isFinite(hours)) {
    return hours === 0
      ? i18n.t("booking.cancellationRefund.tierAtStart")
      : formatTierDeadline(hours);
  }
  const days = calculation?.appliedTierDays;
  return Number.isFinite(days) ? formatDays(days) : null;
}

/**
 * The policy line of a single booking's refund preview or audit: the time
 * before the start where there is one (`formatTimeBeforeStart`) and the tier
 * that applied (`formatAppliedTier`), else that the booking has no time
 * span. `key` is `singlePolicy` or `userPolicySummary`.
 */
export function refundPolicyText(key, { time, tier, ...values }) {
  if (time === null || time === undefined) {
    return i18n.t(`booking.cancellationRefund.${key}WithoutTimeSpan`, values);
  }
  return tier === null || tier === undefined
    ? i18n.t(`booking.cancellationRefund.${key}`, { time, ...values })
    : i18n.t(`booking.cancellationRefund.${key}WithTier`, {
        time,
        tier,
        ...values,
      });
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
