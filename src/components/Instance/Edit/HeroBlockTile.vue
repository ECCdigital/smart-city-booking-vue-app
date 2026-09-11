<template>
  <div class="hero-block-tile">
    <div class="hero-block-tile__strip" :style="strip.style">
      <MediaReferenceImage
        v-if="strip.image"
        :reference="strip.image"
        :scope="mediaScope"
        size="sm"
        lazy-size="thumb"
        class="hero-block-tile__backdrop"
      />
      <div
        v-if="strip.overlayStyle"
        class="hero-block-tile__overlay"
        :style="strip.overlayStyle"
      ></div>

      <div class="hero-block-tile__box" :style="boxStyle">
        <span v-if="line" class="hero-block-tile__text" :style="textStyle">
          {{ line }}
        </span>
        <MediaReferenceImage
          v-if="block.image"
          :reference="block.image"
          :scope="mediaScope"
          size="sm"
          lazy-size="thumb"
          :height="48"
          contain
          class="hero-block-tile__picture"
        />
      </div>
    </div>

    <p class="hero-block-tile__caption text--secondary text-caption mb-0">
      {{ caption }}
    </p>
  </div>
</template>

<script>
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  heroBlockSummary,
  heroHtmlFirstLine,
  heroLocalizedText,
} from "@/utils/heroBlocks";
import {
  heroAlignStyle,
  heroBoxStyle,
  heroPanelStyle,
  heroTextStyle,
  heroTileBackground,
} from "@/utils/heroTileStyle";

/**
 * What the tile leaves to the two real frames below it. The Zone, the Offset
 * and the Layer are placements of the Block among its neighbours, and a strip
 * that holds one Block has no neighbours to place it against.
 *
 * Inline German, like the rest of `Instance/Edit/` (hero layout spec §12) and
 * like the warning copy of `heroPreviewReport.js`.
 */
const TILE_SCOPE = "Zone, Versatz und Ebene zeigt die Live-Vorschau";

/**
 * The preview tile at the head of „Darstellung“: the Block painted as it will
 * paint, on a strip of the Draft's own Background (hero layout spec §7).
 */
export default {
  name: "HeroBlockTile",
  components: { MediaReferenceImage },
  props: {
    /** The selected Block, exactly as the Draft holds it. */
    block: { type: Object, required: true },
    /** The Draft's Background; `null` is the default one. */
    background: { type: Object, default: null },
    /** The instance's `branding.theme.colors`. */
    themeColors: { type: Object, default: null },
    /** The locale the header toggle selects. */
    locale: { type: String, default: "de" },
  },
  computed: {
    /**
     * The tile has **no `data`**, by decision: every value it paints is a
     * computed of `block`, `background` or `themeColors`, so it cannot show a
     * value the frames do not receive. Even this constant is a computed
     * rather than local state, so that the emptiness of `$data` stays
     * checkable.
     */
    mediaScope() {
      return MEDIA_SCOPE.INSTANCE;
    },
    strip() {
      return heroTileBackground(this.background);
    },
    /**
     * What the tile says about itself: the three things it deliberately does
     * not paint — the Zone, the Offset and the Layer, which place the Block
     * among neighbours a strip holding one Block does not have — so that the
     * author looks for them in the frames rather than here. Plus the name of a
     * generated pattern, the one Background the strip can only stand in for.
     */
    caption() {
      return [this.strip.label, TILE_SCOPE].filter(Boolean).join(" · ");
    },
    /**
     * The Block's own box: how big „Feinabstimmung“ makes it, where
     * „Ausrichtung“ puts the content inside it, and the Panel that paints
     * behind that content — a Block without a Panel gets nothing, not a
     * surface at zero opacity (rendering semantics §8).
     */
    boxStyle() {
      return {
        ...heroBoxStyle(this.block),
        ...heroAlignStyle(this.block.align),
        ...heroPanelStyle(this.block.panel, this.themeColors),
      };
    },
    textStyle() {
      return heroTextStyle(this.block, this.themeColors);
    },
    /**
     * The one line the tile paints. An image Block's content is its image, so
     * it has none; a rich-text Block's is its first line, because a run of
     * words with a mark of its own belongs to „Inhalt“ and not to this
     * section.
     *
     * An empty English text falls back to the German one, which is what the
     * storefront shows there (hero layout spec §4).
     */
    line() {
      if (this.block.type === "image") {
        return "";
      }
      const own =
        this.block.type === "richtext"
          ? heroHtmlFirstLine(heroLocalizedText(this.block.html, this.locale))
          : heroLocalizedText(this.block.text, this.locale);

      return own || heroBlockSummary(this.block);
    },
  },
};
</script>

<style scoped>
/* The strip keeps its height until „Innenabstand“ asks for more: the tile
   paints the contract's own rem, and growing is how a generous step stays that
   step instead of being clipped into a smaller one. A box narrower than the
   strip is centred, the way the mobile tree centres every Block box whatever
   its Zone column (rendering semantics §4). */
.hero-block-tile__strip {
  position: relative;
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}

/* The Background's own image lies under everything, cropped to the strip. */
.hero-block-tile__backdrop,
.hero-block-tile__overlay {
  position: absolute;
  inset: 0;
}

.hero-block-tile__backdrop {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* „Darstellung“ lives in a 420 px column and the Hero itself clips rather than
   growing with its content (rendering semantics §5), so the strip clips too —
   and an unbroken 200-character text breaks rather than widening the column. */
.hero-block-tile__text {
  overflow-wrap: anywhere;
}

/* „Breite“ and „Innenabstand“ come from the Draft, so the box neither grows
   to the strip nor pads itself on its own — it may only shrink, so that a
   width past the 420 px column stays inside it. */
.hero-block-tile__box {
  position: relative;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}

/* „Ausrichtung“ places the content inside the box — so an image has to be
   inline for the alignment to reach it. */
.hero-block-tile__picture {
  display: inline-block;
  max-width: 100%;
}
</style>
