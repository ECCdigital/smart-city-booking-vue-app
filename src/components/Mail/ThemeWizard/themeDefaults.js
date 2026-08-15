export const FONT_FAMILY_MAP = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  serif: "'Times New Roman', Georgia, serif",
  sans: "'Work Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

export const PRESETS = [
  { value: "classic", text: "Klassisch" },
  { value: "modern", text: "Modern" },
  { value: "minimal", text: "Minimal" },
];

export const FONT_OPTIONS = [
  { value: "system", text: "System (Standard)" },
  { value: "arial", text: "Arial" },
  { value: "sans", text: "Sans Serif" },
  { value: "serif", text: "Serif" },
  { value: "mono", text: "Monospace" },
];

export const DEFAULT_THEMES = {
  genericMailTemplate: {
    preset: "modern",
    logoUrl: "",
    primaryColor: "#1976d2",
    textColor: "#222222",
    backgroundColor: "#f5f5f5",
    fontFamily: "system",
    headerHtml: "",
    footerHtml: "",
    options: {
      wrapperWidth: 600,
      wrapperShadow: true,
      logoMaxWidth: 200,
    },
  },
  receiptTemplate: {
    preset: "classic",
    logoUrl: "",
    primaryColor: "#1976d2",
    textColor: "#222222",
    backgroundColor: "#ffffff",
    fontFamily: "sans",
    headerHtml: "",
    footerHtml:
      "Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig.",
    options: {
      title: "Ihr Zahlungsbeleg",
      showRecipientTopRight: true,
    },
  },
  invoiceTemplate: {
    preset: "classic",
    logoUrl: "",
    primaryColor: "#1976d2",
    textColor: "#222222",
    backgroundColor: "#ffffff",
    fontFamily: "sans",
    headerHtml: "Smart City Booking",
    footerHtml:
      "Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig.",
    options: {
      city: "",
      greeting:
        "Sehr geehrte Damen und Herren,\nvielen Dank für Ihre Buchung bei {{tenantName}}.",
      showPaymentDeadline: true,
      showBankDetails: true,
    },
  },
  cancellationTemplate: {
    preset: "classic",
    logoUrl: "",
    primaryColor: "#c0392b",
    textColor: "#222222",
    backgroundColor: "#ffffff",
    fontFamily: "sans",
    headerHtml: "Smart City Booking",
    footerHtml:
      "Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig.",
    options: {
      title: "Stornorechnung",
      showBankDetails: true,
      showRefundBlock: true,
    },
  },
};

export function getDefaultTheme(templateType) {
  return JSON.parse(JSON.stringify(DEFAULT_THEMES[templateType] || {}));
}
