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
    placeholder: "{{#if isAggregated}} … {{else}} … {{/if}}",
    label: "Sammelbeleg-Bedingung",
    description:
      "Bedingte Anweisung, die angibt, ob es sich um eine Sammelbuchung handelt",
  },
  {
    name: "bookingEntries",
    placeholder: "{{{bookingEntries}}}",
    label: "Buchungstabelle",
    description: "HTML-Tabelle mit Details der gebuchten Objekte",
  },
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
];

export const CANCELLATION_VARIABLES = [
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
    description: "Datum der Stornierung",
  },
  {
    name: "invoiceAddress",
    placeholder: "{{{invoiceAddress}}}",
    label: "Kundenadresse",
    description: "Adresse des Kunden",
  },
  {
    name: "refundReference",
    placeholder: "{{refundReference}}",
    label: "Erstattungs-Referenz",
    description: "Referenz für die Erstattung",
  },
  {
    name: "refundMethod",
    placeholder: "{{refundMethod}}",
    label: "Erstattungsweg",
    description: "Erstattungsmethode",
  },
  {
    name: "refundAmount",
    placeholder: "{{refundAmount}}",
    label: "Erstattungsbetrag",
    description: "Erstattungsbetrag",
  },
  {
    name: "refundDate",
    placeholder: "{{refundDate}}",
    label: "Erstattungsdatum",
    description: "Voraussichtliches Erstattungsdatum",
  },
  {
    name: "cancellationReason",
    placeholder: "{{cancellationReason}}",
    label: "Stornogrund",
    description: "Grund der Stornierung",
  },
  {
    name: "alreadyPaid",
    placeholder: "{{#if alreadyPaid}} … {{else}} … {{/if}}",
    label: "Bereits bezahlt (Bedingung)",
    description:
      "Steuert, ob Erstattungs- oder Storno-ohne-Zahlung-Hinweis angezeigt wird",
  },
  {
    name: "mainContent",
    placeholder: "{{{mainContent}}}",
    label: "Positionstabelle",
    description: "Stornierte Positionen (HTML)",
  },
  {
    name: "totalAmount",
    placeholder: "{{totalAmount}}",
    label: "Gesamt-Stornobetrag",
    description: "Aufsummierter Stornobetrag",
  },
];


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

export const SAMPLE_DATA = {
  snippet: {
    tenantName: "Beispiel-Mandant",
    supportEmail: "support@beispiel.de",
  },
  genericMail: {
    content:
      "<p>Dies ist der Inhalt der E-Mail. Er wird im Mail-Layout angezeigt.</p>",
    tenantName: "Beispiel-Mandant",
    supportEmail: "support@beispiel.de",
  },
  receipt: {
    isAggregated: false,
    receiptNumber: "B-2026-000123",
    bookingDate: "20.05.2026",
    receiptAddress: SAMPLE_RECEIPT_ADDRESS,
    bookingEntries: SAMPLE_BOOKING_ENTRIES,
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
  },
  cancellation: {
    title: "Stornorechnung",
    cancellationNumber: "S-2026-000007",
    originalInvoiceNumber: "R-2026-000123",
    originalInvoiceDate: "18.05.2026",
    cancellationDate: "20.05.2026",
    cancellationReason: "Kunde hat Buchung widerrufen",
    alreadyPaid: true,
    refundAmount: "120,00 €",
    refundMethod: "Kreditkarte",
    refundDate: "22.05.2026",
    refundReference: "REF-998877",
    location: "Musterstadt",
    totalAmount: "-120,00 €",
    bookingId: "BK-987654",
    invoiceAddress: SAMPLE_INVOICE_ADDRESS,
    mainContent: SAMPLE_CANCELLATION_MAIN_CONTENT,
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
