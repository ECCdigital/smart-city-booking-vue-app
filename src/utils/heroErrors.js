/**
 * What a backend `400` means to the Hero Editor's form.
 *
 * A validation failure answers the Shared contract's error shape: a body with
 * `details[]`, each entry a `code` and a `field` that is a **JSON path into
 * the request body** — `heroLayout.blocks[2].text.de`,
 * `background.overlay.light.color`, `heroLayout.height`. The editor's form is
 * not the request body, so something has to read the one into the other; this
 * module is that reading, and it is pure.
 *
 * Two rules shape it:
 *
 * - **Nothing is dropped.** A path this file cannot place answers no section
 *   rather than nothing at all, and the dialog shows it above the form. A
 *   backend that grows a field is a message the author still gets.
 * - **The wording is the local pre-validation's** wherever the two mean the
 *   same fault. „Pflichtfeld“ from the round-trip and „Pflichtfeld“ from the
 *   Vuetify rule are the same sentence, so an author never learns two names
 *   for one rule.
 *
 * The paths themselves come from `hero-layout-schema.js` and
 * `media-reference-guard.js` of the backend.
 */

import { HERO_LOCALIZED_FIELDS } from "@/utils/heroBlocks";
import {
  HERO_HEX_MESSAGE,
  HERO_REQUIRED_MESSAGE,
  heroMaxLengthMessage,
} from "@/utils/heroBlockValidation";

/** The parts of the form a message can land in. */
export const HERO_ERROR_SECTIONS = Object.freeze({
  /** „Höhe“ — the layout's own fields. */
  LAYOUT: "layout",
  /** „Blöcke“ — the array and everything inside a Block. */
  BLOCKS: "blocks",
  /** „Hintergrund“. */
  BACKGROUND: "background",
});

/**
 * The Block fields the detail form has a control to put a message under.
 *
 * Every other key of a Block comes out of a select, a switch or the Position
 * grid, which can only ever produce values the contract allows: a `400` on one
 * of them describes a Draft the form did not make — a hand-written layout, or
 * a backend that grew a rule the editor has not caught up with. Those land at
 * the „Blöcke“ section, where they are read rather than dropped.
 */
const HERO_BLOCK_INLINE_FIELDS = Object.freeze([
  "text",
  "html",
  "alt",
  "image",
  "color",
]);

/**
 * The locale list of the contract; the toggle offers exactly these. The last
 * segment of a path into a localised field is one of them.
 */
const LOCALES = Object.freeze(["de", "en"]);

// The German name of every field a message can be about, per section. The
// Block names are the labels of the detail form, the layout's the three height
// selects, the Background's the controls of „Hintergrund“ (hero layout §12).
const LAYOUT_LABELS = Object.freeze({
  version: "Version",
  height: "Höhe auf der Startseite",
  mobileHeight: "Höhe auf Mobilgeräten",
  compactHeight: "Höhe auf Unterseiten",
});

const BLOCK_LABELS = Object.freeze({
  id: "Kennung",
  type: "Typ",
  zone: "Position",
  text: "Text",
  html: "Text",
  alt: "Alternativtext",
  image: "Bild",
  size: "Schriftgröße",
  color: "Farbe",
  weight: "Fett",
  shadow: "Schatten",
  maxHeight: "Maximale Höhe",
  invertInDarkMode: "Im Dunkelmodus invertieren",
  outerSpacing: "Außenabstand",
  innerSpacing: "Innenabstand",
  width: "Breite",
  panel: "Fläche hinter dem Block",
  homeOnly: "Nur auf der Startseite anzeigen",
  hideOnMobile: "Auf Mobilgeräten ausblenden",
});

const BACKGROUND_LABELS = Object.freeze({
  type: "Art des Hintergrunds",
  variant: "Muster",
  orbs: "Leuchtkreise",
  noise: "Körnung",
  intensity: "Intensität",
  light: "Farbe",
  dark: "Farbe im Dunkelmodus",
  version: "Version",
  image: "Bild",
  focalPoint: "Bildausschnitt",
  "focalPoint.x": "Bildausschnitt",
  "focalPoint.y": "Bildausschnitt",
  overlay: "Abdunklung",
  "overlay.light": "Abdunklung",
  "overlay.light.color": "Farbe der Abdunklung",
  "overlay.light.opacity": "Abdunklung",
  "overlay.dark": "Abdunklung im Dunkelmodus",
  "overlay.dark.color": "Farbe der Abdunklung im Dunkelmodus",
  "overlay.dark.opacity": "Abdunklung im Dunkelmodus",
});

const LABELS_OF_SECTION = Object.freeze({
  [HERO_ERROR_SECTIONS.LAYOUT]: LAYOUT_LABELS,
  [HERO_ERROR_SECTIONS.BLOCKS]: BLOCK_LABELS,
  [HERO_ERROR_SECTIONS.BACKGROUND]: BACKGROUND_LABELS,
});

