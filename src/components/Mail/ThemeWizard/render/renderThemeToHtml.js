import { FONT_FAMILY_MAP } from "../themeDefaults.js";

/**
 * TipTap serializes blank lines as empty <p></p>, which collapse in email
 * clients. Keep a <br> so blank lines remain visible.
 */
function ensureVisibleEmptyParagraphs(html) {
  if (!html) return html;
  return String(html).replace(
    /<p(\s[^>]*)?>\s*(?:<br\s*\/?>\s*)*<\/p>/gi,
    (match, attrs = "") => `<p${attrs}><br></p>`,
  );
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Make remote images recognizable when email clients block them:
 * ensure alt/title text and styles that many clients use as placeholder.
 */
function enhanceEmailImages(html) {
  if (!html) return html;
  return String(html).replace(/<img\b([^>]*)\/?>/gi, (full, rawAttrs) => {
    let attrs = rawAttrs;

    let altMatch = attrs.match(/\balt\s*=\s*"([^"]*)"/i);
    let alt = altMatch ? altMatch[1].trim() : "";
    if (!alt) {
      alt = "Bild";
      if (/\balt\s*=/i.test(attrs)) {
        attrs = attrs.replace(
          /\balt\s*=\s*"[^"]*"/i,
          `alt="${escapeHtmlAttr(alt)}"`,
        );
      } else {
        attrs += ` alt="${escapeHtmlAttr(alt)}"`;
      }
    }

    if (!/\btitle\s*=/i.test(attrs)) {
      attrs += ` title="${escapeHtmlAttr(alt)}"`;
    }

    const widthMatch = attrs.match(/\bwidth\s*=\s*"(\d+)"/i);
    const width = widthMatch ? widthMatch[1] : null;
    // Reserve vertical space so blocked images still leave a visible box.
    const height = width
      ? String(Math.max(24, Math.round(Number(width) * 0.3)))
      : null;

    if (height && !/\bheight\s*=/i.test(attrs)) {
      attrs += ` height="${height}"`;
    }

    const sizeStyle = width
      ? "width:" + width + "px;height:auto;max-width:100%;"
      : "max-width:100%;height:auto;";
    const imageStyle =
      "display:block;" +
      sizeStyle +
      "border:0;outline:none;" +
      "text-decoration:none;color:#555555;font-family:Arial,Helvetica,sans-serif;" +
      "font-size:13px;line-height:18px;background-color:#eeeeee;";

    if (/\bstyle\s*=/i.test(attrs)) {
      attrs = attrs.replace(/\bstyle\s*=\s*"[^"]*"/i, `style="${imageStyle}"`);
    } else {
      attrs += ` style="${imageStyle}"`;
    }

    return `<img${attrs} />`;
  });
}

function prepareHeaderFooterHtml(html) {
  return enhanceEmailImages(ensureVisibleEmptyParagraphs(html));
}

function fontFamily(theme) {
  return FONT_FAMILY_MAP[theme.fontFamily] || FONT_FAMILY_MAP.system;
}

