// PROTOTYPE (ECCdigital/tickets#516): throwaway, never merged.
// Wie wählt eine Admin die Schrift der Instanz im Admin UI? Drei Varianten
// im Tab „Portal“, umschaltbar per `?variant=A|B|C`.
//
// Alles hier ist ein Stub: Die Mediathek mit der Art `font` gibt es noch
// nicht, die Schrift wird nicht gespeichert. Der Wert lebt nur im Speicher,
// in der Form, die #516 vorschlägt:
//   branding.font: null | { source: "curated", id } | { source: "media", reference }
import Vue from "vue";

const BASE = `${process.env.BASE_URL || "/"}prototype-516`;

// Die Liste aus #511. Die Dateien sind die latin-Subsets als Variable Font,
// hier aus `public/prototype-516/fonts/` des Admin UI.
export const CURATED_FONTS = Object.freeze([
  { id: "inter", name: "Inter", kind: "Serifenlos", sizeKB: 47 },
  { id: "open-sans", name: "Open Sans", kind: "Serifenlos", sizeKB: 47 },
  { id: "roboto", name: "Roboto", kind: "Serifenlos", sizeKB: 42 },
  { id: "noto-sans", name: "Noto Sans", kind: "Serifenlos", sizeKB: 35 },
  { id: "public-sans", name: "Public Sans", kind: "Serifenlos", sizeKB: 26 },
  {
    id: "atkinson-hyperlegible-next",
    name: "Atkinson Hyperlegible Next",
    kind: "Serifenlos, besonders gut lesbar",
    sizeKB: 33,
  },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", kind: "Serifenlos", sizeKB: 45 },
  { id: "figtree", name: "Figtree", kind: "Serifenlos", sizeKB: 20 },
  { id: "noto-serif", name: "Noto Serif", kind: "Mit Serifen", sizeKB: 36 },
]);

export const SYSTEM_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAMPLE_TEXT =
  "Räume, Sportplätze und Lastenräder buchen – ab 12,50 € je Stunde.";
export const SAMPLE_SHORT = "Aa Ää Öö Üü ß 123";

export const MAX_KB = 500;
export const HINT_KB = 100;

const WEIGHT_NAMES = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
};

// Medien der Instanz-Mediathek mit der Art `font`, als Stub.
const STUB_MEDIA = [
  {
    id: "m-101",
    name: "Stadtwerke Sans",
    fileName: "StadtwerkeSans-VF.woff2",
    sizeKB: 49,
    url: `${BASE}/media/stadtwerke-sans.woff2`,
    variable: true,
    defaultWeight: 400,
    visibility: "public",
  },
  {
    id: "m-102",
    name: "Source Sans 3",
    fileName: "SourceSans3-VF.woff2",
    sizeKB: 28,
    url: `${BASE}/media/source-sans-3-vf.woff2`,
    variable: true,
    defaultWeight: 200,
    visibility: "public",
  },
  {
    id: "m-103",
    name: "Inter (vollständig)",
    fileName: "InterVariable.woff2",
    sizeKB: 344,
    url: `${BASE}/media/intervariable.woff2`,
    variable: true,
    defaultWeight: 400,
    visibility: "public",
  },
  {
    id: "m-104",
    name: "Lexend (Entwurf)",
    fileName: "Lexend-VF.woff2",
    sizeKB: 39,
    url: `${BASE}/media/lexend.woff2`,
    variable: true,
    defaultWeight: 400,
    visibility: "intern",
  },
];

export const store = Vue.observable({
  saved: null,
  draft: null,
  media: STUB_MEDIA.map((m) => ({ ...m })),
  lastSavedAt: null,
  // Wann die Lizenz für ein Medium bestätigt wurde, je Medien-ID.
  licenseConfirmed: {},
});

export function isDirty() {
  return JSON.stringify(store.draft) !== JSON.stringify(store.saved);
}

export function setDraft(font) {
  store.draft = font ? { ...font } : null;
}

export function commit() {
  if (!isDirty()) return;
  store.saved = store.draft ? { ...store.draft } : null;
  store.lastSavedAt = new Date();
}