// What each `invalid_format` is about. The colour formats share the message of
// the local hex rule, so the field says the same thing either way.
const WRONG_TYPE = "Der Wert hat ein ungültiges Format.";

const FORMAT_MESSAGES = Object.freeze({
  hex: HERO_HEX_MESSAGE,
  color: HERO_HEX_MESSAGE,
  block_id: "Die Kennung des Blocks ist ungültig.",
  percentage: "Bitte einen ganzen Prozentwert zwischen 0 und 100 angeben.",
  // The four the backend answers a value of the wrong JSON type with. No
  // control of this form can produce one — a hand-written layout can — so they
  // say that much and no more.
  object: WRONG_TYPE,
  array: WRONG_TYPE,
  string: WRONG_TYPE,
  boolean: WRONG_TYPE,
});

// Why a medium may not carry the Hero — `params.reason` of an
// `invalid_custom`, in the author's words rather than the guard's.
const MEDIA_REASON_MESSAGES = Object.freeze({
  external: "Externe Bildadressen sind im Kopfbereich nicht möglich.",
  not_instance: "Das Bild gehört nicht zur Mediathek dieser Instanz.",
  not_public:
    "Das Bild ist nicht öffentlich — der Kopfbereich zeigt nur öffentliche Medien.",
  not_image: "Die gewählte Datei ist kein Bild.",
});

const UNSUPPORTED_VALUE = "Dieser Wert wird nicht unterstützt.";
const UNKNOWN_FIELD = "Dieses Feld wird nicht unterstützt.";
const DUPLICATE_ID = "Zwei Blöcke haben dieselbe Kennung.";
const GENERIC_REFUSAL = "Der Server hat diesen Wert abgelehnt.";

// One message per code of the contract's error vocabulary. A code that is not
// here — the backend grows one, or a shared schema helper leaks a narrower one
// — falls back rather than disappearing.
const MESSAGES_OF_CODE = Object.freeze({
  required: () => HERO_REQUIRED_MESSAGE,
  // Both caps are named by `params`. A detail that carries none would put the
  // word „undefined“ in front of an author, so it falls back instead.
  max_length: (params) =>
    params.max === undefined
      ? GENERIC_REFUSAL
      : heroMaxLengthMessage(params.max),
  max_items: (params) =>
    params.max === undefined
      ? GENERIC_REFUSAL
      : `Mehr als ${params.max} Blöcke sind nicht möglich.`,
  invalid_enum: () => UNSUPPORTED_VALUE,
  unknown_field: () => UNKNOWN_FIELD,
  duplicate_id: () => DUPLICATE_ID,
  invalid_format: (params) => FORMAT_MESSAGES[params.format] || GENERIC_REFUSAL,
  invalid_custom: (params) =>
    MEDIA_REASON_MESSAGES[params.reason] || GENERIC_REFUSAL,
});

// `heroLayout.blocks[2]` — the one place a path carries an index.
const BLOCK_SEGMENT = /^blocks\[(\d+)\]$/;

const NOWHERE = Object.freeze({
  section: null,
  blockIndex: null,
  field: null,
  locale: null,
});

/**
 * Where in the form a `details[].field` belongs.
 *
 * `field` is the key the editor's own control is named by, which is why the
 * Background keeps its dotted rest (`overlay.light.color` is one control) while
 * a Block's locale is split off into `locale` instead (one control per locale
 * view). A path that names an object rather than a field inside it — the
 * layout, the Background, a whole Block — answers that object's section with
 * no `field`, so the message lands at the section.
 *
 * @param {*} path - The JSON path of one detail.
 * @returns {{section: ?string, blockIndex: ?number, field: ?string, locale: ?string}}
 *   Where it goes; every key null for a path this editor has no place for.
 */
export function resolveHeroErrorPath(path) {
  const place = readPath(pathSegments(path));

  return { ...place, field: namedField(place.section, place.field) };
}

/**
 * What one detail says, in the author's words. It names the fault only — where
 * the message stands is what names the field.
 *
 * @param {Object} detail - One entry of `details[]`.
 * @returns {string} The message.
 */
export function heroErrorMessage(detail) {
  const code = detail && detail.code;
  const message = MESSAGES_OF_CODE[code];

  return message ? message(detail.params || {}) : GENERIC_REFUSAL;
}

/**
 * The German name of a field, for a message that stands away from its control.
 *
 * @param {?string} section - One of `HERO_ERROR_SECTIONS`.
 * @param {?string} field - The field as `resolveHeroErrorPath` read it.
 * @returns {?string} The name, or null when there is none to give.
 */
export function heroFieldLabel(section, field) {
  const labels = LABELS_OF_SECTION[section];

  return (labels && labels[field]) || null;
}

/**
 * The whole `details[]` of a `400`, read into what the form shows: one entry
 * per detail, in the order the backend walked the body, which is the order the
 * fields stand in the form.
 *
 * @param {*} details - `details[]` of the error body.
 * @returns {Array<Object>} The entries, each carrying its message and label.
 */
