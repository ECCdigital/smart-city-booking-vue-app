import i18n from "@/language/index";

/** The heading of the Buchungsweg in the list, the detail and the XLSX. */
export function bookedViaTitle() {
  return i18n.t("booking.booked-via.title");
}

/** The German word for a `booking.bookedVia`, "Unbekannt" when it is missing or new. */
export function bookedViaLabel(bookedVia) {
  const key = `booking.booked-via.values.${bookedVia}`;
  return bookedVia && i18n.te(key)
    ? i18n.t(key)
    : i18n.t("booking.booked-via.unknown");
}

/**
 * The ways of the list's filter: the three the checkout writes, and
 * `unknown` for a booking without one (made before it was recorded).
 */
export const BOOKED_VIA = Object.freeze({
  USER: "user",
  GUEST: "guest",
  ADMIN: "admin",
  UNKNOWN: "unknown",
});

/** The way a booking was made, `unknown` when it is missing or new. */
export function bookedViaOf(booking) {
  const bookedVia = booking?.bookedVia;
  return [BOOKED_VIA.USER, BOOKED_VIA.GUEST, BOOKED_VIA.ADMIN].includes(
    bookedVia
  )
    ? bookedVia
    : BOOKED_VIA.UNKNOWN;
}

/** The list's Buchungsweg filter: the bookings made one of the `ways`. */
export function filterBookingsByBookedVia(bookings, ways) {
  return bookings.filter((booking) => ways.includes(bookedViaOf(booking)));
}

/** The badge's tooltip: who made the booking, or that it is not known. */
export function bookedViaHint(bookedVia) {
  return i18n.t(`booking.booked-via.hint.${bookedViaOf({ bookedVia })}`);
}