function getPresetTokens(theme) {
  const preset = theme.preset || "classic";
  const primary = theme.primaryColor || "#1976d2";
  const text = theme.textColor || "#222222";

  if (preset === "modern") {
    return {
      cardBackground: "#ffffff",
      cardRadius: "8px",
      cardPadding: "40px",
      cardBorder: "",
      cardShadow:
        "box-shadow:0 1px 2px rgba(16,24,40,0.04),0 8px 32px rgba(16,24,40,0.06);",
      cardTopAccent: "",
      wrapperPaddingY: "40px",
      h1FontSize: "28px",
      h1Weight: "600",
      h1Extra: "letter-spacing:-0.02em;line-height:1.25;",
      h1Border: "",
      h2FontSize: "20px",
      h2Weight: "600",
      h2Color: text,
      h2Extra: "margin:28px 0 10px;letter-spacing:-0.01em;line-height:1.3;",
      h3FontSize: "16px",
      h3Weight: "600",
      h3Color: text,
      h3Extra: "margin:20px 0 6px;line-height:1.4;",
      headerBlock:
        "text-align:center;font-size:11px;color:#71717a;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:24px;",
      infoBoxBackground: "#f4f7fb",
      infoBoxRadius: "12px",
      infoBoxBorder: "padding:16px;",
      footerBorder: "",
    };
  }
  if (preset === "minimal") {
    return {
      cardBackground: "transparent",
      cardRadius: "0",
      cardPadding: "0",
      cardBorder: "",
      cardShadow: "",
      cardTopAccent: "",
      wrapperPaddingY: "16px",
      h1FontSize: "20px",
      h1Weight: "600",
      h1Extra: "line-height:1.3;",
      h1Border: "",
      h2FontSize: "16px",
      h2Weight: "600",
      h2Color: text,
      h2Extra: "margin:24px 0 8px;line-height:1.35;",
      h3FontSize: "12px",
      h3Weight: "700",
      h3Color: "#52525b",
      h3Extra:
        "margin:20px 0 6px;text-transform:uppercase;letter-spacing:0.08em;",
      headerBlock:
        "font-size:12px;color:#71717a;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #e4e4e7;",
      infoBoxBackground: "transparent",
      infoBoxRadius: "0",
      infoBoxBorder: `border-left:3px solid ${primary};padding:4px 0 4px 14px;`,
      footerBorder: "border-top:1px solid #e4e4e7;padding-top:12px;",
    };
  }
  // classic (default)
  return {
    cardBackground: "#ffffff",
    cardRadius: "4px",
    cardPadding: "28px 32px",
    cardBorder: "border:1px solid #d4d4d8;",
    cardShadow: "",
    cardTopAccent: "",
    wrapperPaddingY: "24px",
    h1FontSize: "24px",
    h1Weight: "700",
    h1Extra: "line-height:1.3;",
    h1Border: "",
    h2FontSize: "18px",
    h2Weight: "700",
    h2Color: text,
    h2Extra: "margin:24px 0 8px;line-height:1.35;",
    h3FontSize: "15px",
    h3Weight: "700",
    h3Color: text,
    h3Extra: "margin:18px 0 4px;line-height:1.4;",
    headerBlock:
      "font-size:13px;color:#52525b;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e4e4e7;",
    infoBoxBackground: "#f4f4f5",
    infoBoxRadius: "4px",
    infoBoxBorder: "",
    footerBorder: "",
  };
}

function commonStyles(theme, options = {}) {
  const family = fontFamily(theme);
  const logoMaxWidth = getLogoMaxWidth(theme);
  const t = getPresetTokens(theme);
  const primary = theme.primaryColor || "#1976d2";
  const footerAlign = options.footerAlign || "center";
  const footerColor = options.footerColor || "#888";
  const gutter = getContentGutter(theme);
  return `
    body{margin:0;padding:0;background:${theme.backgroundColor || "#f5f5f5"};font-family:${family};color:${theme.textColor || "#222"};font-size:14px;line-height:1.5;}
    .wrapper{max-width:600px;margin:0 auto;padding:${t.wrapperPaddingY} 0;}
    .logo{width:${logoMaxWidth}px;max-width:100%;height:auto;display:block;margin:0 ${gutter} 12px;border:0;outline:none;text-decoration:none;}
    .header{margin-left:${gutter};margin-right:${gutter};}
    .footer{text-align:${footerAlign};font-size:12px;color:${footerColor};margin-top:16px;padding:12px ${gutter} 0;${t.footerBorder}}
    .footer img{max-width:100%;height:auto;display:block;margin:8px 0;border:0;outline:none;text-decoration:none;}
    .footer p,.header p{margin:0 0 8px;min-height:1.2em;}
    .footer a{color:${primary};}
    .accent{color:${primary};}
    .info-box{padding:12px;border-radius:${t.infoBoxRadius};background:${t.infoBoxBackground};margin:12px 0;${t.infoBoxBorder}}
    h1{color:${primary};margin:0 0 16px;font-size:${t.h1FontSize};font-weight:${t.h1Weight};${t.h1Extra}${t.h1Border}}
    h2{color:${t.h2Color};font-size:${t.h2FontSize};font-weight:${t.h2Weight};${t.h2Extra}}
    h3{color:${t.h3Color};font-size:${t.h3FontSize};font-weight:${t.h3Weight};${t.h3Extra}}
  `;
}

