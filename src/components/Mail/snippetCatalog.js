import { cryptoRandomId } from "./BlockEditor/render/renderBlocksToHtml.js";

export const SNIPPET_KEYS = [
  "booking-confirmation",
  "free-booking-confirmation",
  "booking-request-confirmation",
  "booking-confirmed-invoice-pending",
  "booking-cancel",
  "booking-rejection",
  "invoice",
  "invoice-after-approval",
  "payment-link-after-approval",
];


function v(name, label) {
  return (
    `<span data-variable="${name}" data-triple="false" ` +
    `data-label="${label}" class="mail-variable-chip" contenteditable="false">` +
    `{{${name}}}</span>`
  );
}

function txt(html) {
  return { type: "text", align: "left", html };
}

function row(blocks) {
  return {
    type: "row",
    columns: [{ width: 12, blocks }],
  };
}

const TENANT = v("tenantName", "Mandant");

export const SNIPPET_CATALOG = [
  {
    key: "booking-confirmation",
    title: "Buchungsbestätigung",
    description: "Bestätigung nach erfolgreicher (kostenpflichtiger) Buchung.",
    icon: "mdi-check-circle-outline",
    defaultTemplate: `<div style="font-family: sans-serif;">
  <p>
    Hallo,<br />
    vielen Dank für Ihre Buchung im
    <strong>{{tenantName}}</strong>.
  </p>
  <p>
    Im Folgenden senden wir Ihnen die Details Ihrer Buchung.
  </p>
  <br />
</div>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Hallo,<br />vielen Dank für Ihre Buchung im <strong>${TENANT}</strong>.</p>`
        ),
        txt("<p>Im Folgenden senden wir Ihnen die Details Ihrer Buchung.</p>"),
      ]),
    ],
  },
  {
    key: "free-booking-confirmation",
    title: "Bestätigung kostenfreier Buchung",
    description: "Bestätigung nach kostenfreier Buchung.",
    icon: "mdi-check-circle-outline",
    defaultTemplate: `<div style="font-family: sans-serif;">
  <p>
    Hallo,<br />
    vielen Dank für Ihre kostenfreie Buchung im
    <strong>{{tenantName}}</strong>.
  </p>
</div>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Hallo,<br />vielen Dank für Ihre kostenfreie Buchung im <strong>${TENANT}</strong>.</p>`
        ),
      ]),
    ],
  },
  {
    key: "booking-request-confirmation",
    title: "Empfangsbestätigung Buchungsanfrage",
    description:
      "Empfangsbestätigung einer Buchungsanfrage (noch nicht freigegeben).",
    icon: "mdi-email-arrow-left-outline",
    defaultTemplate: `<div style="font-family: sans-serif;">
  <p>
    Hallo,<br />
    vielen Dank für Ihre Buchungsanfrage im
    <strong>{{tenantName}}</strong>.
  </p>

  <p>
    Ihre Buchungsanfrage ist bei uns eingegangen und wird derzeit zur Freigabe
    geprüft.
  </p>

  <p>
    Sobald Ihre Anfrage freigegeben wurde, erhalten Sie eine Benachrichtigung
    von uns.
  </p>
</div>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Hallo,<br />vielen Dank für Ihre Buchungsanfrage im <strong>${TENANT}</strong>.</p>`
        ),
        txt(
          "<p>Ihre Buchungsanfrage ist bei uns eingegangen und wird derzeit zur Freigabe geprüft.</p>"
        ),
        txt(
          "<p>Sobald Ihre Anfrage freigegeben wurde, erhalten Sie eine Benachrichtigung von uns.</p>"
        ),
      ]),
    ],
  },
  {
    key: "booking-confirmed-invoice-pending",
    title: "Buchung bestätigt – Rechnung folgt",
    description: "Buchung bestätigt, Rechnung folgt separat.",
    icon: "mdi-file-clock-outline",
    defaultTemplate: `<p>
  Hallo,<br />
  vielen Dank für Ihre Buchung bei
  <strong>{{tenantName}}</strong>.
</p>

<p>
  Ihre Buchung wurde erfolgreich bestätigt. Eine Rechnung wird Ihnen in separat
  zugestellt.
</p>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Hallo,<br />vielen Dank für Ihre Buchung bei <strong>${TENANT}</strong>.</p>`
        ),
        txt(
          "<p>Ihre Buchung wurde erfolgreich bestätigt. Eine Rechnung wird Ihnen separat zugestellt.</p>"
        ),
      ]),
    ],
  },
  {
    key: "booking-cancel",
    title: "Stornierungsmitteilung",
    description: "Stornierungsmitteilung an den Buchenden.",
    icon: "mdi-cancel",
    defaultTemplate: "<p>Die nachfolgende Buchung wurde storniert:</p>",
    defaultBlocks: [
      row([txt("<p>Die nachfolgende Buchung wurde storniert:</p>")]),
    ],
  },
  {
    key: "booking-rejection",
    title: "Ablehnungsmitteilung",
    description: "Ablehnungsmitteilung einer Buchungsanfrage.",
    icon: "mdi-close-circle-outline",
    defaultTemplate: "<p>Die nachfolgende Buchung wurde abgelehnt:</p>",
    defaultBlocks: [
      row([txt("<p>Die nachfolgende Buchung wurde abgelehnt:</p>")]),
    ],
  },
  {
    key: "invoice",
    title: "Rechnungs-Mail",
    description: "Rechnungs-Mail (Rechnung als Anhang).",
    icon: "mdi-file-document-outline",
    defaultTemplate: `<p>
  Hallo,<br />
  vielen Dank für Ihre Buchung bei
  <strong>{{tenantName}}</strong>.
</p>

<p>
  Bitte überweisen Sie zur Vervollständigung Ihrer Buchung den im Anhang
  aufgeführten Betrag auf das angegebene Konto.
</p>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Hallo,<br />vielen Dank für Ihre Buchung bei <strong>${TENANT}</strong>.</p>`
        ),
        txt(
          "<p>Bitte überweisen Sie zur Vervollständigung Ihrer Buchung den im Anhang aufgeführten Betrag auf das angegebene Konto.</p>"
        ),
      ]),
    ],
  },
  {
    key: "invoice-after-approval",
    title: "Rechnungs-Mail nach Freigabe",
    description: "Rechnungs-Mail nach Freigabe einer Anfrage.",
    icon: "mdi-file-check-outline",
    defaultTemplate: `<p>
  Vielen Dank für Ihre Buchungsanfrage im
  <strong>{{tenantName}}</strong>. Wir haben diese erfolgreich geprüft und
  freigegeben.
</p>

<p>
  Bitte überweisen Sie zur Vervollständigung Ihrer Buchung den im Anhang
  aufgeführten Betrag auf das angegebene Konto.
</p>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Vielen Dank für Ihre Buchungsanfrage im <strong>${TENANT}</strong>. Wir haben diese erfolgreich geprüft und freigegeben.</p>`
        ),
        txt(
          "<p>Bitte überweisen Sie zur Vervollständigung Ihrer Buchung den im Anhang aufgeführten Betrag auf das angegebene Konto.</p>"
        ),
      ]),
    ],
  },
  {
    key: "payment-link-after-approval",
    title: "Zahlungslink nach Freigabe",
    description: "Mail mit dem Link zum Online-Bezahlvorgang.",
    icon: "mdi-credit-card-outline",
    defaultTemplate: `<p>
  Vielen Dank für Ihre Buchungsanfrage im
  <strong>{{tenantName}}</strong>. Wir haben Ihre Anfrage geprüft und
  freigegeben.
</p>

<p>
  Um Ihre Buchung verbindlich abzuschließen, klicken Sie bitte auf den
  nachfolgenden Knopf und folgen Sie den weiteren Schritten.
</p>`,
    defaultBlocks: [
      row([
        txt(
          `<p>Vielen Dank für Ihre Buchungsanfrage im <strong>${TENANT}</strong>. Wir haben Ihre Anfrage geprüft und freigegeben.</p>`
        ),
        txt(
          "<p>Um Ihre Buchung verbindlich abzuschließen, klicken Sie bitte auf den nachfolgenden Knopf und folgen Sie den weiteren Schritten.</p>"
        ),
      ]),
    ],
  },
];

export function getSnippetCatalogEntry(key) {
  return SNIPPET_CATALOG.find((s) => s.key === key);
}

export function getSnippetDefault(key) {
  const entry = getSnippetCatalogEntry(key);
  return entry ? entry.defaultTemplate : "";
}

export function buildSnippetDefaultBlocks(key) {
  const entry = getSnippetCatalogEntry(key);
  if (!entry || !Array.isArray(entry.defaultBlocks)) return [];

  return entry.defaultBlocks.map((rowTpl) => ({
    id: cryptoRandomId(),
    type: rowTpl.type || "row",
    columns: (rowTpl.columns || []).map((col) => ({
      width: col.width,
      blocks: (col.blocks || []).map((b) => ({
        ...b,
        id: cryptoRandomId(),
      })),
    })),
  }));
}

export const MAX_SNIPPET_SIZE_BYTES = 50 * 1024;
export const SOFT_WARN_SIZE_BYTES = 40 * 1024;
export const MAX_SUBJECT_LENGTH = 500;