export function heroErrorEntries(details) {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.map((detail) => {
    const place = resolveHeroErrorPath(detail && detail.field);

    return {
      ...place,
      path: (detail && detail.field) || null,
      message: heroErrorMessage(detail),
      label: heroFieldLabel(place.section, place.field),
    };
  });
}

/**
 * Whether the detail form has a control to put this Block's message under. The
 * dialog asks it twice, once each way: what is inline goes to the form, what
 * is not goes to the „Blöcke“ section, and nothing may fall between the two.
 *
 * @param {Object} entry - One entry of `heroErrorEntries`.
 * @returns {boolean} Whether a control can carry it.
 */
export function isHeroInlineBlockError(entry) {
  return HERO_BLOCK_INLINE_FIELDS.includes(entry.field);
}

/**
 * Whether a message belongs in the locale view on screen. A fault of a field
 * that carries no locale belongs in both.
 *
 * @param {Object} entry - One entry of `heroErrorEntries`.
 * @param {string} locale - The locale the header toggle selects.
 * @returns {boolean} Whether that view shows it.
 */
export function isHeroErrorInLocale(entry, locale) {
  return entry.locale === null || entry.locale === locale;
}

/**
 * One line of a section's error list: the field it is about, then what is
 * wrong with it. A message that already stands at its own control does not go
 * through here.
 *
 * @param {Object} entry - One entry of `heroErrorEntries`.
 * @returns {string} The line.
 */
export function heroSectionErrorText(entry) {
  return entry.label ? `${entry.label}: ${entry.message}` : entry.message;
}

/**
 * The `details[]` a refusal carries — only a `400` has any. Anything else is
 * not the Draft's fault and has no field to land on.
 *
 * A `400` whose details are empty answers none either: the caller uses this to
 * decide whether it has fields to mark, and „bitte die markierten Felder
 * prüfen“ over a form with nothing marked would send the author looking for
 * something that is not there.
 *
 * @param {*} error - What the route rejected with.
 * @returns {?Array<Object>} The details, or null when there are none to place.
 */
export function heroValidationDetails(error) {
  const response = error && error.response;

  if (!response || response.status !== 400) {
    return null;
  }

  const details = response.data && response.data.details;

  return Array.isArray(details) && details.length > 0 ? details : null;
}

/** Which object of the request body a path is about, and what inside it. */
function readPath(segments) {
  const root = segments[0];

  if (root === "heroLayout") {
    return layoutPath(segments.slice(1));
  }
  if (root === "background") {
    return {
      ...NOWHERE,
      section: HERO_ERROR_SECTIONS.BACKGROUND,
      field: segments.slice(1).join(".") || null,
    };
  }

  return { ...NOWHERE };
}

/**
 * The control a message stands at: the deepest part of the path this editor
 * has a name for.
 *
 * A media reference is `{ source, mediaId }` under a single „Bild“ control, so
 * `image.mediaId` is a fault of `image` and belongs there. An overlay is
 * several controls, so `overlay.light.color` stays whole. Asking the labels
 * which is which is what keeps this from becoming a list of special cases —
 * a field the editor shows is a field the editor can name.
 *
 * A path nothing along it is named for is kept as it came, so it reaches its
 * section rather than being cut down to something misleading.
 */
function namedField(section, field) {
  if (field === null) {
    return null;
  }

  const parts = field.split(".");

  for (let depth = parts.length; depth > 0; depth -= 1) {
    const candidate = parts.slice(0, depth).join(".");

    if (heroFieldLabel(section, candidate)) {
      return candidate;
    }
  }

  return field;
}

/**
 * The part of a path below `heroLayout`: the Blocks with their index, or one
 * of the layout's own fields.
 */
function layoutPath(segments) {
  const [first, ...rest] = segments;

  if (first === undefined) {
    return { ...NOWHERE, section: HERO_ERROR_SECTIONS.LAYOUT };
  }

  const block = BLOCK_SEGMENT.exec(first);

  if (first === "blocks" || block) {
    return {
      ...blockField(block ? rest : []),
      section: HERO_ERROR_SECTIONS.BLOCKS,
      blockIndex: block ? Number(block[1]) : null,
    };
  }

  return {
    ...NOWHERE,
    section: HERO_ERROR_SECTIONS.LAYOUT,
    field: segments.join(".") || null,
  };
}

/**
 * The part of a path below a Block. A localised field is one control per
 * locale view, so a trailing locale is split off the field rather than kept in
 * its name — and a locale the toggle does not offer is dropped, which lands
 * the message on the field in both views instead of nowhere.
 */
function blockField([field, ...rest]) {
  if (field === undefined) {
    return { field: null, locale: null };
  }
  if (!HERO_LOCALIZED_FIELDS.includes(field)) {
    return { field: [field, ...rest].join("."), locale: null };
  }

  return { field, locale: LOCALES.includes(rest[0]) ? rest[0] : null };
}

/** `heroLayout.blocks[2].text.de` → the four segments it is made of. */
function pathSegments(path) {
  return typeof path === "string" && path ? path.split(".") : [];
}
