/**
 * The font of the portal (`branding.font`, map #510):
 *
 *   null                                   the system font
 *   | { source: "curated", id }            one of CURATED_FONTS
 *   | { source: "media", reference, license }  a woff2 of the instance library
 *
 * The licence of an own font is stored by the backend as
 * `{ confirmedAt, confirmedBy }`; the form only ever sends the tick
 * (`{ confirmed: true }`), the person and the moment come from the session.
 */

export const FONT_SOURCE = Object.freeze({
  CURATED: "curated",
  MEDIA: "media",
});

const SANS = "Serifenlos";
const SERIF = "Mit Serifen";

// The curated list. Backend and storefront keep their own copy under the same
// ids (map #510, story 92): a new font touches all three repositories. The
// admin UI ships the latin part of each as a variable woff2 under
// `public/fonts/preview/` (Fontsource 5.3.0, licence beside it) for the tiles.
// IBM Plex Sans is the exception: its licence reserves the name "Plex", which
// a subset cut by anyone but IBM may not carry, so its file is IBM's own
// `IBM Plex Sans Var-Roman-Latin1.woff2` of `@ibm/plex-sans-variable` 0.2.0
// with IBM's licence, byte for byte and only renamed.
export const CURATED_FONTS = Object.freeze([
  { id: "inter", name: "Inter", kind: SANS },
  { id: "open-sans", name: "Open Sans", kind: SANS },
  { id: "roboto", name: "Roboto", kind: SANS },
  { id: "noto-sans", name: "Noto Sans", kind: SANS },
  { id: "public-sans", name: "Public Sans", kind: SANS },
  {
    id: "atkinson-hyperlegible-next",
    name: "Atkinson Hyperlegible Next",
    kind: SANS,
  },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", kind: SANS },
  { id: "figtree", name: "Figtree", kind: SANS },
  { id: "noto-serif", name: "Noto Serif", kind: SERIF },
]);

export const SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// From this size on an own font misses the first paint more often on a slow
// network (map #510, story 32).
export const FONT_SIZE_HINT_BYTES = 100 * 1024;

/** The preview file of a font of the list. */
export function previewFontUrl(id) {
  const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/fonts/preview/${id}.woff2`;
}

const facesLoaded = new Set();

/**
 * The CSS family of a font for the tiles, loaded into the document on first
 * use: only the tab that shows the tiles pays for the files. A font that fails
 * to load leaves the system font in place and is tried again next time.
 *
 * @param {string} family - A name of its own for the face.
 * @param {string|ArrayBuffer} source - The URL of the file, or its bytes.
 * @returns {string} The `font-family` to set.
 */
export function previewFontFamily(family, source) {
  if (typeof FontFace === "function" && !facesLoaded.has(family)) {
    facesLoaded.add(family);
    const face = new FontFace(
      family,
      typeof source === "string" ? `url(${source})` : source,
      { weight: "100 900" }
    );
    face
      .load()
      .then((loaded) => document.fonts.add(loaded))
      .catch(() => facesLoaded.delete(family));
  }
  return `"${family}", ${SYSTEM_FONT_STACK}`;
}

/**
 * Whether the licence of an own font is confirmed: stored by the backend or
 * ticked in the form since.
 *
 * @param {?Object} font - A `branding.font`.
 * @returns {boolean}
 */
export function fontLicenseConfirmed(font) {
  const license = font?.license;
  return !!license && (license.confirmed === true || !!license.confirmedAt);
}