export function reset() {
  store.draft = store.saved ? { ...store.saved } : null;
}

export function curatedById(id) {
  return CURATED_FONTS.find((f) => f.id === id) || null;
}

export function mediaById(id) {
  return store.media.find((m) => m.id === id) || null;
}

/** Name of what `font` points at, for labels. */
export function fontLabel(font) {
  if (!font) return "Systemschrift";
  if (font.source === "curated") return curatedById(font.id)?.name || font.id;
  return mediaById(font.reference?.mediaId)?.name || "Eigene Schrift";
}

const loaded = new Set();

function familyName(key) {
  return `proto516-${key}`;
}

function ensureFace(key, url) {
  if (loaded.has(key)) return;
  loaded.add(key);
  const face = new FontFace(familyName(key), `url(${url})`, {
    weight: "100 900",
  });
  face
    .load()
    .then((f) => document.fonts.add(f))
    .catch(() => loaded.delete(key));
}

/** CSS font-family for a curated font, loading it on first use. */
export function curatedFamily(id) {
  ensureFace(id, `${BASE}/fonts/${id}.woff2`);
  return `"${familyName(id)}", ${SYSTEM_STACK}`;
}

/** CSS font-family for a font medium, loading it on first use. */
export function mediaFamily(media) {
  ensureFace(media.id, media.url);
  return `"${familyName(media.id)}", ${SYSTEM_STACK}`;
}

/** CSS font-family for a `branding.font` value. */
export function familyFor(font) {
  if (!font) return SYSTEM_STACK;
  if (font.source === "curated") return curatedFamily(font.id);
  const media = mediaById(font.reference?.mediaId);
  return media ? mediaFamily(media) : SYSTEM_STACK;
}

/** Hints for a font medium: size and default weight of a variable font. */
export function warningsFor(media) {
  if (!media) return [];
  const warnings = [];
  if (media.sizeKB > HINT_KB) {
    warnings.push(
      `Die Datei hat ${media.sizeKB} KB. Über ${HINT_KB} KB kommt die Schrift bei langsamem Netz öfter zu spät, dann bleibt beim ersten Besuch die Ersatzschrift. Eine verkleinerte Datei (nur Lateinisch) hilft.`
    );
  }
  if (media.variable && media.defaultWeight && media.defaultWeight !== 400) {
    const name = WEIGHT_NAMES[media.defaultWeight] || media.defaultWeight;
    warnings.push(
      `Die Grundeinstellung dieser Variable Font ist das Gewicht ${media.defaultWeight} (${name}), nicht 400. Die Ersatzschrift beim Laden passt dann schlechter, Absätze können kürzer oder länger umbrechen.`
    );
  }
  if (media.defaultWeight === null) {
    warnings.push(
      "Prototyp: Bei einer eigenen Datei prüft der Prototyp die Grundeinstellung nicht."
    );
  }
  return warnings;
}

/**
 * Checks a picked file like the backend would and adds it to the stub
 * library. Resolves with the new medium or rejects with a message.
 */
export async function uploadFontFile(file) {
  const sizeKB = Math.round(file.size / 1024);
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const magic = String.fromCharCode(...head);
  if (magic !== "wOF2") {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    throw new Error(
      ["ttf", "otf", "woff"].includes(ext)
        ? `„${file.name}“ ist eine ${ext.toUpperCase()}-Datei. Bitte als woff2 hochladen.`
        : `„${file.name}“ ist keine woff2-Schrift.`
    );
  }
  if (sizeKB > MAX_KB) {
    throw new Error(
      `„${file.name}“ hat ${sizeKB} KB. Erlaubt sind höchstens ${MAX_KB} KB.`
    );
  }
  const media = {
    id: `m-${Date.now()}`,
    name: file.name.replace(/\.woff2$/i, "").replace(/[-_]+/g, " "),
    fileName: file.name,
    sizeKB,
    url: URL.createObjectURL(file),
    variable: null,
    defaultWeight: null,
    visibility: "public",
  };
  store.media.unshift(media);
  return media;
}

/** The reference a font medium is stored as. */
export function referenceOf(media) {
  return { source: "media", mediaId: media.id, url: null };
}
