/**
 * The rules the Hero Editor's Block list runs on.
 *
 * `blocks` is an array, and the array order is the stacking order inside a
 * Zone as well as the reading order on mobile (Shared contract, „Hero
 * Layout“). The editor therefore keeps it in one **canonical order**: the nine
 * Zones from „Oben links“ to „Unten rechts“, then the order inside the Zone.
 * Every rule here ends in `sortHeroBlocks`, so the array a caller gets back is
 * always canonical and the mobile reading order stays left → centre → right
 * within a row (hero layout spec §6).
 *
 * The rules are pure: they read an array and answer a new one, never touching
 * what they were given. The ones that can change which Block is selected
 * answer `{ blocks, selectedBlockId }`; the ones that only reorder answer the
 * array.
 */

import { v4 as uuidv4 } from "uuid";

/** The nine Zones, in canonical order. */
export const HERO_ZONES = Object.freeze([
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

/** The German name of every Zone (hero layout spec §12). */
export const HERO_ZONE_LABELS = Object.freeze({
  "top-left": "Oben links",
  "top-center": "Oben zentriert",
  "top-right": "Oben rechts",
  "middle-left": "Mitte links",
  "middle-center": "Mitte zentriert",
  "middle-right": "Mitte rechts",
  "bottom-left": "Unten links",
  "bottom-center": "Unten zentriert",
  "bottom-right": "Unten rechts",
});

/**
 * The arrow the 3x3 Position grid paints on a Zone's cell. The centre has no
 * direction to point in and carries a dot instead.
 */
export const HERO_ZONE_ICONS = Object.freeze({
  "top-left": "mdi-arrow-top-left",
  "top-center": "mdi-arrow-up",
  "top-right": "mdi-arrow-top-right",
  "middle-left": "mdi-arrow-left",
  "middle-center": "mdi-circle-medium",
  "middle-right": "mdi-arrow-right",
  "bottom-left": "mdi-arrow-bottom-left",
  "bottom-center": "mdi-arrow-down",
  "bottom-right": "mdi-arrow-bottom-right",
});

/** The Zone a Block without a selection to sit behind goes into. */
export const DEFAULT_HERO_ZONE = "middle-center";

/** The three Block types, in the order „Block hinzufügen“ offers them. */
export const HERO_BLOCK_TYPES = Object.freeze([
  Object.freeze({ value: "text", label: "Text", icon: "mdi-format-text" }),
  Object.freeze({
    value: "richtext",
    label: "Formatierter Text",
    icon: "mdi-text-box-outline",
  }),
  Object.freeze({ value: "image", label: "Bild", icon: "mdi-image-outline" }),
]);

/** The cap the backend enforces on a layout. */
export const MAX_HERO_BLOCKS = 12;

// The fields every Block carries, whatever its type.
const COMMON_DEFAULTS = Object.freeze({
  outerSpacing: "none",
  innerSpacing: "none",
  width: "auto",
  panel: "none",
  homeOnly: false,
  hideOnMobile: false,
});

// What each type adds. A new image Block has no medium yet; the detail form
// asks for one and the local pre-validation blocks the save until it is there.
const TYPE_DEFAULTS = Object.freeze({
  text: () => ({
    text: { de: "" },
    size: "md",
    color: "default",
    weight: "normal",
    shadow: false,
  }),
  richtext: () => ({ html: { de: "" }, color: "default", shadow: false }),
  image: () => ({
    image: null,
    alt: { de: "" },
    maxHeight: "md",
    invertInDarkMode: false,
  }),
});

// What a Block of an unknown type reads as. Only a hand-written layout can
// produce one; the list still has to name it.
const UNKNOWN_BLOCK_TYPE = Object.freeze({
  value: null,
  label: "Block",
  icon: "mdi-shape-outline",
});

/**
 * The German name and the icon of a Block type (hero layout spec §12).
 *
 * @param {string} type - `text`, `richtext` or `image`.
 * @returns {{value: ?string, label: string, icon: string}} The descriptor.
 */
export function heroBlockType(type) {
  return (
    HERO_BLOCK_TYPES.find((entry) => entry.value === type) || UNKNOWN_BLOCK_TYPE
  );
}

/**
 * A fresh Block id: uuid v4, which satisfies the contract's
 * `^[A-Za-z0-9_-]{1,64}$` and is unique without asking the array.
 *
 * @returns {string} The id.
 */
export function newHeroBlockId() {
  return uuidv4();
}

/**
 * A new Block of the given type, with every default of the Shared contract
 * filled in, so what the editor holds is what the backend would store.
 *
 * @param {string} type - `text`, `richtext` or `image`.
 * @param {string} zone - The Zone it goes into.
 * @param {string} [id] - Its id; a fresh one when left out.
 * @returns {Object} The Block.
 */
export function createHeroBlock(type, zone, id = newHeroBlockId()) {
  const content = TYPE_DEFAULTS[type];

  return {
    id,
    type,
    zone,
    ...COMMON_DEFAULTS,
    ...(content ? content() : {}),
  };
}

/**
 * The array in canonical order. A Block whose Zone is none of the nine — which
 * only a hand-written layout can produce — keeps its place at the end instead
 * of being dropped.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @returns {Array} A new array in canonical order.
 */
export function sortHeroBlocks(blocks) {
  const known = HERO_ZONES.flatMap((zone) => blocksOfZone(blocks, zone));
  const rest = (blocks || []).filter(
    (block) => !HERO_ZONES.includes(zoneOf(block))
  );

  return [...known, ...rest];
}

/**
 * The list as it is shown: one group per Zone that holds a Block, in canonical
 * order, with the German name of the Zone.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @returns {Array<{zone: string, label: string, blocks: Array}>} The groups.
 */
export function heroBlockGroups(blocks) {
  return HERO_ZONES.map((zone) => ({
    zone,
    label: HERO_ZONE_LABELS[zone],
    blocks: blocksOfZone(blocks, zone),
  })).filter((group) => group.blocks.length > 0);
}

/**
 * How many Blocks sit in each of the nine Zones. The Position grid asks with
 * the Block it is about to move, which then does not count itself: what the
 * cell shows is the crowd the Block would join.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {?string} [exceptId] - A Block that does not count itself.
 * @returns {Object<string, number>} A count per Zone, zero included.
 */
export function heroBlockZoneCounts(blocks, exceptId = null) {
  const counts = Object.fromEntries(HERO_ZONES.map((zone) => [zone, 0]));

  for (const block of blocks || []) {
    if (block.id !== exceptId && counts[zoneOf(block)] !== undefined) {
      counts[block.zone] += 1;
    }
  }

  return counts;
}

/**
 * The first line of a Block's German content — the alt text for an image, the
 * first paragraph without its markup for a rich text. The row shows it, so the
 * author recognises the Block without opening it.
 *
 * @param {Object} block - The Block.
 * @returns {string} The line, empty while the Block has no content yet.
 */
export function heroBlockSummary(block) {
  if (!block) {
    return "";
  }
  if (block.type === "image") {
    return german(block.alt);
  }
  if (block.type === "richtext") {
    return heroHtmlFirstLine(german(block.html));
  }
  return german(block.text);
}

/**
 * How a Block is named where its own row is not doing the naming — in another
 * Block's warning, say. The first line of its German content, and the name of
 * its type while it has none.
 *
 * The row itself shows the same two but paints them differently, an unwritten
 * Block reading as its type in italics, so it keeps its own branches.
 *
 * @param {?Object} block - The Block, or none.
 * @returns {string} The name.
 */
export function heroBlockLabel(block) {
  return heroBlockSummary(block) || heroBlockType(block && block.type).label;
}

/**
 * The text of one locale of a localised string — `text.text`, `richtext.html`
 * and `image.alt` all carry one. A locale nobody has written yet reads as
 * empty, which is what the field shows.
 *
 * @param {?Object} localized - The localised string.
 * @param {string} locale - `de` or `en`.
 * @returns {string} The text.
 */
export function heroLocalizedText(localized, locale) {
  const value = localized ? localized[locale] : null;
  return typeof value === "string" ? value : "";
}

/**
 * The localised string with one locale rewritten. An emptied English text
 * loses its key: „an empty `en` counts as absent“ (Shared contract), so a
 * translation the author clears leaves nothing behind for the save to send.
 * German is the required locale and keeps its key, empty or not — the
 * pre-validation is what refuses it.
 *
 * @param {?Object} localized - The localised string as it stands.
 * @param {string} locale - `de` or `en`.
 * @param {?string} next - What the field now holds.
 * @returns {Object} A new localised string.
 */
export function setHeroLocalizedText(localized, locale, next) {
  const result = { ...(localized || {}) };
  const text = String(next == null ? "" : next);

  if (locale !== "de" && !text.trim()) {
    delete result[locale];
  } else {
    result[locale] = text;
  }

  return result;
}

// The one localised field of each type, and what counts as text in it. Rich
// text is markup: an emptied editor answers `<p></p>`, which is a non-empty
// string and no translation at all.
const LOCALIZED_FIELD_OF_TYPE = Object.freeze({
  text: { key: "text", textOf: (value) => value },
  richtext: { key: "html", textOf: heroHtmlFirstLine },
  image: { key: "alt", textOf: (value) => value },
});

/**
 * The keys of the Shared contract that carry a `LocalizedString` — `text.text`,
 * `richtext.html`, `image.alt`. Read off the map above, so which fields are
 * translatable is said once: `heroErrors.js` reads a JSON path with it, and a
 * fourth of them would arrive there on its own.
 */
export const HERO_LOCALIZED_FIELDS = Object.freeze(
  Object.values(LOCALIZED_FIELD_OF_TYPE).map((field) => field.key)
);

/**
 * The Blocks the badge beside the language toggle counts: those whose
 * localised field carries no English text, so the storefront falls back to the
 * German one (hero layout spec §4). A Block of a type this editor has no field
 * for is not counted — there is nothing on it to translate here.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @returns {string[]} The ids without an English version.
 */
export function heroUntranslatedBlockIds(blocks) {
  return (blocks || [])
    .filter((block) => {
      const field = LOCALIZED_FIELD_OF_TYPE[block && block.type];

      return (
        !!field &&
        !field.textOf(heroLocalizedText(block[field.key], "en")).trim()
      );
    })
    .map((block) => block.id);
}

/**
 * Whether „Nach oben“ / „Nach unten“ would do anything — false at the edges of
 * the group, where the menu entry is disabled.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} id - The Block in question.
 * @param {string} direction - `up` or `down`.
 * @returns {boolean} Whether the Block can move that way.
 */
export function canMoveHeroBlock(blocks, id, direction) {
  return targetIndexInGroup(blocks, id, direction) !== null;
}

/**
 * Moves a Block one place up or down **inside its Zone**. The group is the
 * whole world of this rule: a Block never changes its Zone by moving, and at
 * the edges nothing happens.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} id - The Block to move.
 * @param {string} direction - `up` or `down`.
 * @returns {Array} A new array in canonical order.
 */
export function moveHeroBlock(blocks, id, direction) {
  const target = targetIndexInGroup(blocks, id, direction);
  if (target === null) {
    return sortHeroBlocks(blocks);
  }

  return setHeroBlockZone(blocks, id, zoneOf(findBlock(blocks, id)), target);
}

/**
 * Puts a Block into a Zone at a position in that Zone's group — what a drop
 * into another group does, and later what a Zone click in the preview does.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} id - The Block to place.
 * @param {string} zone - The Zone it lands in.
 * @param {?number} [index] - Its place in the group; at the end without one.
 * @returns {Array} A new array in canonical order.
 */
export function setHeroBlockZone(blocks, id, zone, index = null) {
  const block = findBlock(blocks, id);
  if (!block) {
    return sortHeroBlocks(blocks);
  }

  const others = (blocks || []).filter((entry) => entry.id !== id);
  const group = blocksOfZone(others, zone);
  const at = index === null ? group.length : clamp(index, 0, group.length);
  group.splice(at, 0, { ...block, zone });

  return sortHeroBlocks([
    ...others.filter((entry) => zoneOf(entry) !== zone),
    ...group,
  ]);
}

/**
 * Rewrites the fields the detail form changed. The patch carries the keys that
 * moved and nothing else, so a Block keeps everything the form does not ask
 * about — including the keys of a type this editor version has no field for.
 *
 * A Zone is not one of those fields: moving a Block reorders the array, which
 * is what `setHeroBlockZone` is for.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} id - The Block to rewrite.
 * @param {Object} patch - The fields that changed.
 * @returns {Array} A new array in canonical order.
 */
export function updateHeroBlock(blocks, id, patch) {
  return sortHeroBlocks(
    (blocks || []).map((block) =>
      block.id === id ? { ...block, ...patch } : block
    )
  );
}

/**
 * Copies a Block directly behind the original, in the same Zone and with a
 * fresh id, and selects the copy. The cap counts: twelve Blocks are twelve,
 * and a copy that is refused leaves the selection where it was.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} id - The Block to copy.
 * @param {?string} selectedBlockId - What is selected right now.
 * @param {string} [newId] - The copy's id; a fresh one when left out.
 * @returns {{blocks: Array, selectedBlockId: ?string}} List and selection.
 */
export function duplicateHeroBlock(
  blocks,
  id,
  selectedBlockId,
  newId = newHeroBlockId()
) {
  const sorted = sortHeroBlocks(blocks);
  const block = findBlock(sorted, id);
  if (!block || sorted.length >= MAX_HERO_BLOCKS) {
    return { blocks: sorted, selectedBlockId };
  }

  // The group is contiguous in a canonical array, so "behind the original" in
  // the array is "behind the original" in the group.
  const next = [...sorted];
  next.splice(next.indexOf(block) + 1, 0, { ...clone(block), id: newId });

  return { blocks: sortHeroBlocks(next), selectedBlockId: newId };
}

/**
 * Deletes a Block without asking — the deletion takes effect on save and
 * „Abbrechen“ restores it. When the deleted Block was the selected one, the
 * next of its group takes the selection, the one before it at the end of the
 * group, and nothing at all once the group is empty.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} id - The Block to delete.
 * @param {?string} selectedBlockId - What is selected right now.
 * @returns {{blocks: Array, selectedBlockId: ?string}} List and selection.
 */
export function removeHeroBlock(blocks, id, selectedBlockId) {
  const sorted = sortHeroBlocks(blocks);
  const block = findBlock(sorted, id);
  if (!block) {
    return { blocks: sorted, selectedBlockId };
  }

  const next = sorted.filter((entry) => entry.id !== id);
  if (selectedBlockId !== id) {
    return { blocks: next, selectedBlockId };
  }

  const group = blocksOfZone(sorted, zoneOf(block));
  const at = group.indexOf(block);
  const heir = group[at + 1] || group[at - 1] || null;

  return { blocks: next, selectedBlockId: heir ? heir.id : null };
}

/**
 * Adds a Block behind the selected one, in its Zone — or into „Mitte
 * zentriert“ while nothing is selected — and selects it. At twelve Blocks
 * nothing is added; the button is disabled there.
 *
 * @param {Array} blocks - The Blocks as they stand.
 * @param {string} type - `text`, `richtext` or `image`.
 * @param {{after?: ?string, id?: string}} [options] - Selection and id.
 * @returns {{blocks: Array, selectedBlockId: ?string}} List and selection.
 */
export function insertHeroBlock(blocks, type, options = {}) {
  const { after = null, id = newHeroBlockId() } = options;
  const sorted = sortHeroBlocks(blocks);
  if (sorted.length >= MAX_HERO_BLOCKS) {
    return { blocks: sorted, selectedBlockId: after };
  }

  const anchor = findBlock(sorted, after);
  const zone = anchor ? zoneOf(anchor) : DEFAULT_HERO_ZONE;
  const group = blocksOfZone(sorted, zone);
  const at = anchor ? group.indexOf(anchor) + 1 : group.length;

  const next = [...sorted, createHeroBlock(type, zone, id)];

  return {
    blocks: setHeroBlockZone(next, id, zone, at),
    selectedBlockId: id,
  };
}

function blocksOfZone(blocks, zone) {
  return (blocks || []).filter((block) => zoneOf(block) === zone);
}

function zoneOf(block) {
  return block ? block.zone : null;
}

function findBlock(blocks, id) {
  if (!id) {
    return null;
  }
  return (blocks || []).find((block) => block.id === id) || null;
}

/**
 * Where „Nach oben“ / „Nach unten“ would put the Block inside its group, or
 * null at the edges — the one place that knows what an edge is.
 */
function targetIndexInGroup(blocks, id, direction) {
  const block = findBlock(blocks, id);
  if (!block) {
    return null;
  }

  const group = blocksOfZone(blocks, zoneOf(block));
  const target = group.indexOf(block) + (direction === "up" ? -1 : 1);

  return target < 0 || target >= group.length ? null : target;
}

function german(value) {
  return value && typeof value.de === "string" ? value.de.trim() : "";
}

/**
 * The first line of a sanitised rich text — the row's summary, and the answer
 * to „has the author written anything at all“ that the pre-validation asks:
 * markup without a line in it is what an emptied editor leaves behind.
 *
 * The allowlist knows `p`, `br` and `li` as the things that end a line;
 * everything else is inline.
 *
 * @param {?string} html - The rich text.
 * @returns {string} The line, empty while the markup carries no text.
 */
export function heroHtmlFirstLine(html) {
  if (!html) {
    return "";
  }

  const lines = html
    .replace(/<(?:br|\/p|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((line) => decodeEntities(line).trim());

  return lines.find((line) => line.length > 0) || "";
}

// The quote characters are written as escapes so that neither the string nor
// the file has to change its quote style for them.
const ENTITIES = Object.freeze({
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\u0022",
  "&#39;": "\u0027",
  "&nbsp;": " ",
});

function decodeEntities(value) {
  return value.replace(
    /&(?:amp|lt|gt|quot|#39|nbsp);/g,
    (entity) => ENTITIES[entity]
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
