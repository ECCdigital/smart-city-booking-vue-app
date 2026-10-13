// PROTOTYPE (ECCdigital/tickets#519): throwaway, never merged.
// Wo stellt eine Admin Akzent, Header, App-Logo und Footer-Logos im Admin UI
// ein, und was davon zeigt die Live-Vorschau? Drei Varianten im Tab „Portal“,
// umschaltbar per `?variant=A|B|C`, dazu der Hero-Editor mit „Akzent“ und der
// Quelle „App-Logo“.
//
// Alles hier ist ein Stub: Das Backend kennt die neuen Felder noch nicht. Sie
// leben nur im Speicher, in der Form, die die Karte #510 vorschlägt:
//   branding.accent: null | "#rrggbb"
//   branding.header: "neutral" | "primary" | "secondary"
//   branding.logoDark: null | MediaReference
//   branding.loginLogoSize: "S" | "M" | "L"
//   branding.footerLogos: [{ image, size, link, imageDark }]
// Mediathek und Bilder sind echt, gespeichert wird davon nichts.
import Vue from "vue";

export const LOGIN_LOGO_SIZES = Object.freeze([
  { value: "S", px: 56, text: "S · 56 px (wie heute)" },
  { value: "M", px: 96, text: "M · 96 px" },
  { value: "L", px: 160, text: "L · 160 px" },
]);

export const FOOTER_LOGO_SIZES = Object.freeze([
  { value: "S", px: 48, text: "S · 48 px" },
  { value: "M", px: 80, text: "M · 80 px" },
  { value: "L", px: 120, text: "L · 120 px" },
]);

export const HEADER_OPTIONS = Object.freeze([
  { value: "neutral", text: "Neutral" },
  { value: "primary", text: "Primärfarbe" },
  { value: "secondary", text: "Sekundärfarbe" },
]);

// Neutral ist fest (#517): hell weiß, dunkel der Grund des Footers.
export const NEUTRAL = Object.freeze({
  light: { bg: "#ffffff", fg: "#111827" },
  dark: { bg: "#111827", fg: "#ffffff" },
});

// Die Rückfälle, wenn kein Akzent gesetzt ist (#512).
export const ACCENT_FALLBACK = "#4f46e5";

function emptyDraft() {
  return {
    accent: null,
    header: "primary",
    logoDark: null,
    loginLogoSize: "S",
    footerLogos: [],
  };
}

let uid = 0;

export const store = Vue.observable({
  draft: emptyDraft(),
  saved: emptyDraft(),
  lastSavedAt: null,
  // Hero-Editor: je Block-ID, was der Prototyp statt des Backends hält.
  // `color` und `panelColor` nur, wenn „Akzent“ gewählt ist; `appLogo`, wenn
  // die Quelle „App-Logo“ ist. Der Block selbst behält seine echten Werte,
  // damit das Speichern des Hero-Editors weiter funktioniert.
  hero: {},
  // Das gespeicherte App-Logo der Instanz, für den Hero-Editor.
  appLogo: null,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isDirty() {
  return JSON.stringify(store.draft) !== JSON.stringify(store.saved);
}

export function reset() {
  store.draft = clone(store.saved);
}

export function commit() {
  store.saved = clone(store.draft);
  store.lastSavedAt = new Date().toISOString();
}

export function newFooterLogo(media, reference) {
  uid += 1;
  return {
    key: `logo-${uid}`,
    title: media.title || media.originalFileName || "Logo",
    image: reference,
    size: "M",
    link: "",
    imageDark: null,
  };
}

export function moveFooterLogo(index, delta) {
  const list = store.draft.footerLogos;
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(target, 0, item);
}

export function removeFooterLogo(index) {
  store.draft.footerLogos.splice(index, 1);
}

export function heroOf(blockId) {
  return store.hero[blockId] || {};
}

export function patchHero(blockId, fields) {
  Vue.set(store.hero, blockId, { ...heroOf(blockId), ...fields });
}

/** Luma über 180 gibt Schwarz, sonst Weiß (#517). Nur `#rgb` und `#rrggbb`. */
export function contrastOf(hex) {
  const value = String(hex || "").trim();
  let m = /^#([0-9a-f]{6})$/i.exec(value);
  let r;
  let g;
  let b;
  if (m) {
    r = parseInt(m[1].slice(0, 2), 16);
    g = parseInt(m[1].slice(2, 4), 16);
    b = parseInt(m[1].slice(4, 6), 16);
  } else {
    m = /^#([0-9a-f]{3})$/i.exec(value);
    if (!m) return "#ffffff";
    r = parseInt(m[1][0] + m[1][0], 16);
    g = parseInt(m[1][1] + m[1][1], 16);
    b = parseInt(m[1][2] + m[1][2], 16);
  }
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 180 ? "#000000" : "#ffffff";
}

/** Grund und Schrift des Headers in einem Modus. */
export function headerColors(header, colors, mode) {
  if (header === "neutral") return NEUTRAL[mode];
  const bg = (colors && colors[header]) || "#1976d2";
  return { bg, fg: contrastOf(bg) };
}

export function mediaIdOf(reference) {
  return (reference && reference.mediaId) || null;
}