function getCardPaddingParts(theme) {
  const raw = String(getPresetTokens(theme).cardPadding || "0").trim();
  const parts = raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { top: "0", right: "0", bottom: "0", left: "0" };
  }
  if (parts.length === 1) {
    return {
      top: parts[0],
      right: parts[0],
      bottom: parts[0],
      left: parts[0],
    };
  }
  if (parts.length === 2) {
    return {
      top: parts[0],
      right: parts[1],
      bottom: parts[0],
      left: parts[1],
    };
  }
  if (parts.length === 3) {
    return {
      top: parts[0],
      right: parts[1],
      bottom: parts[2],
      left: parts[1],
    };
  }
  return {
    top: parts[0],
    right: parts[1],
    bottom: parts[2],
    left: parts[3],
  };
}

/** Horizontal inset shared by card content, header, footer, and logo. */
function getContentGutter(theme) {
  const { left, right } = getCardPaddingParts(theme);
  // Prefer left; fall back to right if asymmetric.
  return left || right || "0";
}

function getLogoMaxWidth(theme) {
  const width = theme.options && Number(theme.options.logoMaxWidth);
  return Number.isFinite(width) && width > 0 ? width : 200;
}

function getWrapperWidth(theme) {
  const width = theme.options && Number(theme.options.wrapperWidth);
  return Number.isFinite(width) && width > 0 ? width : 600;
}

function getShadowStyle(theme) {
  if (theme.options && theme.options.wrapperShadow === false) return "";
  return getPresetTokens(theme).cardShadow;
}

function bodyAttrs(theme) {
  const bg = theme.backgroundColor || "#f5f5f5";
  const color = theme.textColor || "#222222";
  return `bgcolor="${bg}" style="margin:0;padding:0;background:${bg};font-family:${fontFamily(theme)};color:${color};font-size:14px;line-height:1.5;"`;
}

function wrapperStyle(theme) {
  const t = getPresetTokens(theme);
  return `max-width:${getWrapperWidth(theme)}px;margin:0 auto;padding:${t.wrapperPaddingY} 0;background:${theme.backgroundColor || "#f5f5f5"};`;
}

function cardStyle(theme) {
  const t = getPresetTokens(theme);
  return `background:${t.cardBackground};border-radius:${t.cardRadius};padding:${t.cardPadding};${t.cardBorder}${t.cardTopAccent}${getShadowStyle(theme)}`;
}

function headingStyle(theme) {
  const t = getPresetTokens(theme);
  return `color:${theme.primaryColor || "#1976d2"};margin:0 0 16px;font-size:${t.h1FontSize};font-weight:${t.h1Weight};${t.h1Extra}${t.h1Border}`;
}

function headerBlockStyle(theme) {
  const gutter = getContentGutter(theme);
  return `${getPresetTokens(theme).headerBlock}margin-left:${gutter};margin-right:${gutter};`;
}

function footerStyle(theme, options = {}) {
  const t = getPresetTokens(theme);
  const align = options.align || "center";
  const color = options.color || "#888";
  const gutter = getContentGutter(theme);
  return `text-align:${align};font-size:12px;color:${color};margin-top:16px;padding:12px ${gutter} 0;${t.footerBorder}`;
}

