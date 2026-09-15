import i18n from "@/language/index";

function labelFor(group, code) {
  const key = `booking.page.payment.${group}.${code}`;
  return code && i18n.te(key)
    ? i18n.t(key)
    : i18n.t("booking.page.payment.unknown");
}

/** The German word for a `booking.paymentMethod` code, "Unbekannt" for one the catalogue lacks. */
export function paymentMethodLabel(method) {
  return labelFor("methods", method);
}

/** The German word for a `booking.paymentProvider`, "Unbekannt" for one the catalogue lacks. */
export function paymentProviderLabel(provider) {
  return labelFor("providers", provider);
}
