import {
  formatCurrency as pdfFormatCurrency,
  formatNegativeCurrency as pdfFormatNegativeCurrency,
} from "@/components/PDF/pdfHandlebarsRuntime.js";

export const SNIPPET_VARIABLES = [
  {
    name: "tenantName",
    placeholder: "{{tenantName}}",
    label: "Mandant",
    description: "Anzeigename des Mandanten",
  },
  {
    name: "supportEmail",
    placeholder: "{{supportEmail}}",
    label: "Support-E-Mail",
    description: "Support-E-Mail des Mandanten",
  },
  {
    name: "customerName",
    placeholder: "{{customerName}}",
    label: "Kundenname",
    description: "Name des buchenden Kunden",
  },
  {
    name: "currentDate",
    placeholder: "{{currentDate}}",
    label: "Aktuelles Datum",
    description: "Aktuelles Datum",
  },
  {
    name: "customerContact",
    placeholder: "{{{customerContact}}}",
    label: "Kundenkontakt",
    description:
      "Kontaktdaten des Kunden (HTML, mehrzeilig: Name, Firma, E-Mail, Telefon, Adresse)",
  },
];

export const GENERIC_MAIL_VARIABLES = [
  {
    name: "title",
    placeholder: "{{title}}",
    label: "Titel",
    description: "Titel der Nachricht",
  },
  {
    name: "content",
    placeholder: "{{{content}}}",
    label: "Inhalt",
    description: "Hauptinhalt der Nachricht (HTML)",
  },
];

// --- Strukturierte PDF-Variablen, Handlebars-Helper und Partials (DEV-790) ---
// Konsistent zum Backend (src/commons/pdf-service): Partials und Helper stehen
// serverseitig in allen PDF-Templates zur Verfügung; für die Browser-Vorschau
// werden sie über pdfHandlebarsRuntime.js registriert.

const PDF_STRUCTURED_VARIABLES = [
  {
    name: "items",
    placeholder: "{{#each items}}{{title}}: {{totalPrice}} {{/each}}",
    label: "Positionen (strukturiert)",
    description:
      "Array der Positionen: title, amount, unitPrice, totalPrice (formatiert) sowie unitPriceEur, totalPriceEur (Zahlen)",
  },
  {
    name: "totals",
    placeholder: "{{totals.brutto}}",
    label: "Summen (strukturiert)",
    description:
      "Summenblock: netto, vat, brutto (formatiert) sowie nettoEur, vatEur, bruttoEur (Zahlen)",
  },
  {
    name: "coupon",
    placeholder:
      "{{#if coupon}}{{coupon.description}}: {{coupon.discountLabel}}{{/if}}",
    label: "Gutschein (strukturiert)",
    description:
      "Gutschein mit description und discountLabel – null, wenn kein Gutschein eingelöst wurde",
  },
];

const PDF_BOOKING_FIELD_VARIABLES = [
  {
    name: "booking.id",
    placeholder: "{{booking.id}}",
    label: "Buchungsnummer (Variable)",
    description:
      "Nummer der Buchung — unabhängig von der Tabellen-Einstellung platzierbar",
  },
  {
    name: "booking.period",
    placeholder: "{{booking.period}}",
    label: "Buchungszeitraum (Variable)",
    description:
      "Zeitraum der Buchung — unabhängig von der Tabellen-Einstellung platzierbar",
  },
  {
    name: "booking.paymentDate",
    placeholder: "{{booking.paymentDate}}",
    label: "Zahlungsdatum (Variable)",
    description:
      "Datum des Zahlungseingangs — unabhängig von der Tabellen-Einstellung platzierbar",
  },
  {
    name: "booking.paymentMethod",
    placeholder: "{{booking.paymentMethod}}",
    label: "Zahlungsmethode (Variable)",
    description:
      "Art der Zahlung — unabhängig von der Tabellen-Einstellung platzierbar",
  },
];

const PDF_BOOKING_VARIABLE = {
  name: "booking",
  placeholder: "{{booking.id}}",
  label: "Buchung (strukturiert)",
  description:
    "Nur Einzeldokumente: Buchung mit id, period, paymentDate, paymentMethod",
};