function logoBlock(theme) {
  if (!theme.logoUrl) return "";
  const logoMaxWidth = getLogoMaxWidth(theme);
  const gutter = getContentGutter(theme);
  return `<img class="logo" src="${theme.logoUrl}" alt="Logo" width="${logoMaxWidth}" style="width:${logoMaxWidth}px;max-width:100%;height:auto;display:block;margin:0 ${gutter} 12px;border:0;outline:none;text-decoration:none;">`;
}

function headerBlock(theme) {
  if (!theme.headerHtml) return "";
  return `<div class="header" style="${headerBlockStyle(theme)}">${prepareHeaderFooterHtml(theme.headerHtml)}</div>`;
}

function footerBlock(theme, options = {}) {
  if (!theme.footerHtml) return "";
  return `<div class="footer" style="${footerStyle(theme, options)}">${prepareHeaderFooterHtml(theme.footerHtml)}</div>`;
}

function renderGenericMail(theme) {
  const width = getWrapperWidth(theme);
  const mailFooterOptions = { align: "left", color: "#444444" };
  const styles = commonStyles(theme, {
    footerAlign: mailFooterOptions.align,
    footerColor: mailFooterOptions.color,
  });
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <style>
    ${styles}
    .wrapper{max-width:${width}px;}
  </style>
</head>
<body ${bodyAttrs(theme)}>
  <div class="wrapper" style="${wrapperStyle(theme)}">
    ${logoBlock(theme)}
    ${headerBlock(theme)}
    <div class="card" style="${cardStyle(theme)}">
      <h1 style="${headingStyle(theme)}">{{ title }}</h1>
      <div>{{{ content }}}</div>
    </div>
    ${footerBlock(theme, mailFooterOptions)}
  </div>
</body>
</html>`;
}

function renderReceipt(theme) {
  const opts = theme.options || {};
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${opts.title || "Ihr Zahlungsbeleg"}</title>
  <style>
    ${commonStyles(theme)}
    .receipt-data{margin-bottom:12px;color:#555;font-size:13px;}
    .receipt-address{font-size:13px;${opts.showRecipientTopRight ? "text-align:right;" : ""}}
    .booking-detail{border-collapse:collapse;width:100%;}
    .booking-detail td,.booking-detail th{padding:8px;border-bottom:1px solid #ddd;}
    .total-row{font-weight:bold;}
  </style>
</head>
<body ${bodyAttrs(theme)}>
  <div class="wrapper" style="${wrapperStyle(theme)}">
    ${logoBlock(theme)}
    ${headerBlock(theme)}
    <div class="card" style="${cardStyle(theme)}">
      <p class="receipt-data">
        Belegnummer: {{receiptNumber}}<br/>
        Buchungsdatum: {{bookingDate}}
      </p>
      <p class="receipt-address">{{{receiptAddress}}}</p>
      <h1 style="${headingStyle(theme)}">${opts.title || "Ihr Zahlungsbeleg"}</h1>
      <p>
        {{#if isAggregated}}
          Hiermit bestätigen wir den vollständigen Zahlungseingang für die folgenden Buchungen:
        {{else}}
          Hiermit bestätigen wir Ihre Buchung sowie den vollständigen Zahlungseingang für die folgenden Buchungsdaten:
        {{/if}}
      </p>
      {{{bookingEntries}}}
    </div>
    ${footerBlock(theme)}
  </div>
</body>
</html>`;
}

