const SAMPLE = {
  bookingNumber: "BK-987654",
  totalAmount: "120,00 €",
  company: "Beispiel GmbH",
  name: "Max Mustermann",
  address: "Musterstraße 1, 12345 Musterstadt",
  phone: "0123 4567890",
  email: "max.mustermann@beispiel.de",
  bookingPeriod: "21.05.2026, 10:00 – 21.05.2026, 12:00",
  itemTitle: "Tagungsraum Klein",
  itemAmount: "1",
  cancelReason: "Kunde hat Buchung widerrufen",
  rejectionReason: "Termin ist bereits vergeben",
};

const STYLES = {
  section: "margin-top:16px; font-family:inherit; color:#222222; font-size:16px; line-height:1.5;",
  hint: "background:#fff4e5; border-left:4px solid #ed6c02; color:#7a3c00; padding:10px 14px; border-radius:2px; margin-bottom:16px;",
  details: "margin:12px 0;",
  contact: "margin:12px 0;",
  heading3: "margin:18px 0 6px; font-size:18px; line-height:1.3;",
  hr: "border:none; border-top:1px solid #dddddd; margin:18px 0;",
  buttonRow: "margin:18px 0;",
  buttonPrimary:
    "display:inline-block; padding:12px 22px; background:#1976d2; color:#ffffff; text-decoration:none; font-weight:600; border-radius:4px;",
  buttonDanger:
    "display:inline-block; padding:12px 22px; background:#d32f2f; color:#ffffff; text-decoration:none; font-weight:600; border-radius:4px;",
  link: "color:#1976d2; text-decoration:underline;",
};

const EXTRAS_CONFIG = {
  "booking-confirmation": { showStorno: true },
  "free-booking-confirmation": { showStorno: true },
  "booking-request-confirmation": { showStorno: true },
  "booking-confirmed-invoice-pending": { showStorno: true },
  "booking-cancel": { reason: "cancel" },
  "booking-rejection": { reason: "rejection" },
  invoice: { showStorno: true },
  "invoice-after-approval": { showStorno: true },
  "payment-link-after-approval": { showStorno: true, showPayment: true },
  "supervisor-booking-notification": {},
};

function reasonBlock(type) {
  if (type === "cancel") {
    return (
      `<div style="${STYLES.hint}">` +
      `<strong>Hinweis zur Stornierung:</strong> ${SAMPLE.cancelReason}` +
      "</div>"
    );
  }
  if (type === "rejection") {
    return (
      `<div style="${STYLES.hint}">` +
      `<strong>Hinweis zur Ablehnung:</strong> ${SAMPLE.rejectionReason}` +
      "</div>"
    );
  }
  return "";
}

function detailsBlock() {
  return (
    `<p style="${STYLES.details}">` +
    `<strong>Buchungsnummer:</strong> ${SAMPLE.bookingNumber}<br />` +
    `<strong>Gesamtbetrag:</strong> ${SAMPLE.totalAmount}` +
    "</p>"
  );
}

function contactBlock() {
  return (
    `<p style="${STYLES.contact}">` +
    `<strong>Firma:</strong> ${SAMPLE.company}<br />` +
    `<strong>Name:</strong> ${SAMPLE.name}<br />` +
    `<strong>Adresse:</strong> ${SAMPLE.address}<br />` +
    `<strong>Telefon:</strong> ${SAMPLE.phone}<br />` +
    `<strong>E-Mail:</strong> <a href="mailto:${SAMPLE.email}" style="${STYLES.link}">${SAMPLE.email}</a><br />` +
    `<strong>Buchungszeitraum:</strong> ${SAMPLE.bookingPeriod}` +
    "</p>"
  );
}

function orderOverview() {
  return (
    `<h3 style="${STYLES.heading3}">Bestellübersicht</h3>` +
    `<p><strong>${SAMPLE.itemTitle}, Anzahl: ${SAMPLE.itemAmount}</strong></p>` +
    `<hr style="${STYLES.hr}" />`
  );
}

function buttonsBlock({ showPayment, showStorno }) {
  if (!showPayment && !showStorno) return "";
  const parts = [];
  if (showPayment) {
    parts.push(
      `<a href="#" style="${STYLES.buttonPrimary}">Buchung abschließen</a>`
    );
  }
  if (showStorno) {
    parts.push(
      `<a href="#" style="${STYLES.buttonDanger}">Buchung stornieren</a>`
    );
  }
  return (
    `<div style="${STYLES.buttonRow}">` +
    parts.join(" &nbsp; ") +
    "</div>" +
    `<hr style="${STYLES.hr}" />`
  );
}

export function buildSnippetPreviewExtrasHtml(key) {
  const cfg = EXTRAS_CONFIG[key];
  if (!cfg) return "";

  const sections = [
    reasonBlock(cfg.reason),
    detailsBlock(),
    contactBlock(),
    orderOverview(),
    buttonsBlock({
      showPayment: !!cfg.showPayment,
      showStorno: !!cfg.showStorno,
    }),
  ].filter(Boolean);

  if (!sections.length) return "";

  return (
    `<div style="${STYLES.section}" data-preview-extras="server-appended">` +
    sections.join("\n") +
    "</div>"
  );
}

export const SNIPPET_PREVIEW_SAMPLE = SAMPLE;
