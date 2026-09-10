/**
 * What the preview tile at the head of „Darstellung“ paints (hero layout
 * spec §7).
 *
 * This is the one place in the admin that repaints what the storefront
 * paints, so it is the one place that can drift from it. Every derivation
 * here is a pure function of the Draft's own values.
 */

import {
  HERO_FIXED_TOKEN_COLORS,
  isHeroHexColor,
} from "@/utils/heroBlockValidation";
import {
  HERO_BACKGROUND_VARIANTS,
  heroBackgroundFamily,
  normalizedHeroBackground,
} from "@/utils/heroBackground";
import { HERO_DEFAULT_SIZE } from "@/utils/heroBlocks";

// The Panel's five corner steps in rem, as the storefront's radius classes
// resolve them at the current `--ui-radius` (Shared contract, „Panel“).
const PANEL_RADII = Object.freeze({
  none: "0",
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1.5rem",
  full: "9999px",
});

// The frosting is fixed at 16 px (`backdrop-blur-lg`) and has no steps.
const PANEL_BLUR = "blur(16px)";

// A branded token an instance without `branding.theme.colors` carries: the
// tile paints no fill rather than a colour it made up, so the author still
// sees the Panel's corners and frosting and no wrong colour.
const UNRESOLVED_COLOR = "transparent";

/**
 * The step the tile paints a Block's text at: the **mobile** column of the
 * contract's text scale (rendering semantics §3), which is the tree the tile
 * paints throughout. The desktop steps go up to `text-5xl` and would not fit
 * a 420 px form column, and stepping them by hand would be a scale the
 * contract does not have.
 */
const TEXT_SIZES = Object.freeze({
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
});

/**
 * „Standard“ text is `text-black dark:text-white` outside a Panel and black in
 * both modes inside one (rendering semantics §8) — and the tile paints the
 * light mode, where the two agree.
 *
 * It is also what a branded token falls back to. A fill the tile cannot
 * resolve paints nothing, but text that painted nothing would simply vanish,
 * so an unresolvable colour keeps the default ink instead.
 */
const DEFAULT_INK = "#000000";

/**
 * The Block's own text, as CSS: the two keys „Darstellung“ sets on it. What
 * a run of words does with a mark of its own belongs to „Inhalt“ and is not
 * painted here.
 *
 * @param {Object} block - The Block as the Draft holds it.
 * @param {Object|null} themeColors - The instance's `branding.theme.colors`.
 * @returns {Object} The style of the Block's copy.
 */
export function heroTextStyle(block, themeColors = null) {
  return {
    fontSize: TEXT_SIZES[block.size] || TEXT_SIZES[HERO_DEFAULT_SIZE],
    color: ink(block.color, themeColors),
  };
}

/**
 * A text colour as the ink it paints. `white` is fixed, the two branded
 * tokens come out of the instance's own colours and a custom `#rrggbb` stands
 * as it is.
 */
function ink(color, themeColors) {
  if (color === "white") {
    return HERO_FIXED_TOKEN_COLORS.white;
  }
  const hex = (themeColors || {})[color] || color;

  return isHeroHexColor(hex) ? hex : DEFAULT_INK;
}

/**
 * What the strip paints where the Background is something the admin cannot
 * repaint: a generated pattern, whose five variants live in the storefront's
 * own generator, or a family whose colour or image is still missing.
 *
 * This is the tile's own chrome and the only colour here that is not a value
 * of the Draft — which is why the strip **names** the pattern beside it,
 * rather than letting a grey pass for one.
 */
const STAND_IN_SURFACE = "#e5e7eb";

/**
 * The strip the tile paints the Block on: the Draft's own Background, in the
 * light mode. The colour mode belongs to the Live-Vorschau's toolbar, which
 * owns the frames the two modes are checked in.
 *
 * The image is cropped to the strip and centred. The focal point is not
 * honoured here: it is a value of „Hintergrund“, which previews it on its own
 * crosshair, and „Darstellung“ sets nothing about it.
 *
 * The families come out of `@/utils/heroBackground`, so a Background that
 * predates a default reads here exactly as it reads in „Hintergrund“ — there
 * is no second normalisation of it.
 *
 * @param {Object|null} background - The Background as the Draft holds it.
 * @returns {Object} The strip: its family, its layers and what to name it.
 */
export function heroTileBackground(background) {
  const family = heroBackgroundFamily(background);
  const normalized = normalizedHeroBackground(background);

  if (family === "color") {
    return strip({ family, surface: normalized.light });
  }
  if (family === "image") {
    const overlay = normalized.overlay.light;

    return strip({
      family,
      // The overlay colour at full opacity is what the contract paints before
      // the image loads, so it is what an image yet to be chosen shows too.
      surface: overlay.color,
      image: normalized.image || null,
      overlayStyle: { backgroundColor: fill(overlay.color, overlay.opacity) },
    });
  }

  return strip({ family, label: variantLabel(normalized.variant) });
}

