import {
  RECEIPT_VARIABLES,
  INVOICE_VARIABLES,
  CANCELLATION_VARIABLES,
  SAMPLE_DATA,
} from "@/components/Mail/templateVariables.js";
import { PDF_ITEMS_PREVIEW_CSS } from "@/components/PDF/pdfPreviewStyles.js";

const COMMON_STYLES = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #222; font-size: 14px; line-height: 1.5; padding: 1cm; }
      h1, h2, h3 { color: #1976d2; }
      table { border-collapse: collapse; }
      .meta { text-align: right; font-size: 12px; color: #666; margin-bottom: 16px; }
      .info-box { padding: 12px; background: #f9f9f9; border-radius: 4px; margin: 12px 0; }
      .booking-detail, .booked-items { width: 100%; }
      .booking-detail td, .booking-detail th,
      .booked-items td, .booked-items th { padding: 8px; border-bottom: 1px solid #ddd; }
      ${PDF_ITEMS_PREVIEW_CSS}
`;

// Chromium vererbt keine Dokument-Styles in PDF-Kopf-/Fußzeilen, daher
// braucht der Wrapper Inline-Styles inkl. font-size.
const PAGE_TEMPLATE_WRAPPER_STYLE =
  "width: 100%; font-size: 8px; color: #666; padding: 0 10mm;";

function buildPageTemplate(kind, innerHtml) {
  const content = String(innerHtml || "").trim();
  if (!content) return "";
  return (
    `    <template data-pdf-${kind}>\n` +
    `      <div data-pdf-wrapper style="${PAGE_TEMPLATE_WRAPPER_STYLE}">\n` +
    `        ${content}\n` +
    "      </div>\n" +
    "    </template>\n"
  );
}

function buildDocument(title, bodyHtml, pageTemplates = {}) {
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
    buildPageTemplate("header", pageTemplates.headerHtml) +
    buildPageTemplate("footer", pageTemplates.footerHtml) +
    (bodyHtml || "") +
    "\n  </body>\n" +
    "</html>\n"
  );
}

function makeDefaultPageFooter(documentLabel) {
  return (
    "<div style=\"display: flex; justify-content: space-between\">" +
    `<span>${documentLabel}</span>` +
    "<span>Seite <span class=\"pageNumber\"></span> von " +
    "<span class=\"totalPages\"></span></span>" +
    "</div>"
  );
}

/**
 * Löst `<template data-pdf-header>` / `<template data-pdf-footer>` aus einem
 * kompletten Template-Dokument heraus. Ein von buildPageTemplate erzeugter
 * Wrapper (`div[data-pdf-wrapper]`) wird dabei wieder entfernt, damit der
 * Feldinhalt über Speichern/Laden-Zyklen stabil bleibt.
 */
export function extractPdfPageTemplates(html) {
  const result = { headerHtml: "", footerHtml: "" };
  const text = String(html || "");
  if (!text || typeof DOMParser === "undefined") return result;
  try {
    const doc = new DOMParser().parseFromString(text, "text/html");
    const read = (selector) => {
      const el = doc.querySelector(selector);
      if (!el) return "";
      const content = el.content || el;
      const children = content.children || [];
      if (
        children.length === 1 &&
        children[0].hasAttribute &&
        children[0].hasAttribute("data-pdf-wrapper")
      ) {
        return children[0].innerHTML.trim();
      }
      return el.innerHTML.trim();
    };
    result.headerHtml = read("template[data-pdf-header]");
    result.footerHtml = read("template[data-pdf-footer]");
  } catch (_) {
    // Kein valides HTML – Felder bleiben leer, das Dokument selbst bleibt unangetastet.
  }
  return result;
}

/**
 * Ersetzt vorhandene `<template data-pdf-header/footer>`-Elemente durch die
 * übergebenen Feldwerte (oder entfernt sie, wenn leer).
 */
export function applyPdfPageTemplates(html, pageTemplates = {}) {
  const text = String(html || "");
  if (!text) return text;

  const headerHtml = String(pageTemplates.headerHtml || "").trim();
  const footerHtml = String(pageTemplates.footerHtml || "").trim();

  const stripped = text
    .replace(/<template\s+data-pdf-header\b[^>]*>[\s\S]*?<\/template>\s*/gi, "")
    .replace(/<template\s+data-pdf-footer\b[^>]*>[\s\S]*?<\/template>\s*/gi, "");

  if (!headerHtml && !footerHtml) {
    return stripped;
  }

  const injection =
    buildPageTemplate("header", headerHtml) +
    buildPageTemplate("footer", footerHtml);

  const bodyMatch = stripped.match(/<body[^>]*>/i);
  if (!bodyMatch) return stripped;
  const insertAt = bodyMatch.index + bodyMatch[0].length;
  return stripped.slice(0, insertAt) + "\n" + injection + stripped.slice(insertAt);
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
                "{{#if customerBankDetails}}{{{customerBankDetails}}}{{/if}}" +
                "{{/if}}" +
                "{{#unless alreadyPaid}}" +
                "<p>Sofern noch keine Zahlung erfolgt ist, entfällt die Zahlungsverpflichtung aus der ursprünglichen Rechnung.</p>" +
                "{{/unless}}",
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
      "Vorlage für Einzel- und Sammelbelege. Pflichtvariablen: {{receiptNumber}}, {{bookingDate}}, {{{receiptAddress}}} sowie {{{bookingEntries}}} oder ein Tabellen-Partial ({{> pdfBookingItemsTable}} / {{> pdfAggregatedReceiptTable}}).",
    icon: "mdi-receipt-text-outline",
    variables: RECEIPT_VARIABLES,
    sampleData: SAMPLE_DATA.receipt,
    requiredVariables: [
      {
        label: "{{{bookingEntries}}}",
        variables: ["bookingEntries"],
        partials: ["pdfBookingItemsTable", "pdfAggregatedReceiptTable"],
      },
      { label: "{{{receiptAddress}}}", variables: ["receiptAddress"] },
    ],
    documentTitle: "Ihr Zahlungsbeleg",
    buildDocument(bodyHtml, pageTemplates) {
      return buildDocument("Ihr Zahlungsbeleg", bodyHtml, pageTemplates || {});
    },
    defaultPageTemplates() {
      return {
        headerHtml: "",
        footerHtml: makeDefaultPageFooter("Zahlungsbeleg {{receiptNumber}}"),
      };
    },
    defaultBlocks: makeReceiptDefaultBlocks,
  },
  invoice: {
    key: "invoice",
    title: "Rechnungsvorlage",
    description:
      "Vorlage für Einzel- und Sammelrechnungen. Pflichtvariablen: {{invoiceNumber}}, {{{invoiceAddress}}} sowie {{{mainContent}}} oder ein Tabellen-Partial ({{> pdfBookingItemsTable}} / {{> pdfAggregatedBookingsTable}}).",
    icon: "mdi-file-document-outline",
    variables: INVOICE_VARIABLES,
    sampleData: SAMPLE_DATA.invoice,
    requiredVariables: [
      {
        label: "{{{mainContent}}}",
        variables: ["mainContent"],
        partials: ["pdfBookingItemsTable", "pdfAggregatedBookingsTable"],
      },
      { label: "{{{invoiceAddress}}}", variables: ["invoiceAddress"] },
    ],
    documentTitle: "Rechnung {{invoiceNumber}}",
    buildDocument(bodyHtml, pageTemplates) {
      return buildDocument(
        "Rechnung {{invoiceNumber}}",
        bodyHtml,
        pageTemplates || {},
      );
    },
    defaultPageTemplates() {
      return {
        headerHtml: "",
        footerHtml: makeDefaultPageFooter("Rechnung {{invoiceNumber}}"),
      };
    },
    defaultBlocks: makeInvoiceDefaultBlocks,
  },
  cancellation: {
    key: "cancellation",
    title: "Stornorechnungs-Vorlage",
    description:
      "Vorlage für Einzel- und Sammel-Stornorechnungen. Pflichtvariablen: {{cancellationNumber}}, {{{invoiceAddress}}} sowie {{{mainContent}}} oder ein Tabellen-Partial ({{> pdfBookingItemsTable}} / {{> pdfAggregatedBookingsTable}}).",
    icon: "mdi-receipt-text-remove-outline",
    variables: CANCELLATION_VARIABLES,
    sampleData: SAMPLE_DATA.cancellation,
    requiredVariables: [
      {
        label: "{{{mainContent}}}",
        variables: ["mainContent"],
        partials: ["pdfBookingItemsTable", "pdfAggregatedBookingsTable"],
      },
      { label: "{{{invoiceAddress}}}", variables: ["invoiceAddress"] },
    ],
    documentTitle: "Stornorechnung {{cancellationNumber}}",
    buildDocument(bodyHtml, pageTemplates) {
      return buildDocument(
        "Stornorechnung {{cancellationNumber}}",
        bodyHtml,
        pageTemplates || {},
      );
    },
    defaultPageTemplates() {
      return {
        headerHtml: "",
        footerHtml: makeDefaultPageFooter(
          "Stornorechnung {{cancellationNumber}}",
        ),
      };
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function variableRegex(name) {
  return new RegExp(`\\{\\{\\{?\\s*${escapeRegExp(name)}\\s*\\}?\\}\\}`);
}

function partialRegex(name) {
  return new RegExp(`\\{\\{>\\s*${escapeRegExp(name)}\\b`);
}

export function findMissingRequiredVariables(html, requiredVariables) {
  const text = String(html || "");
  const result = [];
  (requiredVariables || []).forEach((requirement) => {
    // Legacy-Format: einfacher Platzhalter-String wie "{{{bookingEntries}}}"
    if (typeof requirement === "string") {
      const name = requirement.replace(/^[{\s]+|[}\s]+$/g, "").trim();
      if (!name) return;
      if (!variableRegex(name).test(text)) result.push(requirement);
      return;
    }
    const satisfied =
      (requirement.variables || []).some((name) =>
        variableRegex(name).test(text),
      ) ||
      (requirement.partials || []).some((name) =>
        partialRegex(name).test(text),
      );
    if (!satisfied) result.push(requirement.label);
  });
  return result;
}

/**
 * Der visuelle Editor (TipTap/contenteditable) escaped Textinhalte beim
 * Serialisieren – aus `{{> partial}}` wird `{{&gt; partial}}`, was Handlebars
 * nicht parsen kann. Diese Funktion dekodiert HTML-Entities (und geschützte
 * Leerzeichen) ausschließlich innerhalb von Mustache-Ausdrücken `{{ … }}`,
 * damit regulär escapter Text außerhalb unangetastet bleibt.
 */
export function decodeHandlebarsEntities(html) {
  return String(html || "").replace(/\{\{[^{}]*\}\}/g, (token) =>
    token
      .replace(/\u00a0/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&quot;/g, "\"")
      .replace(/&#0?39;/g, "'")
      .replace(/&amp;/g, "&"),
  );
}

/**
 * Ersetzt die Variablen-Chips des visuellen Editors
 * (`<span data-variable="…">{{…}}</span>`) durch ihren reinen
 * Handlebars-Inhalt. Das visuelle Modell bleibt über die eingebetteten
 * Block-Metadaten erhalten – das komponierte Dokument (Experten-Ansicht,
 * gespeichertes Template) wird dadurch lesbares, sauberes Handlebars.
 */
export function stripVariableChips(html) {
  return String(html || "").replace(
    /<span[^>]*\bdata-variable\b[^>]*>([\s\S]*?)<\/span>/gi,
    "$1",
  );
}

export function getRequiredVariableLabels(requiredVariables) {
  return (requiredVariables || []).map((requirement) =>
    typeof requirement === "string" ? requirement : requirement.label,
  );
}

export const MAX_PDF_TEMPLATE_SIZE_BYTES = 200 * 1024;