const PDF_BOOKINGS_VARIABLE = {
  name: "bookings",
  placeholder: "{{#each bookings}}{{id}}: {{netto}} {{/each}}",
  label: "Buchungen (strukturiert)",
  description:
    "Nur Sammel-Dokumente: Array der Buchungen mit id, period, paymentDate, paymentMethod, netto, items",
};

const PDF_HELPER_VARIABLES = [
  {
    name: "formatCurrency",
    placeholder: "{{formatCurrency totals.bruttoEur}}",
    label: "Helper: Währung formatieren",
    description: "Formatiert eine Zahl als Euro-Betrag (z. B. 1.234,56 €)",
    category: "helper",
  },
  {
    name: "formatNegativeCurrency",
    placeholder: "{{formatNegativeCurrency totals.bruttoEur}}",
    label: "Helper: Negative Währung",
    description: "Formatiert eine Zahl als negativen Euro-Betrag",
    category: "helper",
  },
  {
    name: "formatAmount",
    placeholder: "{{formatAmount totals.bruttoEur}}",
    label: "Helper: Betrag ohne Währungszeichen",
    description: "Formatiert eine Zahl mit zwei Nachkommastellen",
    category: "helper",
  },
  {
    name: "formatDate",
    placeholder: "{{formatDate \"2026-08-01\"}}",
    label: "Helper: Datum formatieren",
    description:
      "Formatiert ein Datum (ISO-Format oder Zeitstempel) als TT.MM.JJJJ",
    category: "helper",
  },
  {
    name: "formatDateTime",
    placeholder: "{{formatDateTime \"2026-08-01T09:30:00\"}}",
    label: "Helper: Datum + Uhrzeit formatieren",
    description:
      "Formatiert ein Datum (ISO-Format oder Zeitstempel) als TT.MM.JJJJ, HH:MM",
    category: "helper",
  },
  {
    name: "payMethod",
    placeholder: "{{payMethod \"TRANSFER\"}}",
    label: "Helper: Zahlart übersetzen",
    description: "Übersetzt Zahlart-Codes (z. B. TRANSFER → Überweisung)",
    category: "helper",
  },
];

const PDF_BOOKING_ITEMS_TABLE_PARTIAL = (tableClass) => ({
  name: "pdfBookingItemsTable",
  placeholder: `{{> pdfBookingItemsTable tableClass="${tableClass}" items=items coupon=coupon totals=totals tableMeta=tableMeta}}`,
  label: "Partial: Positionstabelle",
  description:
    "Zentrale Positionstabelle inkl. Gutschein-Zeile und Summenblock (Alternative zur Legacy-Tabelle). tableMeta steuert sichtbare Buchungsfelder.",
  category: "partial",
});

const PDF_AGGREGATED_RECEIPT_TABLE_PARTIAL = {
  name: "pdfAggregatedReceiptTable",
  placeholder:
    "{{> pdfAggregatedReceiptTable bookings=bookings totals=totals tableMeta=tableMeta}}",
  label: "Partial: Sammelbeleg-Tabelle",
  description:
    "Tabelle der Buchungen für Sammelbelege inkl. Summenblock. tableMeta steuert sichtbare Buchungsfelder.",
  category: "partial",
};

const PDF_AGGREGATED_BOOKINGS_TABLE_PARTIAL = {
  name: "pdfAggregatedBookingsTable",
  placeholder:
    "{{> pdfAggregatedBookingsTable bookings=bookings totals=totals tableMeta=tableMeta}}",
  label: "Partial: Sammelrechnungs-Tabelle",
  description:
    "Tabelle der Buchungen für Sammelrechnungen/-storni inkl. Summenblock. tableMeta steuert sichtbare Buchungsfelder.",
  category: "partial",
};

