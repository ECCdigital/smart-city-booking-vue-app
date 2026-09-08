import { BOOKING_STATUS, STATE_KEYS } from "@/utils/bookingStatus";

export function createEmptyBooking(tenantId) {
  return {
    id: null,
    tenant: tenantId,
    tenantId,
    assignedUserId: null,
    attachments: [],
    bookableItems: [],
    comment: null,
    company: null,
    couponCode: null,
    location: null,
    mail: null,
    name: null,
    paymentProvider: null,
    paymentMethod: null,
    phone: null,
    priceEur: 0,
    street: null,
    timeBegin: Date.now(),
    timeCreated: Date.now(),
    timeEnd: Date.now() + 2 * 60 * 60 * 1000,
    vatIncludedEur: null,
    zipCode: null,
    customFieldDefinitions: [],
    customFieldValues: [],
  };
}

/**
 * The three choices the create form offers as "Anfangszustand" (spec E10,
 * N6). They are the admin's acts, not states - the form names them with the
 * state words of the draft's path: `confirmed` lands at `payment_due` or
 * `confirmed` depending on the price, and `paid` is `confirmed` with the
 * payment named.
 */
export const INITIAL_STATE = Object.freeze({
  REQUESTED: "requested",
  CONFIRMED: "confirmed",
  PAID: "paid",
});

export function defaultInitialState() {
  return {
    selection: INITIAL_STATE.REQUESTED,
    paymentMethod: null,
    timePaid: null,
  };
}

/** The choices for a booking of `priceEur`: Bezahlt only where there is something to pay. */
export function initialStateChoices(priceEur) {
  const choices = [INITIAL_STATE.REQUESTED, INITIAL_STATE.CONFIRMED];
  if (Number(priceEur) > 0) {
    choices.push(INITIAL_STATE.PAID);
  }
  return choices;
}

/**
 * The wire value of a selection: `status` as the create PUT takes it
 * (spec E1.2), plus `paymentMethod` and `timePaid` for a booking born paid.
 * No flag, ever.
 */
export function initialStateWire(initialState, priceEur) {
  const selection = initialState?.selection || INITIAL_STATE.REQUESTED;
  const priced = Number(priceEur) > 0;

  if (selection === INITIAL_STATE.PAID && priced) {
    return {
      status: BOOKING_STATUS.CONFIRMED,
      paymentMethod: initialState.paymentMethod,
      timePaid: initialState.timePaid,
    };
  }
  if (
    selection === INITIAL_STATE.CONFIRMED ||
    selection === INITIAL_STATE.PAID
  ) {
    return {
      status: priced ? BOOKING_STATUS.PAYMENT_DUE : BOOKING_STATUS.CONFIRMED,
    };
  }
  return { status: BOOKING_STATUS.REQUESTED };
}

const pad = (number) => String(number).padStart(2, "0");

/**
 * The date picker's `YYYY-MM-DD` as a `Date` at local midnight. `new Date`
 * reads that string as UTC midnight, which west of UTC is the previous
 * local day; the numeric parts keep the day the admin picked. No date, `null`.
 */
export function paymentDateOf(paymentDate) {
  if (!paymentDate) return null;
  const [year, month, day] = paymentDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * `timePaid` as the form edits it: a `YYYY-MM-DD` date from the date picker
 * and an `HH:mm` time from the time picker, combined into the epoch
 * milliseconds the booking stores. No date, no moment.
 */
export function timePaidOf(paymentDate, paymentTime) {
  const dateTime = paymentDateOf(paymentDate);
  if (!dateTime) return null;
  if (paymentTime) {
    const [hours, minutes] = paymentTime.split(":");
    dateTime.setHours(parseInt(hours));
    dateTime.setMinutes(parseInt(minutes));
  }
  return dateTime.getTime();
}

/** The inverse: the picker values for a stored `timePaid`. */
export function timePaidParts(timePaid) {
  const date = new Date(timePaid);
  return {
    paymentDate: [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-"),
    paymentTime: [pad(date.getHours()), pad(date.getMinutes())].join(":"),
  };
}

/**
 * The form's object without what is not an input: the mongo id, the stored
 * state and the three derived flags. The keys are dropped, not set to
 * `null` - the backend reads a present flag as a transition to plan.
 */
function contentOf(booking) {
  const content = { ...booking };
  delete content._id;
  STATE_KEYS.forEach((key) => delete content[key]);
  return content;
}

/** The body of the update PUT: content only, the plan is `[amend]` (spec E1.1). */
export function toUpdatePayload(booking) {
  return contentOf(booking);
}

/** The body of the create PUT: content plus the computed initial state (spec E10). */
export function toCreatePayload(booking, initialState, priceEur) {
  return { ...contentOf(booking), ...initialStateWire(initialState, priceEur) };
}
