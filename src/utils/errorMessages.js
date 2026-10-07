import i18n from "@/language/index";

export const GROUP_BOOKING_ERROR_MESSAGES = {
  CONTACT_DETAILS_MISMATCH:
    "Die Buchungen haben unterschiedliche Kontaktdaten.",
  OWNER_MISMATCH: "Den Buchungen sind unterschiedliche Personen zugewiesen.",
  STATUS_MISMATCH: "Die Buchungen haben unterschiedliche Status.",
  PAYMENT_PROVIDER_MISMATCH:
    "Die Buchungen haben unterschiedliche Zahlungsanbieter.",
  PAYMENT_PROVIDER_REQUIRED:
    "Es gibt Buchungen ohne Zahlungsanbieter. Bitte wähle einen aus.",
  PAYED_STATUS: "Die Buchungen sind noch nicht bezahlt.",
};

export const BOOKING_ERROR_MESSAGES = {
  CONTACT_DETAILS_MISMATCH: "Die Buchung hat unterschiedliche Kontaktdaten.",
  PAYED_STATUS: "Die Buchung ist noch nicht bezahlt.",
  PAYMENT_PROVIDER_REQUIRED:
    "Die Buchung hat keinen Zahlungsanbieter hinterlegt. Bitte wähle einen aus.",
};

const ERROR_MESSAGES = {
  UNKNOWN_ERROR: "Ein unbekannter Fehler ist aufgetreten.",
};

export function getGroupBookingErrorMessage(code) {
  return GROUP_BOOKING_ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

export function getBookingErrorMessage(code) {
  return BOOKING_ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * The reasons of a `ValidationError` (400, `details[]` with field and code):
 * the stored booking does not pass the backend's schema, so a transition could
 * not write it. Each detail reads as the title of the booking form's
 * validation table (`booking.validation.<field>.<code>`), a field without one
 * by its name. Any other error has none.
 */
export function getBookingValidationReasons(error) {
  const data = error?.response?.data;
  if (
    error?.response?.status !== 400 ||
    data?.error !== "ValidationError" ||
    !Array.isArray(data.details)
  ) {
    return [];
  }
  return data.details.map(({ field, code, params }) => {
    const key = `booking.validation.${field}.${code}.title`;
    return i18n.te(key)
      ? i18n.t(key, params)
      : i18n.t("booking.validation-reason-unknown", { field });
  });
}