export const RECEIPT_VARIABLES = [
  {
    name: "receiptNumber",
    placeholder: "{{receiptNumber}}",
    label: "Belegnummer",
    description: "Belegnummer der Zahlung",
  },
  {
    name: "bookingDate",
    placeholder: "{{bookingDate}}",
    label: "Buchungsdatum",
    description: "Datum der Buchung",
  },
  {
    name: "receiptAddress",
    placeholder: "{{{receiptAddress}}}",
    label: "Empfängeradresse",
    description: "Rechnungsadresse des Empfängers (HTML)",
  },
  {
    name: "isAggregated",
    placeholder:
      "{{#if isAggregated}}Text für Sammelbeleg{{else}}Text für Einzelbeleg{{/if}}",
    label: "Sammelbeleg-Bedingung",
    description:
      "Bedingte Anweisung, die angibt, ob es sich um eine Sammelbuchung handelt – Texte in den Zweigen anpassen",
  },
  {
    name: "bookingEntries",
    placeholder: "{{{bookingEntries}}}",
    label: "Buchungstabelle",
    description: "HTML-Tabelle mit Details der gebuchten Objekte",
  },
  {
    name: "bookingId",
    placeholder: "{{booking.id}}",
    label: "Buchungsnummer",
    description:
      "Nummer der Buchung (nur Einzelbeleg; bei Sammelbelegen stehen die Nummern in der Buchungsliste)",
  },
  ...PDF_STRUCTURED_VARIABLES,
  ...PDF_BOOKING_FIELD_VARIABLES,
  PDF_BOOKING_VARIABLE,
  PDF_BOOKINGS_VARIABLE,
  ...PDF_HELPER_VARIABLES,
  PDF_BOOKING_ITEMS_TABLE_PARTIAL("booking-detail"),
  PDF_AGGREGATED_RECEIPT_TABLE_PARTIAL,
];

export const INVOICE_VARIABLES = [
  {
    name: "invoiceNumber",
    placeholder: "{{invoiceNumber}}",
    label: "Rechnungsnummer",
    description: "Rechnungsnummer",
  },
  {
    name: "invoiceDate",
    placeholder: "{{invoiceDate}}",
    label: "Rechnungsdatum",
    description: "Rechnungsdatum",
  },
  {
    name: "invoiceAddress",
    placeholder: "{{{invoiceAddress}}}",
    label: "Rechnungsadresse",
    description: "Rechnungsadresse",
  },
  {
    name: "daysUntilPaymentDue",
    placeholder: "{{daysUntilPaymentDue}}",
    label: "Zahlungsfrist (Tage)",
    description: "Tage bis Zahlung fällig",
  },
  {
    name: "mainContent",
    placeholder: "{{{mainContent}}}",
    label: "Positionstabelle",
    description: "Hauptinhalt der Rechnung (HTML)",
  },
  {
    name: "bookingId",
    placeholder: "{{bookingId}}",
    label: "Buchungs-ID",
    description: "ID der Buchung",
  },
  {
    name: "bookingDate",
    placeholder: "{{bookingDate}}",
    label: "Buchungsdatum",
    description: "Datum der Buchung",
  },
  {
    name: "bookingPeriod",
    placeholder: "{{bookingPeriod}}",
    label: "Buchungszeitraum",
    description: "Buchungszeitraum",
  },
  {
    name: "totalAmount",
    placeholder: "{{totalAmount}}",
    label: "Gesamtbetrag",
    description: "Gesamtbetrag",
  },
  {
    name: "bank",
    placeholder: "{{bank}}",
    label: "Bank",
    description: "Bankname",
  },
  { name: "iban", placeholder: "{{iban}}", label: "IBAN", description: "IBAN" },
  { name: "bic", placeholder: "{{bic}}", label: "BIC", description: "BIC" },
  {
    name: "location",
    placeholder: "{{location}}",
    label: "Ort",
    description: "Ort der Rechnungsausstellung",
  },
  {
    name: "purposeOfPayment",
    placeholder: "{{purposeOfPayment}}",
    label: "Verwendungszweck",
    description: "Verwendungszweck",
  },
  ...PDF_STRUCTURED_VARIABLES,
  ...PDF_BOOKING_FIELD_VARIABLES,
  PDF_BOOKING_VARIABLE,
  PDF_BOOKINGS_VARIABLE,
  ...PDF_HELPER_VARIABLES,
  PDF_BOOKING_ITEMS_TABLE_PARTIAL("booked-items"),
  PDF_AGGREGATED_BOOKINGS_TABLE_PARTIAL,
];

