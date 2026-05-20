import {
  RECEIPT_VARIABLES,
  INVOICE_VARIABLES,
  CANCELLATION_VARIABLES,
  SAMPLE_DATA,
} from "@/components/Mail/templateVariables.js";

const COMMON_STYLES = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #222; font-size: 14px; line-height: 1.5; padding: 1cm; }
      h1, h2, h3 { color: #1976d2; }
      table { border-collapse: collapse; }
      .meta { text-align: right; font-size: 12px; color: #666; margin-bottom: 16px; }
      .info-box { padding: 12px; background: #f9f9f9; border-radius: 4px; margin: 12px 0; }
      .booking-detail, .booked-items { width: 100%; }
      .booking-detail td, .booking-detail th,
      .booked-items td, .booked-items th { padding: 8px; border-bottom: 1px solid #ddd; }
`;

function buildDocument(title, bodyHtml) {
  return (
    "<!doctype html>\n" +
    "<html lang=\"de\">\n" +
    "  <head>\n" +
    "    <meta charset=\"utf-8\" />\n" +
    `    <title>${title}</title>\n` +
    "    <style>" +
    COMMON_STYLES +
    "    </style>\n" +
    "  </head>\n" +
    "  <body>\n" +
    (bodyHtml || "") +
    "\n  </body>\n" +
    "</html>\n"
  );
}

function chip(name, label, triple = false) {
  const wrapper = triple ? `{{{${name}}}}` : `{{${name}}}`;
  const safeLabel = String(label || name).replace(/"/g, "&quot;");
  return (
    `<span data-variable="${name}" data-triple="${triple ? "true" : "false"}" ` +
    `data-label="${safeLabel}" class="mail-variable-chip" contenteditable="false">${wrapper}</span>`
  );
}

function makeReceiptDefaultBlocks() {
  return [
    {
      type: "row",
      columns: [
        {
          width: 12,
          blocks: [
            {
              type: "text",
              html:
                `<p>Belegnummer: ${chip("receiptNumber", "Belegnummer")}<br />` +
                `Buchungsdatum: ${chip("bookingDate", "Buchungsdatum")}</p>`,
              align: "left",
            },
            {
              type: "rawHtml",
              html: "<p>{{{receiptAddress}}}</p>",
            },
            {
              type: "heading",
              text: "Ihr Zahlungsbeleg",
              level: 1,
              align: "left",
            },
            {
              type: "text",
              html:
                "<p>{{#if isAggregated}}Hiermit bestätigen wir den vollständigen Zahlungseingang für die folgenden Buchungen:" +
                "{{else}}Hiermit bestätigen wir Ihre Buchung sowie den vollständigen Zahlungseingang für die folgenden Buchungsdaten:{{/if}}</p>",
              align: "left",
            },
            {
              type: "rawHtml",
              html: "{{{bookingEntries}}}",
            },
            {
              type: "text",
              html:
                "<p style=\"color:#888;font-size:12px;\">Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig.</p>",
              align: "left",
            },
          ],
        },
      ],
    },
  ];
}

function makeInvoiceDefaultBlocks() {
  return [
    {
      type: "row",
      columns: [
        {
          width: 12,
          blocks: [
            {
              type: "rawHtml",
              html:
                "<div class=\"meta\">Rechnungsnummer: {{invoiceNumber}}<br />{{location}}, {{invoiceDate}}</div>",
            },
            {
              type: "rawHtml",
              html: "<div>{{{invoiceAddress}}}</div>",
            },
            {
              type: "heading",
              text: "Ihre Rechnung",
              level: 1,
              align: "left",
            },
            {
              type: "text",
              html:
                "<p>Sehr geehrte Damen und Herren,<br />" +
                `vielen Dank für Ihre Buchung. Bitte überweisen Sie den Betrag innerhalb von ${chip("daysUntilPaymentDue", "Zahlungsfrist (Tage)")} Tagen ` +
                `mit dem Verwendungszweck <strong>${chip("purposeOfPayment", "Verwendungszweck")}</strong> ` +
                "auf folgendes Konto:</p>",
              align: "left",
            },
            {
              type: "callout",
              variant: "info",
              title: "Bankverbindung",
              html:
                "<p>{{bank}}<br />IBAN: {{iban}}<br />BIC: {{bic}}</p>",
            },
            {
              type: "text",
              html:
                `<p>Buchungsnummer: ${chip("bookingId", "Buchungs-ID")}<br />` +
                `Zeitraum: ${chip("bookingPeriod", "Buchungszeitraum")}</p>`,
              align: "left",
            },
            {
              type: "rawHtml",
              html: "{{{mainContent}}}",
            },
            {
              type: "text",
              html:
                `<p><strong>Gesamtbetrag: ${chip("totalAmount", "Gesamtbetrag")} €</strong></p>`,
              align: "right",
            },
            {
              type: "text",
              html:
                "<p style=\"color:#888;font-size:12px;\">Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig.</p>",
              align: "left",
            },
          ],
        },
      ],
    },
  ];
}

function makeCancellationDefaultBlocks() {
  return [
    {
      type: "row",
      columns: [
        {
          width: 12,
          blocks: [
            {
              type: "rawHtml",
              html:
                "<div class=\"meta\">Stornobelegnummer: {{cancellationNumber}}<br />" +
                "Ursprüngliche Rechnungsnummer: {{originalInvoiceNumber}}<br />" +
                "{{location}}, {{cancellationDate}}</div>",
            },
            {
              type: "rawHtml",
              html: "<div>{{{invoiceAddress}}}</div>",
            },
            {
              type: "heading",
              text: "Stornorechnung",
              level: 1,
              align: "left",
            },
            {
              type: "text",
              html:
                `<p>Hiermit stornieren wir die Rechnung <strong>${chip("originalInvoiceNumber", "Original-Rechnungsnummer")}</strong> ` +
                `vom ${chip("originalInvoiceDate", "Original-Rechnungsdatum")}.</p>`,
              align: "left",
            },
            {
              type: "rawHtml",
              html:
                "{{#if cancellationReason}}<p><strong>Grund:</strong> {{cancellationReason}}</p>{{/if}}",
            },
            {
              type: "rawHtml",
              html:
                "{{#if alreadyPaid}}" +
                "<p>Der bereits gezahlte Betrag in Höhe von <strong>{{refundAmount}}</strong> wird Ihnen per {{refundMethod}} erstattet." +
                "{{#if refundDate}}<br />Voraussichtliches Erstattungsdatum: {{refundDate}}{{/if}}" +
                "{{#if refundReference}}<br />Referenz: {{refundReference}}{{/if}}</p>" +
                "{{else}}" +
                "<p>Sofern noch keine Zahlung erfolgt ist, entfällt die Zahlungsverpflichtung aus der ursprünglichen Rechnung.</p>" +
                "{{/if}}",
            },
            {
              type: "rawHtml",
              html: "{{{mainContent}}}",
            },
            {
              type: "rawHtml",
              html:
                "{{#if showBankDetails}}" +
                "<div class=\"info-box\"><strong>Unsere Bankverbindung für Rückfragen:</strong><br />" +
                "{{bank}}<br />IBAN: {{iban}}<br />BIC: {{bic}}</div>" +
                "{{/if}}",
            },
            {
              type: "text",
              html:
                `<p><strong>Gesamt-Stornobetrag: ${chip("totalAmount", "Gesamt-Stornobetrag")}</strong></p>`,
              align: "right",
            },
            {
              type: "text",
              html:
                "<p style=\"color:#888;font-size:12px;\">Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig.</p>",
              align: "left",
            },
          ],
        },
      ],
    },
  ];
}

export const PDF_TEMPLATE_CATALOG = {
  receipt: {
    key: "receipt",
    title: "Zahlungsbeleg-Vorlage",
    description:
      "Vorlage für Einzel- und Sammelbelege. Pflichtvariablen: {{receiptNumber}}, {{bookingDate}}, {{{receiptAddress}}}, {{{bookingEntries}}}.",
    icon: "mdi-receipt-text-outline",
    variables: RECEIPT_VARIABLES,
    sampleData: SAMPLE_DATA.receipt,
    requiredVariables: ["{{{bookingEntries}}}", "{{{receiptAddress}}}"],
    documentTitle: "Ihr Zahlungsbeleg",
    buildDocument(bodyHtml) {
      return buildDocument("Ihr Zahlungsbeleg", bodyHtml);
    },
    defaultBlocks: makeReceiptDefaultBlocks,
  },
  invoice: {
    key: "invoice",
    title: "Rechnungsvorlage",
    description:
      "Vorlage für Einzel- und Sammelrechnungen. Pflichtvariablen: {{invoiceNumber}}, {{{invoiceAddress}}}, {{{mainContent}}}.",
    icon: "mdi-file-document-outline",
    variables: INVOICE_VARIABLES,
    sampleData: SAMPLE_DATA.invoice,
    requiredVariables: ["{{{mainContent}}}", "{{{invoiceAddress}}}"],
    documentTitle: "Rechnung {{invoiceNumber}}",
    buildDocument(bodyHtml) {
      return buildDocument("Rechnung {{invoiceNumber}}", bodyHtml);
    },
    defaultBlocks: makeInvoiceDefaultBlocks,
  },
  cancellation: {
    key: "cancellation",
    title: "Stornorechnungs-Vorlage",
    description:
      "Vorlage für Einzel- und Sammel-Stornorechnungen. Pflichtvariablen: {{cancellationNumber}}, {{{invoiceAddress}}}, {{{mainContent}}}.",
    icon: "mdi-receipt-text-remove-outline",
    variables: CANCELLATION_VARIABLES,
    sampleData: SAMPLE_DATA.cancellation,
    requiredVariables: ["{{{mainContent}}}", "{{{invoiceAddress}}}"],
    documentTitle: "Stornorechnung {{cancellationNumber}}",
    buildDocument(bodyHtml) {
      return buildDocument("Stornorechnung {{cancellationNumber}}", bodyHtml);
    },
    defaultBlocks: makeCancellationDefaultBlocks,
  },
};

export function getPdfTemplateCatalogEntry(type) {
  return PDF_TEMPLATE_CATALOG[type] || null;
}

export function isValidPdfTemplate(html) {
  if (!html) return false;
  const s = String(html);
  return (
    /<!DOCTYPE\s+html>/i.test(s) &&
    /<html[\s>]/i.test(s) &&
    /<\/html>/i.test(s) &&
    /<head[\s>]/i.test(s) &&
    /<\/head>/i.test(s) &&
    /<body[\s>]/i.test(s) &&
    /<\/body>/i.test(s)
  );
}

export function findMissingRequiredVariables(html, requiredVariables) {
  const text = String(html || "");
  const result = [];
  (requiredVariables || []).forEach((placeholder) => {
    const name = String(placeholder)
      .replace(/^[{\s]+|[}\s]+$/g, "")
      .trim();
    if (!name) return;
    const re = new RegExp(
      `\\{\\{\\{?\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}?\\}\\}`,
    );
    if (!re.test(text)) result.push(placeholder);
  });
  return result;
}

export const MAX_PDF_TEMPLATE_SIZE_BYTES = 200 * 1024;
