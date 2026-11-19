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

/** The first address of a booking's mail, in lower case: whom it belongs to. */
function primaryMail(mail) {
  const [primary] = (mail || "")
    .split(/[,\n]+/)
    .map((address) => address.trim())
    .filter(Boolean);
  return primary ? primary.toLowerCase() : "";
}

/**
 * The account a save hands the booking to, `null` when it stays. A booking
 * of the Buchungsweg Admin belongs to its first mail, so when the admin
 * corrects that address, the backend moves it to the corrected one; every
 * other booking keeps its owner.
 */
export function ownerMovedTo(original, edited) {
  if (bookedViaOf(original) !== BOOKED_VIA.ADMIN) return null;
  const primary = primaryMail(edited?.mail);
  return primary && primary !== primaryMail(original.mail) ? primary : null;
}

/**
 * The account that booked for someone else, `null` otherwise: a booking of
 * the Buchungsweg Benutzer whose first mail is not the account's
 * (`assignedUserId`, the account's mail).
 */
export function bookingUserOf(booking) {
  if (bookedViaOf(booking) !== BOOKED_VIA.USER) return null;
  const account = (booking.assignedUserId || "").trim().toLowerCase();
  return account && account !== primaryMail(booking.mail)
    ? booking.assignedUserId
    : null;
}