export const CANCELLATION_VARIABLES = [
  {
    name: "title",
    placeholder: "{{title}}",
    label: "Dokumenttitel",
    description:
      "Titel des Belegs (z. B. „Stornorechnung“ oder „Sammel-Stornorechnung“)",
  },
  {
    name: "cancellationNumber",
    placeholder: "{{cancellationNumber}}",
    label: "Stornobelegnummer",
    description: "Nummer des Stornobelegs",
  },
  {
    name: "originalInvoiceNumber",
    placeholder: "{{originalInvoiceNumber}}",
    label: "Original-Rechnungsnummer",
    description: "Ursprüngliche Rechnungsnummer",
  },
  {
    name: "originalInvoiceDate",
    placeholder: "{{originalInvoiceDate}}",
    label: "Original-Rechnungsdatum",
    description: "Datum der ursprünglichen Rechnung",
  },
  {
    name: "location",
    placeholder: "{{location}}",
    label: "Ort",
    description: "Ort",
  },
  {
    name: "cancellationDate",
    placeholder: "{{cancellationDate}}",
    label: "Stornodatum",
    description: "Datum und Uhrzeit der Stornierung",
  },
  {
    name: "invoiceAddress",
    placeholder: "{{{invoiceAddress}}}",
    label: "Kundenadresse",
    description: "Adresse des Kunden",
  },
  {
    name: "refundAmount",
    placeholder: "{{refundAmount}}",
    label: "Erstattungsbetrag",
    description: "Erstattungsbetrag (formatiert)",
  },
  {
    name: "cancellationFee",
    placeholder: "{{cancellationFee}}",
    label: "Einbehaltener Betrag",
    description: "Einbehaltener Betrag / Stornogebühr (formatiert)",
  },
  {
    name: "cancellationReason",
    placeholder: "{{cancellationReason}}",
    label: "Stornogrund",
    description: "Grund der Stornierung",
  },
  {
    name: "daysBeforeStartLabel",
    placeholder: "{{daysBeforeStartLabel}}",
    label: "Tage vor Buchungsbeginn",
    description:
      "Kalendertage vor Buchungsbeginn als Text (oder „nicht verfügbar“)",
  },
  {
    name: "refundPercentage",
    placeholder: "{{refundPercentage}}",
    label: "Erstattungsprozentsatz",
    description: "Tatsächlich angewandter Erstattungsprozentsatz (0–100)",
  },
  {
    name: "suggestedRefundPercentage",
    placeholder: "{{suggestedRefundPercentage}}",
    label: "Vorgeschlagener Prozentsatz",
    description:
      "Aus der Mandantenstaffel vorgeschlagener Erstattungsprozentsatz",
  },
  {
    name: "calculationMode",
    placeholder: "{{calculationMode}}",
    label: "Berechnungsart",
    description:
      "Art der Erstattungsberechnung (z. B. Mandantenregel, manuell, System)",
  },
  {
    name: "appliedTierDays",
    placeholder: "{{appliedTierDays}}",
    label: "Angewandte Staffelstufe",
    description:
      "Schwellenwert (Tage) der angewandten Erstattungsstufe, oder leer",
  },
  {
    name: "isFullRefund",
    placeholder:
      "{{#if isFullRefund}}in voller Höhe{{else}}anteilig gemäß der nachfolgenden Berechnung{{/if}}",
    label: "Volle Erstattung (Bedingung)",
    description:
      "Wahr, wenn 100 % erstattet werden – Formulierung in den Zweigen anpassen",
  },
  {
    name: "hasCancellationFee",
    placeholder:
      "{{#if hasCancellationFee}}Einbehalt: {{cancellationFee}}{{/if}}",
    label: "Einbehalt vorhanden (Bedingung)",
    description:
      "Wahr, wenn ein Betrag einbehalten wird – Hinweis in den Zweigen anpassen",
  },
  {
    name: "adminOverride",
    placeholder:
      "{{#if adminOverride}}manuell durch Administration{{else}}nach Regelwerk{{/if}}",
    label: "Admin-Override (Bedingung)",
    description:
      "Wahr, wenn ein Admin den vorgeschlagenen Prozentsatz überschrieben hat",
  },
  {
    name: "refundCalculations",
    placeholder:
      "{{#each refundCalculations}}Buchung {{bookingId}}: {{daysBeforeStartLabel}} Kalendertage vor Beginn, {{refundPercentage}} % Erstattung ({{refundAmount}}), {{calculationMode}}{{#unless @last}}<br />{{/unless}}{{/each}}",
    label: "Erstattungsberechnungen (Sammel)",
    description:
      "Array der Einzelberechnungen bei Sammelstornos (bookingId, Tage, %, Betrag, Berechnungsart)",
  },
  {
    name: "customerBankDetails",
    placeholder: "{{{customerBankDetails}}}",
    label: "Kunden-Bankverbindung",
    description:
      "Bankverbindung des Kunden für die Rückerstattung (HTML, leer wenn nicht hinterlegt)",
  },
  {
    name: "alreadyPaid",
    placeholder:
      "{{#if alreadyPaid}}Text bei erfolgter Zahlung{{else}}Text ohne Zahlung{{/if}}",
    label: "Bereits bezahlt (Bedingung)",
    description:
      "Steuert, ob Erstattungs- oder Storno-ohne-Zahlung-Hinweis angezeigt wird – Texte in den Zweigen anpassen",
  },
  {
    name: "mainContent",
    placeholder: "{{{mainContent}}}",
    label: "Positionstabelle",
    description: "Stornierte Positionen (HTML)",
  },
  {
    name: "bookingId",
    placeholder: "{{bookingId}}",
    label: "Buchungs-ID",
    description: "ID der stornierten Buchung bzw. Gruppenbuchung",
  },
  {
    name: "totalAmount",
    placeholder: "{{totalAmount}}",
    label: "Gesamt-Stornobetrag",
    description: "Aufsummierter Stornobetrag",
  },
  ...PDF_STRUCTURED_VARIABLES,
  ...PDF_BOOKING_FIELD_VARIABLES,
  PDF_BOOKING_VARIABLE,
  PDF_BOOKINGS_VARIABLE,
  ...PDF_HELPER_VARIABLES,
  PDF_BOOKING_ITEMS_TABLE_PARTIAL("booked-items"),
  PDF_AGGREGATED_BOOKINGS_TABLE_PARTIAL,
];

