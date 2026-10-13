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

// The tags a woff2 table directory names by index (W3C WOFF2, section 5.1).
// Index 63 means the tag follows in full.
const WOFF2_KNOWN_TAGS = Object.freeze([
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill",
]);
const WOFF2_HEADER_BYTES = 48;
const WOFF2_FULL_TAG = 63;

function tagAt(bytes, offset) {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

/**
 * The tables of a woff2 in the order of its one compressed stream, with the
 * length each takes there, and where that stream starts. Null for anything
 * that is not a single woff2 font.
 */
function woff2Directory(bytes) {
  if (bytes.length < WOFF2_HEADER_BYTES || tagAt(bytes, 0) !== "wOF2") {
    return null;
  }
  const header = new DataView(bytes.buffer, bytes.byteOffset);
  // A collection holds several fonts; the portal takes one.
  if (tagAt(bytes, 4) === "ttcf") {
    return null;
  }
  const count = header.getUint16(12);
  const compressedLength = header.getUint32(20);

  let offset = WOFF2_HEADER_BYTES;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = bytes[offset++];
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    throw new RangeError("UIntBase128 longer than 5 bytes");
  };

  const tables = [];
  for (let i = 0; i < count; i += 1) {
    const flags = bytes[offset++];
    const index = flags & 0x3f;
    const version = flags >> 6;
    let tag = WOFF2_KNOWN_TAGS[index];
    if (index === WOFF2_FULL_TAG) {
      tag = tagAt(bytes, offset);
      offset += 4;
    }
    const length = base128();
    // `glyf` and `loca` are transformed at version 0, every other table at
    // any other version; a transformed table is stored at its own length.
    const transformed =
      tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    tables.push({ tag, length: transformed ? base128() : length });
  }
  return { tables, stream: bytes.subarray(offset, offset + compressedLength) };
}

/** The stream unpacked, or null where the browser has no Brotli. */
async function unbrotli(stream) {
  let decompression;
  try {
    // Missing altogether in older browsers: that throws too.
    decompression = new window.DecompressionStream("brotli");
  } catch {
    return null;
  }
  const unpacked = new Response(stream).body.pipeThrough(decompression);
  return new Uint8Array(await new Response(unpacked).arrayBuffer());
}

/**
 * The default of the weight axis of a variable woff2 font — the instance the
 * storefront measures its fallback against (map #510). The tables of a woff2
 * sit in one Brotli stream, which the browser unpacks through
 * `DecompressionStream("brotli")`; a browser without it gets null, as do a
 * static font, a font without weight axis and any file that is no woff2.
 *
 * @param {ArrayBuffer} buffer - The file.
 * @returns {Promise<?number>} The default weight, or null.
 */
export async function fontDefaultWeight(buffer) {
  try {
    const directory = woff2Directory(new Uint8Array(buffer));
    if (!directory || !directory.tables.some(({ tag }) => tag === "fvar")) {
      return null;
    }
    const data = await unbrotli(directory.stream);
    if (!data) {
      return null;
    }

    let start = 0;
    const fvar = directory.tables.find((table) => {
      table.start = start;
      start += table.length;
      return table.tag === "fvar";
    });
    const view = new DataView(data.buffer, data.byteOffset + fvar.start);
    const axesOffset = view.getUint16(4);
    const axisCount = view.getUint16(8);
    const axisSize = view.getUint16(10);
    for (let i = 0; i < axisCount; i += 1) {
      const axis = axesOffset + i * axisSize;
      if (tagAt(data, fvar.start + axis) === "wght") {
        return view.getInt32(axis + 8) / 65536;
      }
    }
    return null;
  } catch {
    // A damaged file has no default to warn about; the backend's checks
    // decide whether it is a font at all.
    return null;
  }
}
