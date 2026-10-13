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
