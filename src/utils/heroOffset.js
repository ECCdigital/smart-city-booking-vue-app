/**
 * The Offset of a Block, as „Lage“ moves it and as the author reads it.
 *
 * The contract stores `offset` in **rem** on a 0.5 grid, each axis −3…3; the
 * pad moves it in **steps**, one step per click, six steps each way. Those are
 * two units for one value, and this module is the only place that knows the
 * rate between them: the pad counts clicks, the Draft carries rem, and the
 * readout counts back.
 */

/** One click of the pad, in rem — the grid the contract allows. */
export const HERO_OFFSET_STEP = 0.5;

/** How far a Block may be displaced on either axis, in rem. */
export const HERO_OFFSET_LIMIT = 3;

/** What the readout says about a Block that sits where its Zone puts it. */
const NO_OFFSET_TEXT = "Kein Versatz";

// The unit of the readout, said once at the end rather than after each count.
const STEPS_SUFFIX = "(Schritte)";

// Which way each axis counts. `x` grows to the right and `y` grows downwards,
// the way the screen's own axes run.
const DIRECTIONS = Object.freeze({
  x: { positive: "nach rechts", negative: "nach links" },
  y: { positive: "nach unten", negative: "nach oben" },
});

/**
 * The nine cells of the „Lage“ pad, in reading order: the eight directions
 * around the middle cell, which resets. Each carries the German word the pad
 * says out loud — the arrows are all a cell shows, so the word is what a
 * screen reader and a hovering pointer get (hero layout spec §7).
 */
export const HERO_NUDGE_CELLS = Object.freeze(
  [
    { x: -1, y: -1, label: "Nach links oben", icon: "mdi-arrow-top-left" },
    { x: 0, y: -1, label: "Nach oben", icon: "mdi-arrow-up" },
    { x: 1, y: -1, label: "Nach rechts oben", icon: "mdi-arrow-top-right" },
    { x: -1, y: 0, label: "Nach links", icon: "mdi-arrow-left" },
    {
      x: 0,
      y: 0,
      label: "Versatz zurücksetzen",
      icon: "mdi-restore",
      reset: true,
    },
    { x: 1, y: 0, label: "Nach rechts", icon: "mdi-arrow-right" },
    { x: -1, y: 1, label: "Nach links unten", icon: "mdi-arrow-bottom-left" },
    { x: 0, y: 1, label: "Nach unten", icon: "mdi-arrow-down" },
    { x: 1, y: 1, label: "Nach rechts unten", icon: "mdi-arrow-bottom-right" },
  ].map((cell) => Object.freeze(cell))
);

/** The Offset of a Block that sits where its Zone stack puts it. */
export const NO_HERO_OFFSET = Object.freeze({ x: 0, y: 0 });

/**
 * The Offset one click of a direction cell produces, clamped to the
 * contract's −3…3 grid. Each axis is clamped on its own, so a diagonal at the
 * right edge still moves downwards.
 *
 * @param {?Object} offset - The Block's `{ x, y }` in rem.
 * @param {Object} step - The cell's direction, −1, 0 or 1 per axis.
 * @returns {{x: number, y: number}} The new Offset.
 */
export function heroOffsetStep(offset, step) {
  return {
    x: steppedAxis(value(offset, "x"), step.x),
    y: steppedAxis(value(offset, "y"), step.y),
  };
}

/**
 * Whether a direction cell has anywhere left to go. A cell that would move
 * nothing is disabled rather than silently doing nothing.
 *
 * @param {?Object} offset - The Block's `{ x, y }` in rem.
 * @param {Object} step - The cell's direction, −1, 0 or 1 per axis.
 * @returns {boolean} Whether the click would change the Offset.
 */
export function isHeroOffsetStepPossible(offset, step) {
  const moved = heroOffsetStep(offset, step);

  return moved.x !== value(offset, "x") || moved.y !== value(offset, "y");
}

/**
 * Whether the Block sits where its Zone puts it — what disables the middle
 * cell, which has nothing to reset.
 *
 * @param {?Object} offset - The Block's `{ x, y }` in rem.
 * @returns {boolean} Whether both axes are nought.
 */
export function isHeroOffsetZero(offset) {
  return value(offset, "x") === 0 && value(offset, "y") === 0;
}

/**
 * What „Lage“ reads beside the pad: the displacement in **steps**, named by
 * direction, `x` before `y` (hero layout spec §7).
 *
 * @param {?Object} offset - The Block's `{ x, y }` in rem.
 * @returns {string} The readout.
 */
export function heroOffsetReadout(offset) {
  const parts = ["x", "y"]
    .map((axis) => axisReadout(axis, value(offset, axis)))
    .filter(Boolean);

  return parts.length === 0
    ? NO_OFFSET_TEXT
    : `${parts.join(" · ")} ${STEPS_SUFFIX}`;
}

function steppedAxis(rem, step) {
  const moved = rem + step * HERO_OFFSET_STEP;

  return Math.min(HERO_OFFSET_LIMIT, Math.max(-HERO_OFFSET_LIMIT, moved));
}

/** „4 nach rechts“ — one axis, or nothing at all when it has not moved. */
function axisReadout(axis, rem) {
  if (!rem) {
    return "";
  }

  const steps = Math.abs(rem) / HERO_OFFSET_STEP;
  const direction = DIRECTIONS[axis];

  return `${steps} ${rem > 0 ? direction.positive : direction.negative}`;
}

function value(offset, axis) {
  const rem = offset && offset[axis];

  return typeof rem === "number" && Number.isFinite(rem) ? rem : 0;
}
