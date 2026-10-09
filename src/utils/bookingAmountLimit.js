// A missing, zero or negative value sets no limit.
function positiveOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * How many units of a bookable one self-booking may hold: the stricter of
 * its Anzahl (`amount`) and its Höchstmenge je Buchung
 * (`maxAmountPerBooking`). `max` is null when neither limits it;
 * `perBooking` says the Höchstmenge je Buchung is the one that binds, so the
 * checkout names it rather than the capacity.
 */
export function bookingAmountLimit(bookable) {
  const capacity = positiveOrNull(bookable?.amount);
  const perBooking = positiveOrNull(bookable?.maxAmountPerBooking);

  if (perBooking !== null && (capacity === null || perBooking <= capacity)) {
    return { max: perBooking, perBooking: true };
  }
  return { max: capacity, perBooking: false };
}

/** The unit a bookable is booked in, as the checkout names it. */
export function amountUnit(bookable) {
  return bookable?.priceType === "per-square-meter" ? "m²" : "Stück";
}
