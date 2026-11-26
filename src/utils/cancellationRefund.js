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

export const HOURS_PER_DAY = 24;

function formatDays(days) {
  return i18n.tc("booking.cancellationRefund.timeDays", days, { n: days });
}

/** Days in the dative, „1 Tag“, „2 Tagen“, as after „in“ or „unter“. */
function formatDaysDative(days) {
  return i18n.tc("booking.cancellationRefund.inDays", days, { n: days });
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
 * The booking had begun when the calculation was made: the backend counts
 * the time before the start negative then.
 */
export function hasBegun(calculation) {
  const hours = calculation?.hoursBeforeStart;
  if (Number.isFinite(hours)) return hours < 0;
  return calculation?.daysBeforeStart < 0;
}

/**
 * The time from the cancellation to the start of a refund calculation as
 * text: whole days of 24 hours from one day on, hours below. An audit of
 * before backend 4.4 counted calendar days (`daysBeforeStart`). `null`
 * without a time span and, as in the backend, once the booking has begun.
 */
export function formatTimeBeforeStart(calculation) {
  if (hasBegun(calculation)) return null;
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
 * The time before the start as the booker reads it on the pages to request
 * and confirm a cancellation: below three days in days and hours („1 Tag und
 * 6 Stunden“), from three days on in whole days, below one day in hours.
 */
export function formatTimeBeforeStartForBooker(calculation) {
  const hours = calculation?.hoursBeforeStart;
  if (
    !Number.isFinite(hours) ||
    hours < HOURS_PER_DAY ||
    hours >= 3 * HOURS_PER_DAY
  ) {
    return formatTimeBeforeStart(calculation);
  }
  const days = formatDays(Math.floor(hours / HOURS_PER_DAY));
  const rest = hours % HOURS_PER_DAY;
  return rest === 0
    ? days
    : i18n.t("booking.cancellationRefund.timeDaysAndHours", {
        days,
        hours: formatHours(rest),
      });
}

/**
 * The sentence that says when the booking begins, seen from the
 * calculation: below three days in days and hours („Die Buchung beginnt in
 * 1 Tag und 6 Stunden.“), from three days on in whole days. `null` without
 * a time span and once less than an hour is left.
 */
export function bookingStartsInText(calculation) {
  const hours = calculation?.hoursBeforeStart;
  if (!Number.isFinite(hours) || hours < 1) return null;
  const days = Math.floor(hours / HOURS_PER_DAY);
  const rest = hours % HOURS_PER_DAY;
  const daysText = i18n.tc("booking.cancellationRefund.inDays", days, {
    n: days,
  });
  let time = daysText;
  if (hours < HOURS_PER_DAY) {
    time = formatHours(hours);
  } else if (hours < 3 * HOURS_PER_DAY && rest > 0) {
    time = i18n.t("booking.cancellationRefund.timeDaysAndHours", {
      days: daysText,
      hours: formatHours(rest),
    });
  }
  return i18n.t("booking.cancellationRefund.startsIn", { time });
}

/**
 * A tier of the refund scale as everyone reads it, „bis 36 Stunden vor
 * Beginn“ or „bis 2 Tage vor Beginn“, „bis zum Beginn“ for the lowest at 0
 * hours.
 */
export function formatTierRule(hoursBeforeStart) {
  return Number(hoursBeforeStart) === 0
    ? i18n.t("booking.cancellationRefund.tierRuleAtStart")
    : i18n.t("booking.cancellationRefund.tierRule", {
        deadline: formatTierDeadline(hoursBeforeStart),
      });
}

/**
 * The tier a refund calculation applied as the booker reads it, worded as
 * the backend words it (`describeAppliedTier`) in mail and PDF: „bis 36
 * Stunden vor Beginn“ or „bis zum Beginn“; below the lowest deadline, where
 * that tier still applies, „unter 12 Stunden vor Beginn“ or „nach Beginn“.
 * `null` where no tier applied.
 */
export function formatAppliedTierRule(calculation) {
  const tierHours = calculation?.appliedTierHours;
  const tierDays = calculation?.appliedTierDays;
  let deadline;
  let atStart;
  let below;
  if (Number.isFinite(tierHours)) {
    const { amount, unit } = tierDeadline(tierHours);
    // „bis“ takes the accusative („bis 2 Tage“), „unter“ the dative
    // („unter 2 Tagen“); hours read alike in both.
    deadline = (dative) =>
      unit === "days"
        ? dative
          ? formatDaysDative(amount)
          : formatDays(amount)
        : formatHours(amount);
    atStart = tierHours === 0;
    below = calculation.hoursBeforeStart < tierHours;
  } else if (Number.isFinite(tierDays)) {
    deadline = (dative) =>
      dative ? formatDaysDative(tierDays) : formatDays(tierDays);
    atStart = tierDays === 0;
    below = calculation.daysBeforeStart < tierDays;
  } else {
    return null;
  }
  if (below) {
    return atStart
      ? i18n.t("booking.cancellationRefund.tierRuleAfterStart")
      : i18n.t("booking.cancellationRefund.tierRuleBelow", {
          deadline: deadline(true),
        });
  }
  return atStart
    ? i18n.t("booking.cancellationRefund.tierRuleAtStart")
    : i18n.t("booking.cancellationRefund.tierRule", {
        deadline: deadline(false),
      });
}

/**
 * The policy line of a single booking's refund preview or audit: the time
 * before the start where there is one (`formatTimeBeforeStart`) and the tier
 * that applied (`formatAppliedTierRule`), that the booking has begun where
 * `begun` (`hasBegun`), else that the booking has no time span. `key` is
 * `singlePolicy` or `userPolicySummary`.
 */
export function refundPolicyText(key, { time, tier, begun, ...values }) {
  if (begun) {
    return tier === null || tier === undefined
      ? i18n.t(`booking.cancellationRefund.${key}AfterStart`, values)
      : i18n.t(`booking.cancellationRefund.${key}AfterStartWithTier`, {
          tier,
          ...values,
        });
  }
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

/**
 * The refund of `originalAmountEur` at `percentage`, rounded to the cent -
 * the one rounding of the refund the frontend knows, shared by the refund
 * preview and the payment hint.
 */
export function refundAtPercentage(originalAmountEur, percentage) {
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
 * The headings and notes of the refund panel on the pages of the
 * cancellation link. A booking not paid yet gets nothing back: its texts
 * speak of what drops away and what is still due, not of a refund.
 *
 * @returns {{ title: string, footer: string, previewError: string, policyKey: string }} `policyKey` goes to `refundPolicyText`
 */
export function customerRefundWording(unpaid) {
  const suffix = unpaid ? "Unpaid" : "";
  const t = (key) => i18n.t(`booking.cancellationRefund.${key}${suffix}`);
  return {
    title: t("expectedTitle"),
    footer: t("finalAmountHint"),
    previewError: t("previewError"),
    policyKey: `userPolicySummary${suffix}`,
  };
}

/**
 * The payment hint of the reject dialogs: whether the customer has paid, and
 * what the cancellation leaves them - money back, a fee still to pay, or
 * nothing more, all settled. Mirrors the cancellation document: a paid
 * booking gets the refund back, an unpaid one owes the fee only. A rejected
 * request costs nothing: what was paid comes back in full, without a
 * preview to weigh. `refundAmountEur` is `null` while no
 * preview is at hand; `previewFailed` tells a failed preview from one still
 * loading - the amount is then unknown, though the tenant's tiers still apply.
 * `customer` words the same outcome for the booker on the pages of the
 * cancellation link, addressing them directly.
 *
 * @returns {{ type: string, status: string, text: string }} The alert's type, its bold line and the line under it
 */
export function rejectPaymentOutcome({
  request,
  free,
  paid,
  priceEur,
  refundAmountEur,
  previewFailed,
  customer = false,
}) {
  const scope = customer
    ? "booking.userCancellation.payment"
    : "booking.reject.dialog.payment";
  const t = (key, values) => i18n.t(`${scope}.${key}`, values);
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
    if (refundAmountEur === null && previewFailed) {
      return { type: "warning", status, text: t("refundUnknown") };
    }
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
  if (refundAmountEur === null && previewFailed) {
    return { type: "warning", status, text: t("feeUnknown") };
  }
  if (refundAmountEur === null) return { type: "info", status, text: "" };
  const fee = Math.round((Number(priceEur || 0) - refundAmountEur) * 100) / 100;
  return fee > 0
    ? { type: "warning", status, text: t("feeDue", { amount: currency(fee) }) }
    : { type: "success", status, text: t("dropped") };
}