const SAMPLE_CUSTOMER_CONTACT =
  "<strong>Name:</strong> Max Mustermann<br />" +
  "<strong>Firma:</strong> Beispiel GmbH<br />" +
  "<strong>E-Mail:</strong> max.mustermann@beispiel.de<br />" +
  "<strong>Telefon:</strong> 0123 4567890<br />" +
  "<strong>Adresse:</strong> Musterstraße 1, 12345 Musterstadt";

const SAMPLE_RECEIPT_ADDRESS =
  "Beispiel GmbH<br/>\n    Max Mustermann<br/>\n    Musterstraße 1<br/>\n    12345 Musterstadt";

const SAMPLE_INVOICE_ADDRESS =
  "Beispiel GmbH<br />Max Mustermann<br />Musterstraße 1<br />12345 Musterstadt";

const SAMPLE_BOOKING_ENTRIES =
  "<p>Buchungsnummer: BK-987654 <br/>Buchungszeitraum: 21.05.2026, 10:00 – 21.05.2026, 12:00</p>\n" +
  "<p>Zahlungsdatum: 20.05.2026, 14:32<br/>Zahlungsmethode: Kreditkarte</p>\n" +
  '<table class="booking-detail" style="width:100%; border-collapse: collapse;">\n' +
  "  <thead>\n" +
  '    <tr style="background:#eee; border-bottom:1px solid #ddd;">\n' +
  '      <th class="bi-title">Beschreibung</th>\n' +
  '      <th class="bi-amount">Anzahl</th>\n' +
  '      <th class="bi-price-item">Einzelpreis</th>\n' +
  '      <th class="bi-price-total">Gesamtpreis</th>\n' +
  "    </tr>\n" +
  "  </thead>\n" +
  "  <tbody>\n" +
  '    <tr style="border-bottom:1px solid #eee;">\n' +
  '      <td class="bi-title">Tagungsraum Klein</td>\n' +
  '      <td class="bi-amount">1</td>\n' +
  '      <td class="bi-price-item">120,00 €</td>\n' +
  '      <td class="bi-price-total">120,00 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="netto" style="border-bottom:1px solid #eee;">\n' +
  '      <td colspan="3">Gesamt (netto)</td><td>100,84 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="mwst" style="border-bottom:1px solid #eee;">\n' +
  '      <td colspan="3">zzgl. MwSt.</td><td>19,16 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="brutto" style="font-weight:bold;">\n' +
  '      <td colspan="3">Gesamt (brutto)</td><td>120,00 €</td>\n' +
  "    </tr>\n" +
  "  </tbody>\n" +
  "</table>";