function renderInvoice(theme) {
  const opts = theme.options || {};
  const city = opts.city ? `${opts.city}, ` : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Rechnung {{invoiceNumber}}</title>
  <style>
    ${commonStyles(theme)}
    .invoice-meta{text-align:right;font-size:12px;color:#666;margin-bottom:16px;}
    .invoice-address{margin-bottom:16px;}
  </style>
</head>
<body ${bodyAttrs(theme)}>
  <div class="wrapper" style="${wrapperStyle(theme)}">
    ${logoBlock(theme)}
    ${headerBlock(theme)}
    <div class="card" style="${cardStyle(theme)}">
      <div class="invoice-meta">
        Rechnungsnummer: {{invoiceNumber}}<br/>
        ${city}{{bookingDate}}
      </div>
      <div class="invoice-address">{{{invoiceAddress}}}</div>
      <h1 style="${headingStyle(theme)}">Rechnung</h1>
      <p>${opts.greeting ? opts.greeting.replace(/\n/g, "<br/>") : ""}</p>
      ${
  opts.showPaymentDeadline
    ? "<p>Bitte überweisen Sie den Betrag innerhalb von <strong>{{daysUntilPaymentDue}} Tagen</strong> mit dem Verwendungszweck <strong>{{purposeOfPayment}}</strong> auf folgendes Konto:</p>"
    : ""
}
      ${
  opts.showBankDetails
    ? `<div class="info-box">
              {{bank}}<br/>
              IBAN: {{iban}}<br/>
              BIC: {{bic}}
            </div>`
    : ""
}
      <p>Buchungsnummer: {{bookingId}}<br/>
      Zeitraum: {{bookingPeriod}}</p>
      {{{mainContent}}}
    </div>
    ${footerBlock(theme)}
  </div>
</body>
</html>`;
}

function renderCancellation(theme) {
  const opts = theme.options || {};
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${opts.title || "Stornorechnung"} {{cancellationNumber}}</title>
  <style>
    ${commonStyles(theme)}
    .cancellation-meta{text-align:right;font-size:12px;color:#666;margin-bottom:16px;}
    .refund-note{margin-top:10px;padding:10px;border-left:4px solid #2e7d32;background:#eaf5ea;font-size:13px;}
    .cancellation-note{margin-top:10px;padding:10px;border-left:4px solid #c0392b;background:#fdecea;font-size:13px;}
  </style>
</head>
<body ${bodyAttrs(theme)}>
  <div class="wrapper" style="${wrapperStyle(theme)}">
    ${logoBlock(theme)}
    ${headerBlock(theme)}
    <div class="card" style="${cardStyle(theme)}">
      <div class="cancellation-meta">
        Stornobelegnummer: {{cancellationNumber}}<br/>
        Ursprüngliche Rechnungsnummer: {{originalInvoiceNumber}}<br/>
        {{location}}, {{cancellationDate}}
      </div>
      <div>{{{invoiceAddress}}}</div>
      <h1 style="${headingStyle(theme)}">${opts.title || "Stornorechnung"}</h1>
      <p>
        Sehr geehrte Damen und Herren,<br/>
        hiermit stornieren wir die Rechnung mit der Nummer <strong>{{originalInvoiceNumber}}</strong>.
        Die nachfolgend aufgeführten Positionen werden Ihnen in voller Höhe gutgeschrieben.
      </p>
      {{#if cancellationReason}}
        <div class="cancellation-note">
          <strong>Grund der Stornierung:</strong> {{cancellationReason}}
        </div>
      {{/if}}
      ${
  opts.showRefundBlock
    ? `{{#if alreadyPaid}}
              <div class="refund-note">
                Der bereits gezahlte Betrag in Höhe von <strong>{{refundAmount}}</strong> wird Ihnen erstattet<br/>
              </div>
            {{/if}}`
    : ""
}
      {{{mainContent}}}
    </div>
    ${footerBlock(theme)}
  </div>
</body>
</html>`;
}

export function renderThemeToHtml(theme, templateType) {
  switch (templateType) {
  case "genericMailTemplate":
    return renderGenericMail(theme);
  case "receiptTemplate":
    return renderReceipt(theme);
  case "invoiceTemplate":
    return renderInvoice(theme);
  case "cancellationTemplate":
    return renderCancellation(theme);
  default:
    return "";
  }
}
