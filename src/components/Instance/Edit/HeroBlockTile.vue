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
  heroPanelStyle,
  heroTextStyle,
  heroTileBackground,
} from "@/utils/heroTileStyle";

/**
 * What the tile leaves to the two real frames below it. The Zone, the Offset
 * and the Layer are placements of the Block among its neighbours, and a strip
 * that holds one Block has no neighbours to place it against.
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
     * not paint, so that the author looks for them in the frames rather than
     * here — and the name of a generated pattern, which is the one Background
     * the strip can only stand in for.
     */
    caption() {
      return [this.strip.label, TILE_SCOPE].filter(Boolean).join(" · ");
    },
    /**
     * The Block's own box. The Panel paints behind the Block's content, so it
     * is this box that carries it — and a Block without a Panel gets nothing,
     * not a surface at zero opacity (rendering semantics §8).
     */
    boxStyle() {
      return {
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
.hero-block-tile__strip {
  position: relative;
  height: 88px;
  display: flex;
  align-items: center;
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

.hero-block-tile__box {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px;
}

/* „Ausrichtung“ places the content inside the box, and the box is the whole
   strip — so an image has to be inline for the alignment to reach it. */
.hero-block-tile__picture {
  display: inline-block;
  max-width: 100%;
}
</style>