const SAMPLE_INVOICE_MAIN_CONTENT =
  '<table class="booked-items" style="width:100%; border-collapse: collapse;">\n' +
  "  <thead>\n" +
  '    <tr style="background:#eee; border-bottom:1px solid #ddd;">\n' +
  '      <th class="bi-title">Beschreibung</th>\n' +
  '      <th class="bi-amount">Anzahl</th>\n' +
  '      <th class="bi-price-item">Einzelpreis</th>\n' +
  '      <th class="bi-price-total">Gesamtpreis</th>\n' +
  "    </tr>\n" +
  "  </thead>\n" +
  "  <tbody>\n" +
  '    <tr style="border-bottom:1px solid #eee;">\n' +
  '      <td class="bi-title">Tagungsraum Klein</td>\n' +
  '      <td class="bi-amount">1</td>\n' +
  '      <td class="bi-price-item">120,00 €</td>\n' +
  '      <td class="bi-price-total">120,00 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="netto" style="border-bottom:1px solid #eee;">\n' +
  '      <td colspan="3">Gesamt (netto)</td><td>100,84 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="mwst" style="border-bottom:1px solid #eee;">\n' +
  '      <td colspan="3">zzgl. MwSt.</td><td>19,16 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="brutto" style="font-weight:bold;">\n' +
  '      <td colspan="3">Gesamt (brutto)</td><td>120,00 €</td>\n' +
  "    </tr>\n" +
  "  </tbody>\n" +
  "</table>";

const SAMPLE_CANCELLATION_MAIN_CONTENT =
  '<table class="booked-items" style="width:100%; border-collapse: collapse;">\n' +
  "  <thead>\n" +
  '    <tr style="background:#eee; border-bottom:1px solid #ddd;">\n' +
  '      <th class="bi-title">Beschreibung</th>\n' +
  '      <th class="bi-amount">Anzahl</th>\n' +
  '      <th class="bi-price-item">Einzelpreis</th>\n' +
  '      <th class="bi-price-total">Gesamtpreis</th>\n' +
  "    </tr>\n" +
  "  </thead>\n" +
  "  <tbody>\n" +
  '    <tr style="border-bottom:1px solid #eee;">\n' +
  '      <td class="bi-title">Tagungsraum Klein</td>\n' +
  '      <td class="bi-amount">1</td>\n' +
  '      <td class="bi-price-item">-120,00 €</td>\n' +
  '      <td class="bi-price-total">-120,00 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="netto" style="border-bottom:1px solid #eee;">\n' +
  '      <td colspan="3">Gesamt (netto)</td><td>-100,84 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="mwst" style="border-bottom:1px solid #eee;">\n' +
  '      <td colspan="3">zzgl. MwSt.</td><td>-19,16 €</td>\n' +
  "    </tr>\n" +
  '    <tr class="brutto" style="font-weight:bold;">\n' +
  '      <td colspan="3">Gesamt (brutto)</td><td>-120,00 €</td>\n' +
  "    </tr>\n" +
  "  </tbody>\n" +
  "</table>";

// Strukturierte Beispieldaten für die Browser-Vorschau, konsistent zum
// Backend-Sample (src/commons/pdf-service/pdf-sample-data.js).
function buildPdfSampleItems({ negative = false } = {}) {
  const format = negative ? pdfFormatNegativeCurrency : pdfFormatCurrency;
  const sign = negative ? -1 : 1;
  const titles = [
    "Sitzungsraum Rathaus",
    "Beamer inkl. Leinwand",
    "Bestuhlung (Reihe)",
    "Sporthalle Feld 1",
    "Werkraum Volkshochschule",
    "Marktstand Wochenmarkt",
  ];
  return titles.map((title, i) => {
    const unitPriceEur = sign * (12.5 + (i % 5) * 7.25);
    const amount = (i % 3) + 1;
    const totalPriceEur = unitPriceEur * amount;
    return {
      title: `${title} – Position ${i + 1}`,
      amount,
      unitPriceEur,
      totalPriceEur,
      unitPrice: format(unitPriceEur),
      totalPrice: format(totalPriceEur),
    };
  });
}