function strip({
  family,
  surface = null,
  image = null,
  overlayStyle = null,
  label = null,
}) {
  return {
    family,
    style: {
      backgroundColor: isHeroHexColor(surface) ? surface : STAND_IN_SURFACE,
    },
    image,
    overlayStyle,
    label,
  };
}

/** The pattern's German word, out of the one list the section reads (§12). */
function variantLabel(variant) {
  const option = HERO_BACKGROUND_VARIANTS.find(
    (entry) => entry.value === variant
  );

  return option ? option.text : null;
}

/**
 * The three absolute alignments, and „Automatisch“ as the tree without
 * columns reads it.
 *
 * `auto` follows the Zone column on the desktop and centres on mobile, where
 * there are none (rendering semantics §11). The tile paints the mobile tree
 * and shows no Zone, so it centres — a real value of the storefront rather
 * than a Zone the tile would have to guess at.
 */
const ALIGNMENTS = Object.freeze({
  left: "left",
  center: "center",
  right: "right",
});

const AUTO_ALIGNMENT = "center";

/**
 * Where a Block's content sits inside its own box, as CSS.
 *
 * @param {?string} align - The Block's `align`.
 * @returns {Object} The style of the Block's box.
 */
export function heroAlignStyle(align) {
  return { textAlign: ALIGNMENTS[align] || AUTO_ALIGNMENT };
}

/** The six spacing steps of the contract, in rem (rendering semantics §7). */
const SPACINGS = Object.freeze({
  none: "0",
  xs: "0.5rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "3rem",
});

/**
 * The four fixed width steps, in rem (rendering semantics §7). `auto` and
 * `full` are missing on purpose: they are not lengths. `auto` shrinks the box
 * to its content and `full` takes the whole content width, which in the tile
 * is the whole strip.
 */
const WIDTHS = Object.freeze({
  sm: "20rem",
  md: "32rem",
  lg: "48rem",
});

/**
 * How big the Block's own box is: the two keys of „Feinabstimmung“ that decide
 * it, in the contract's own rem.
 *
 * This is what makes „Ausrichtung“ honest. Alignment places content **inside
 * the box** and is therefore only visible once the box is wider than its
 * content (rendering semantics §11) — so a Block at „Breite: Automatisch“ must
 * shrink to fit here exactly as it does in the two frames, or the tile would
 * show a movement the frames will not.
 *
 * The rem are the contract's, not a scale of the tile's own: a width past the
 * 420 px form column is held to the strip by the box's `max-width`, and the
 * strip grows with a generous „Innenabstand“ rather than clipping it, so no
 * step is silently redrawn as another.
 *
 * @param {Object} block - The Block as the Draft holds it.
 * @returns {Object} The size of the Block's box.
 */
export function heroBoxStyle(block) {
  return {
    padding: SPACINGS[block.innerSpacing] || SPACINGS.none,
    width: block.width === "full" ? "100%" : WIDTHS[block.width] || "auto",
  };
}

/**
 * The surface a Block paints behind itself, as CSS.
 *
 * @param {Object|null} panel - The Block's `panel`.
 * @param {Object|null} themeColors - The instance's `branding.theme.colors`.
 * @returns {?Object} The style, or `null` while the Block has no Panel.
 */
export function heroPanelStyle(panel, themeColors = null) {
  if (!panel) {
    return null;
  }

  const style = {
    backgroundColor: fill(panel.color, panel.opacity, themeColors),
    borderRadius: PANEL_RADII[panel.radius],
  };
  // Behind an opaque fill the backdrop filter would only cost a compositing
  // layer, so the contract omits it there (rendering semantics §8).
  if (panel.blur && panel.opacity !== 100) {
    style.backdropFilter = PANEL_BLUR;
  }

  return style;
}

/**
 * A Panel colour as the fill it paints: the two fixed tokens, the two branded
 * ones out of the instance's own colours, or a custom `#rrggbb` as it stands.
 */
function fill(color, opacity, themeColors) {
  const hex =
    HERO_FIXED_TOKEN_COLORS[color] || (themeColors || {})[color] || color;

  return isHeroHexColor(hex) ? rgba(hex, opacity) : UNRESOLVED_COLOR;
}

/** A `#rrggbb` painted at a whole percentage, as the fill of a Panel. */
function rgba(color, opacity) {
  const channels = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));

  return `rgba(${channels.join(", ")}, ${opacity / 100})`;
}
