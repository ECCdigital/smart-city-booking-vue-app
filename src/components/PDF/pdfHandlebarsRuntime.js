import { PDF_PARTIAL_TEMPLATES } from "@/components/PDF/pdfPartialTemplates.js";

export function formatDateTime(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
  return formatter.format(date);
}

export function formatDate(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return formatter.format(date);
}

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return "-";
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });
  return formatter.format(value);
}

export function formatNegativeCurrency(value) {
  if (value == null || isNaN(value)) return "-";
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });
  return formatter.format(Math.abs(value) * -1);
}

export function formatAmount(value) {
  if (value == null || isNaN(value)) return "-";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const PAY_METHOD_LABELS = {
  CASH: "Bar",
  TRANSFER: "Überweisung",
  CREDIT_CARD: "Kreditkarte",
  DEBIT_CARD: "EC-Karte",
  PAYPAL: "PayPal",
  OTHER: "Sonstiges",
  GIROPAY: "Giropay",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  EPS: "EPS",
  IDEAL: "iDEAL",
  MAESTRO: "Maestro",
  PAYDIRECT: "paydirekt",
  SOFORT: "SOFORT-Überweisung",
  BLUECODE: "Bluecode",
};

export function translatePayMethod(value) {
  return PAY_METHOD_LABELS[value] || "Unbekannt";
}

export const PDF_PARTIALS = PDF_PARTIAL_TEMPLATES;

/**
 * Registriert alle PDF-Helper und -Partials auf einer Handlebars-Instanz
 * (identisch zum Backend, damit die Browser-Vorschau dasselbe rendert).
 */
export function registerPdfRuntime(Handlebars) {
  if (!Handlebars) return;

  const registerHelperIfMissing = (name, fn) => {
    if (!Handlebars.helpers[name]) {
      Handlebars.registerHelper(name, fn);
    }
  };

  registerHelperIfMissing("eq", (a, b) => a === b);
  registerHelperIfMissing("formatDateTime", (value) =>
    value ? formatDateTime(value) : "–",
  );
  registerHelperIfMissing("formatDate", (value) =>
    value ? formatDate(value) : "–",
  );
  registerHelperIfMissing("formatCurrency", (value) => formatCurrency(value));
  registerHelperIfMissing("formatNegativeCurrency", (value) =>
    formatNegativeCurrency(value),
  );
  registerHelperIfMissing("formatAmount", (value) => formatAmount(value));
  registerHelperIfMissing("payMethod", (value) => translatePayMethod(value));

  Object.entries(PDF_PARTIAL_TEMPLATES).forEach(([name, source]) => {
    Handlebars.registerPartial(name, source);
  });
}