function buildPdfSampleTotals(items, { negative = false } = {}) {
  const format = negative ? pdfFormatNegativeCurrency : pdfFormatCurrency;
  const bruttoEur = items.reduce((sum, item) => sum + item.totalPriceEur, 0);
  const nettoEur = bruttoEur / 1.19;
  const vatEur = bruttoEur - nettoEur;
  return {
    nettoEur,
    vatEur,
    bruttoEur,
    netto: format(nettoEur),
    vat: format(vatEur),
    brutto: format(bruttoEur),
  };
}

const PDF_SAMPLE_ITEMS = buildPdfSampleItems();
const PDF_SAMPLE_TOTALS = buildPdfSampleTotals(PDF_SAMPLE_ITEMS);
const PDF_SAMPLE_ITEMS_NEGATIVE = buildPdfSampleItems({ negative: true });
const PDF_SAMPLE_TOTALS_NEGATIVE = buildPdfSampleTotals(
  PDF_SAMPLE_ITEMS_NEGATIVE,
  { negative: true },
);

const PDF_SAMPLE_BOOKING = {
  id: "BK-2026-0042",
  period: "01.08.2026, 09:00 – 01.08.2026, 17:00",
  paymentDate: "15.07.2026, 10:24",
  paymentMethod: "Überweisung",
  hasPayment: true,
  summaryItems: PDF_SAMPLE_ITEMS.map((item) => ({
    label: item.title,
    amount: item.amount,
  })),
};

const PDF_SAMPLE_BOOKINGS = [
  {
    id: "BK-2026-0042",
    period: "01.08.2026, 09:00 – 01.08.2026, 17:00",
    paymentDate: "15.07.2026, 10:24",
    paymentMethod: "Überweisung",
    netto: PDF_SAMPLE_TOTALS.netto,
    items: PDF_SAMPLE_ITEMS.slice(0, 2),
    summaryItems: PDF_SAMPLE_ITEMS.slice(0, 2).map((item) => ({
      label: item.title,
      amount: item.amount,
    })),
  },
  {
    id: "BK-2026-0043",
    period: "05.08.2026, 14:00 – 05.08.2026, 18:00",
    paymentDate: "16.07.2026, 09:12",
    paymentMethod: "Kreditkarte",
    netto: PDF_SAMPLE_TOTALS.netto,
    items: PDF_SAMPLE_ITEMS.slice(2, 4),
    summaryItems: PDF_SAMPLE_ITEMS.slice(2, 4).map((item) => ({
      label: item.title,
      amount: item.amount,
    })),
  },
];

const PDF_SAMPLE_BOOKING_NEGATIVE = {
  ...PDF_SAMPLE_BOOKING,
  summaryItems: PDF_SAMPLE_ITEMS_NEGATIVE.map((item) => ({
    label: item.title,
    amount: item.amount,
  })),
};

const PDF_SAMPLE_BOOKINGS_NEGATIVE = [
  {
    id: "BK-2026-0042",
    period: "01.08.2026, 09:00 – 01.08.2026, 17:00",
    paymentDate: "15.07.2026, 10:24",
    paymentMethod: "Überweisung",
    netto: PDF_SAMPLE_TOTALS_NEGATIVE.netto,
    items: PDF_SAMPLE_ITEMS_NEGATIVE.slice(0, 2),
    summaryItems: PDF_SAMPLE_ITEMS_NEGATIVE.slice(0, 2).map((item) => ({
      label: item.title,
      amount: item.amount,
    })),
  },
  {
    id: "BK-2026-0043",
    period: "05.08.2026, 14:00 – 05.08.2026, 18:00",
    paymentDate: "16.07.2026, 09:12",
    paymentMethod: "Kreditkarte",
    netto: PDF_SAMPLE_TOTALS_NEGATIVE.netto,
    items: PDF_SAMPLE_ITEMS_NEGATIVE.slice(2, 4),
    summaryItems: PDF_SAMPLE_ITEMS_NEGATIVE.slice(2, 4).map((item) => ({
      label: item.title,
      amount: item.amount,
    })),
  },
];

export const SAMPLE_DATA = {
  snippet: {
    tenantName: "Beispiel-Mandant",
    supportEmail: "support@beispiel.de",
    customerName: "Max Mustermann",
    currentDate: new Date().toLocaleDateString("de-DE"),
    customerContact: SAMPLE_CUSTOMER_CONTACT,
  },
  genericMail: {
    content:
      "<p>Dies ist der Inhalt der E-Mail. Er wird im Mail-Layout angezeigt.</p>",
    tenantName: "Beispiel-Mandant",
    supportEmail: "support@beispiel.de",
    customerName: "Max Mustermann",
    currentDate: new Date().toLocaleDateString("de-DE"),
    customerContact: SAMPLE_CUSTOMER_CONTACT,
  },
  receipt: {
    isAggregated: false,
    receiptNumber: "B-2026-000123",
    bookingDate: "20.05.2026",
    receiptAddress: SAMPLE_RECEIPT_ADDRESS,
    bookingEntries: SAMPLE_BOOKING_ENTRIES,
    booking: PDF_SAMPLE_BOOKING,
    bookings: PDF_SAMPLE_BOOKINGS,
    items: PDF_SAMPLE_ITEMS,
    coupon: null,
    totals: PDF_SAMPLE_TOTALS,
  },
  invoice: {
    title: "Ihre Rechnung",
    invoiceNumber: "R-2026-000123",
    invoiceDate: "20.05.2026",
    bookingDate: "18.05.2026",
    bookingId: "BK-987654",
    bookingPeriod: "21.05.2026, 10:00 - 21.05.2026, 12:00",
    daysUntilPaymentDue: 14,
    purposeOfPayment: "R-2026-000123 Tagungsraum-Buchung",
    bank: "Sparkasse Musterstadt",
    iban: "DE12 3456 7890 1234 5678 90",
    bic: "MUSTDEXXXXX",
    location: "Musterstadt",
    totalAmount: "120,00",
    invoiceAddress: SAMPLE_INVOICE_ADDRESS,
    mainContent: SAMPLE_INVOICE_MAIN_CONTENT,
    booking: PDF_SAMPLE_BOOKING,
    bookings: PDF_SAMPLE_BOOKINGS,
    items: PDF_SAMPLE_ITEMS,
    coupon: null,
    totals: PDF_SAMPLE_TOTALS,
  },
  cancellation: {
    title: "Stornorechnung",
    cancellationNumber: "S-2026-000007",
    originalInvoiceNumber: "R-2026-000123",
    originalInvoiceDate: "18.05.2026",
    cancellationDate: "20.05.2026, 14:32",
    cancellationReason: "Kunde hat Buchung widerrufen",
    alreadyPaid: true,
    daysBeforeStart: 20,
    daysBeforeStartLabel: "20",
    suggestedRefundPercentage: 100,
    refundPercentage: 100,
    appliedTierDays: 20,
    calculationMode: "Automatisch nach Mandantenregel",
    adminOverride: false,
    isFullRefund: true,
    hasCancellationFee: false,
    refundAmount: "120,00 €",
    cancellationFee: "0,00 €",
    location: "Musterstadt",
    totalAmount: "-120,00 €",
    bookingId: "BK-987654",
    invoiceAddress: SAMPLE_INVOICE_ADDRESS,
    mainContent: SAMPLE_CANCELLATION_MAIN_CONTENT,
    customerBankDetails:
      '<div class="information customer-bank-details">\n' +
      "        <strong>Bankverbindung für die Rückerstattung:</strong><br />\n" +
      "        Kontoinhaber: Max Mustermann<br />\n" +
      "        Sparkasse Musterstadt<br />\n" +
      "        IBAN: DE12 3456 7890 1234 5678 90<br />\n" +
      "        BIC: MUSTDEXXXXX\n" +
      "      </div>",
    booking: PDF_SAMPLE_BOOKING_NEGATIVE,
    bookings: PDF_SAMPLE_BOOKINGS_NEGATIVE,
    items: PDF_SAMPLE_ITEMS_NEGATIVE,
    coupon: null,
    totals: PDF_SAMPLE_TOTALS_NEGATIVE,
  },
};

export function getVariablesForContext(context) {
  switch (context) {
    case "snippet":
      return SNIPPET_VARIABLES;
    case "genericMail":
      return GENERIC_MAIL_VARIABLES;
    case "receipt":
      return RECEIPT_VARIABLES;
    case "invoice":
      return INVOICE_VARIABLES;
    case "cancellation":
      return CANCELLATION_VARIABLES;
    default:
      return [];
  }
}

export function getSampleDataForContext(context) {
  return SAMPLE_DATA[context] || {};
}
