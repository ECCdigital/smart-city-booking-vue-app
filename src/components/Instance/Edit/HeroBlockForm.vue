<template>
  <div class="hero-block-form">
    <SubSection title="Inhalt" :icon="typeIcon" no-margin>
      <template v-if="isText">
        <v-text-field
          :value="text"
          :label="textLabel"
          :counter="maxTextLength"
          :rules="textRules"
          :error-messages="errorOf('text')"
          :placeholder="germanPlaceholder(text)"
          :persistent-placeholder="!!germanPlaceholder(text)"
          :hint="translationHint(text)"
          :persistent-hint="!!translationHint(text)"
          background-color="accent"
          filled
          dense
          class="hero-block-form__text"
          @input="setText"
        />

        <v-select
          :value="size"
          :items="sizeSteps"
          label="Schriftgröße"
          background-color="accent"
          filled
          dense
          @change="patch({ size: $event })"
        />

        <v-switch
          :input-value="block.weight === 'bold'"
          label="Fett"
          color="primary"
          class="mt-0"
          dense
          hide-details
          @change="patch({ weight: $event ? 'bold' : 'normal' })"
        />

        <v-switch
          :input-value="block.shadow"
          label="Schatten für bessere Lesbarkeit"
          color="primary"
          dense
          hide-details
          class="mt-2 mb-4"
          @change="patch({ shadow: !!$event })"
        />

        <HeroColorField
          :value="block.color"
          :theme-colors="themeColors"
          :error="errorOf('color')"
          class="hero-block-form__color"
          @input="patch({ color: $event })"
        />
      </template>

      <template v-else-if="isRichtext">
        <!--
          The Block's own size and colour are what a run of words inherits
          while it carries no class of its own, so the author reads them
          first: they stand above the editor, not under it (hero layout
          spec §7).
        -->
        <div class="hero-block-form__typography d-flex flex-wrap align-start">
          <v-select
            :value="size"
            :items="sizeSteps"
            label="Schriftgröße"
            background-color="accent"
            filled
            dense
            hide-details
            class="hero-block-form__size mr-3 mb-3"
            @change="patch({ size: $event })"
          />

          <HeroColorField
            :value="block.color"
            :theme-colors="themeColors"
            :error="errorOf('color')"
            class="hero-block-form__color"
            @input="patch({ color: $event })"
          />
        </div>

        <div class="text-caption text--secondary mb-1">{{ textLabel }}</div>
        <!--
          One editor per locale view (hero layout spec §7): the key throws the
          instance away when the toggle or the selection moves, so the two
          locales never share an undo history.
        -->
        <Tiptap
          :key="`${block.id}:${locale}`"
          :value="html"
          :label="germanPlaceholder(htmlText)"
          :max-length="maxHtmlLength"
          :min-height="140"
          :theme-colors="themeColors"
          links
          sizes
          colors
          paragraph-align
          class="hero-block-form__richtext mb-1"
          @input="setHtml"
        />
        <div class="hero-block-form__richtext-messages mb-3">
          <div
            v-for="(message, index) in htmlErrors"
            :key="index"
            class="error--text text-caption"
          >
            {{ message }}
          </div>
          <div
            v-if="translationHint(htmlText)"
            class="text--secondary text-caption"
          >
            {{ translationHint(htmlText) }}
          </div>
        </div>

        <v-switch
          :input-value="block.shadow"
          label="Schatten für bessere Lesbarkeit"
          color="primary"
          dense
          hide-details
          class="mt-2"
          @change="patch({ shadow: !!$event })"
        />
      </template>

      <template v-else-if="isImage">
        <MediaReferenceField
          :value="block.image"
          :scope="mediaScope"
          label="Bild"
          kind="image"
          public-only
          :public-only-reason="publicOnlyReason"
          :allow-external="false"
          empty-label="Kein Bild ausgewählt"
          @input="patch({ image: $event })"
        />
        <div
          v-for="(message, index) in imageErrors"
          :key="index"
          class="error--text text-caption mt-1"
        >
          {{ message }}
        </div>
        <MediaReferenceImage
          v-if="block.image"
          :reference="block.image"
          :scope="mediaScope"
          size="sm"
          lazy-size="thumb"
          :height="72"
          contain
          rounded
          class="hero-block-form__thumbnail mt-2"
        />

        <v-text-field
          :value="alt"
          :label="altLabel"
          :counter="maxTextLength"
          :rules="textRules"
          :error-messages="errorOf('alt')"
          :placeholder="germanPlaceholder(alt)"
          :persistent-placeholder="!!germanPlaceholder(alt)"
          :hint="altHintOf(alt)"
          persistent-hint
          background-color="accent"
          filled
          dense
          class="hero-block-form__alt mt-4"
          @input="setAlt"
        />

        <v-select
          :value="block.maxHeight"
          :items="maxHeightSteps"
          label="Maximale Höhe"
          background-color="accent"
          filled
          dense
          class="mt-6"
          @change="patch({ maxHeight: $event })"
        />

        <v-switch
          :input-value="block.invertInDarkMode"
          label="Im Dunkelmodus invertieren"
          hint="Für dunkle Logos auf hellem Grund"
          persistent-hint
          color="primary"
          class="mt-0"
          dense
          @change="patch({ invertInDarkMode: !!$event })"
        />
      </template>
    </SubSection>

    <SubSection class="mt-6" title="Position" icon="mdi-crosshairs">
      <HeroPositionGrid
        :block="block"
        :blocks="blocks"
        @input="$emit('update:zone', $event)"
      />
    </SubSection>

    <SubSection class="mt-6" title="Darstellung" icon="mdi-tune">
      <div class="hero-block-form__panel">
        <div class="d-flex align-center">
          <v-switch
            :input-value="hasPanel"
            label="Fläche hinter dem Block"
            color="primary"
            class="mt-0 mb-0"
            dense
            hide-details
            @change="patch({ panel: $event ? heroGlassPanel() : null })"
          />
          <v-spacer />
          <v-chip
            class="hero-block-form__glass"
            small
            outlined
            title="Fläche auf „Glas“ zurücksetzen"
            @click="patch({ panel: heroGlassPanel() })"
          >
            <v-icon x-small left>mdi-blur</v-icon>
            Glas
          </v-chip>
        </div>

        <template v-if="hasPanel">
          <HeroColorField
            :value="block.panel.color"
            :theme-colors="themeColors"
            :tokens="panelColorTokens"
            :error="errorOf('panel.color')"
            class="hero-block-form__panel-color mt-1"
            @input="patchPanel({ color: $event })"
          />

          <v-slider
            :value="block.panel.opacity"
            label="Deckkraft"
            min="0"
            max="100"
            step="1"
            thumb-label
            :error-messages="errorOf('panel.opacity')"
            :hide-details="!errorOf('panel.opacity')"
            class="hero-block-form__opacity mt-2"
            @input="patchPanel({ opacity: $event })"
          >
            <template #append>
              <span class="text-caption text--secondary">
                {{ block.panel.opacity }} %
              </span>
            </template>
          </v-slider>

          <div class="text-caption text--secondary mt-2 mb-1">Ecken</div>
          <v-btn-toggle
            :value="block.panel.radius"
            mandatory
            dense
            class="hero-block-form__corners mb-2"
            @change="patchPanel({ radius: $event })"
          >
            <v-btn
              v-for="step in cornerSteps"
              :key="step.value"
              :value="step.value"
              class="hero-block-form__corner"
              :title="step.text"
              :aria-label="step.text"
              :aria-pressed="String(block.panel.radius === step.value)"
              small
              text
            >
              <span
                class="hero-block-form__corner-glyph"
                :style="{ borderRadius: step.glyph }"
              />
            </v-btn>
          </v-btn-toggle>

          <v-switch
            :input-value="block.panel.blur"
            label="Hintergrund weichzeichnen"
            color="primary"
            class="mt-0"
            dense
            hide-details
            @change="patchPanel({ blur: !!$event })"
          />
        </template>
      </div>

      <div class="hero-block-form__lage mt-4">
        <div class="text-caption text--secondary mb-1">Lage</div>
        <div class="d-flex align-center">
          <div class="hero-block-form__pad">
            <v-btn
              v-for="pad in padCells"
              :key="pad.label"
              class="hero-block-form__nudge"
              :title="pad.label"
              :aria-label="pad.label"
              :disabled="pad.disabled"
              outlined
              depressed
              small
              @click="nudge(pad)"
            >
              <v-icon small>{{ pad.icon }}</v-icon>
            </v-btn>
          </div>
          <div
            class="hero-block-form__versatz text-caption text--secondary ml-3"
          >
            {{ offsetReadout }}
          </div>
        </div>

        <v-switch
          :input-value="block.layer === 'front'"
          label="Im Vordergrund"
          color="primary"
          class="mt-2"
          dense
          hide-details
          @change="patch({ layer: $event ? 'front' : 'back' })"
        />
      </div>

      <v-expansion-panels flat class="hero-block-form__fine mt-4">
        <v-expansion-panel>
          <v-expansion-panel-header color="accent" class="px-3">
            Feinabstimmung
          </v-expansion-panel-header>
          <v-expansion-panel-content color="accent" class="pt-3">
            <v-select
              :value="block.align"
              :items="alignSteps"
              label="Ausrichtung"
              :hint="alignHint"
              persistent-hint
              background-color="accent"
              filled
              dense
              class="mb-4"
              @change="patch({ align: $event })"
            />
            <v-select
              :value="block.outerSpacing"
              :items="spacingSteps"
              label="Außenabstand"
              background-color="accent"
              filled
              dense
              @change="patch({ outerSpacing: $event })"
            />
            <v-select
              :value="block.innerSpacing"
              :items="spacingSteps"
              label="Innenabstand"
              background-color="accent"
              filled
              dense
              @change="patch({ innerSpacing: $event })"
            />
            <v-select
              :value="block.width"
              :items="widthSteps"
              label="Breite"
              background-color="accent"
              filled
              dense
              hide-details
              @change="patch({ width: $event })"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </SubSection>

    <SubSection class="mt-6" title="Sichtbarkeit" icon="mdi-eye-outline">
      <v-switch
        :input-value="block.homeOnly"
        label="Nur auf der Startseite anzeigen"
        color="primary"
        class="mt-0"
        dense
        hide-details
        @change="patch({ homeOnly: !!$event })"
      />
      <v-switch
        :input-value="block.hideOnMobile"
        label="Auf Mobilgeräten ausblenden"
        color="primary"
        class="mt-2"
        dense
        hide-details
        @change="patch({ hideOnMobile: !!$event })"
      />
    </SubSection>
  </div>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import HeroColorField from "@/components/Instance/Edit/HeroColorField.vue";
import HeroPositionGrid from "@/components/Instance/Edit/HeroPositionGrid.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  heroBlockSummary,
  heroBlockType,
  heroGlassPanel,
  heroHtmlFirstLine,
  heroLocalizedText,
  setHeroLocalizedText,
} from "@/utils/heroBlocks";
import {
  HERO_NUDGE_CELLS,
  NO_HERO_OFFSET,
  heroOffsetReadout,
  heroOffsetStep,
  isHeroOffsetStepPossible,
  isHeroOffsetZero,
} from "@/utils/heroOffset";
import {
  HERO_PANEL_COLOR_TOKENS,
  HERO_RICHTEXT_MAX_LENGTH,
  HERO_TEXT_MAX_LENGTH,
  firstHeroRuleError,
  heroImageRules,
  heroRichtextRules,
  heroTextRules,
} from "@/utils/heroBlockValidation";

// The six spacing steps of the contract, in the wording of the spec (§12).
const SPACING_STEPS = Object.freeze([
  { value: "none", text: "Kein" },
  { value: "xs", text: "Sehr klein" },
  { value: "sm", text: "Klein" },
  { value: "md", text: "Mittel" },
  { value: "lg", text: "Groß" },
  { value: "xl", text: "Sehr groß" },
]);

// „Ausrichtung“ places a Block's content inside its own box, on every type —
// the lines of a text, the image of an image Block (hero layout spec §11).
const ALIGN_STEPS = Object.freeze([
  { value: "auto", text: "Automatisch" },
  { value: "left", text: "Links" },
  { value: "center", text: "Zentriert" },
  { value: "right", text: "Rechts" },
]);

const WIDTH_STEPS = Object.freeze([
  { value: "auto", text: "Automatisch" },
  { value: "sm", text: "Schmal" },
  { value: "md", text: "Mittel" },
  { value: "lg", text: "Breit" },
  { value: "full", text: "Volle Breite" },
]);

// What the contract stores when nobody picked a size (`@/utils/heroBlocks`),
// so a Block that carries none still reads as the step it will be saved as.
const DEFAULT_SIZE = "md";

const SIZE_STEPS = Object.freeze([
  { value: "xs", text: "Sehr klein" },
  { value: "sm", text: "Klein" },
  { value: "md", text: "Normal" },
  { value: "lg", text: "Groß" },
  { value: "xl", text: "Sehr groß" },
  { value: "2xl", text: "Riesig" },
]);

// The five steps `image.maxHeight` knows. A height is „Mittel“, not „Normal“ —
// the same word the widths use for their middle step (hero layout spec §12).
const MAX_HEIGHT_STEPS = Object.freeze([
  { value: "xs", text: "Sehr klein" },
  { value: "sm", text: "Klein" },
  { value: "md", text: "Mittel" },
  { value: "lg", text: "Groß" },
  { value: "xl", text: "Sehr groß" },
]);

/**
 * The five corner steps of a Panel (Shared contract, „Panel“). The glyph is
 * the step itself — a box drawn with that corner — rather than an icon that
 * stands for it, so the row reads as the scale it is. `glyph` is the admin's
 * own drawing; the storefront's real radii follow `--ui-radius`.
 */
const CORNER_STEPS = Object.freeze([
  { value: "none", text: "Kein", glyph: "0" },
  { value: "sm", text: "Klein", glyph: "2px" },
  { value: "md", text: "Mittel", glyph: "4px" },
  { value: "lg", text: "Groß", glyph: "7px" },
  { value: "full", text: "Rund", glyph: "50%" },
]);

// An image Block is painted on the public portal, so it may only ever point at
// a public medium — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Der Kopfbereich wird öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

// What an empty English field does, said at the field itself (spec §4). German
// is the required locale, so it never carries the hint.
const TRANSLATION_HINT = "Leer: Deutsch wird angezeigt";

const ALT_HINT = "Wird vorgelesen und angezeigt, wenn das Bild fehlt";

// What „Ausrichtung“ says about itself, and what it adds while the Block has
// no width to spare (hero layout spec §7).
const ALIGN_HINT = "Automatisch folgt der Spalte der Position.";
const ALIGN_NEEDS_WIDTH_HINT = "Wirkt erst ab einer festen Breite.";

/**
 * The detail form of the selected Block: „Inhalt“ → „Position“ →
 * „Darstellung“ → „Sichtbarkeit“ (hero layout spec §7).
 *
 * The form owns no copy of the Block. It reads the one the editor holds and
 * answers with a **patch** — the keys that changed — so that a Draft never
 * drifts from what the form shows. The Zone is the exception: moving a Block
 * reorders the array, which is a rule of `@/utils/heroBlocks` and not of this
 * component, so the grid's answer travels up as `update:zone`.
 */
export default {
  name: "HeroBlockForm",
  components: {
    HeroColorField,
    HeroPositionGrid,
    MediaReferenceField,
    MediaReferenceImage,
    SubSection,
    Tiptap,
  },
  props: {
    /** The selected Block. */
    block: { type: Object, required: true },
    /** Every Block of the layout — the Position grid counts with them. */
    blocks: { type: Array, required: true },
    /** The locale the header toggle selects. */
    locale: { type: String, default: "de" },
    /** The instance's `branding.theme.colors`, for the colour chips. */
    themeColors: { type: Object, default: null },
    /**
     * What a backend `400` said about this Block, as `{ field: message }` —
     * already narrowed by the editor, which owns the toggle and knows which
     * faults a control here can carry (`isHeroInlineBlockError`). The rest is
     * listed at the „Blöcke“ section instead (hero layout spec §9).
     */
    errors: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      spacingSteps: SPACING_STEPS,
      alignSteps: ALIGN_STEPS,
      widthSteps: WIDTH_STEPS,
      sizeSteps: SIZE_STEPS,
      maxHeightSteps: MAX_HEIGHT_STEPS,
      maxTextLength: HERO_TEXT_MAX_LENGTH,
      maxHtmlLength: HERO_RICHTEXT_MAX_LENGTH,
      panelColorTokens: HERO_PANEL_COLOR_TOKENS,
      cornerSteps: CORNER_STEPS,
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
    };
  },
  computed: {
    isText() {
      return this.block.type === "text";
    },
    /**
     * The step the „Schriftgröße“ select stands at. A text and a rich-text
     * Block read it the same way — for the rich text it is also what a run of
     * words inherits while it carries no size of its own (hero layout spec §7).
     */
    size() {
      return this.block.size || DEFAULT_SIZE;
    },
    /**
     * The pad's nine cells with the state of each: a direction that has run
     * out of grid and the reset of a Block that has not moved are both cells
     * with nothing left to do, so both are disabled rather than clickable and
     * inert.
     */
    padCells() {
      const offset = this.block.offset;

      return HERO_NUDGE_CELLS.map((pad) => ({
        ...pad,
        disabled: pad.reset
          ? isHeroOffsetZero(offset)
          : !isHeroOffsetStepPossible(offset, pad),
      }));
    },
    /**
     * What the pad has done, in the unit the pad works in: a click is a step,
     * so the readout counts steps and leaves the stored rem to the contract
     * (hero layout spec §7).
     */
    offsetReadout() {
      return heroOffsetReadout(this.block.offset);
    },
    /** Whether the Block paints a Panel — the state of the group's switch. */
    hasPanel() {
      return this.block.panel != null;
    },
    isRichtext() {
      return this.block.type === "richtext";
    },
    isImage() {
      return this.block.type === "image";
    },
    typeIcon() {
      return heroBlockType(this.block.type).icon;
    },
    text() {
      return heroLocalizedText(this.block.text, this.locale);
    },
    html() {
      return heroLocalizedText(this.block.html, this.locale);
    },
    alt() {
      return heroLocalizedText(this.block.alt, this.locale);
    },
    /**
     * The rich text as a line of text. The editor's own value is markup, and
     * an emptied editor answers `<p></p>` — nothing the placeholder rule may
     * read as „there is something here“.
     */
    htmlText() {
      return heroHtmlFirstLine(this.html);
    },
    /**
     * The German text the English view offers as its placeholder — the same
     * line the Block's row shows, whichever localised field its type carries.
     */
    germanText() {
      return heroBlockSummary(this.block);
    },
    /** German is the required locale, so only it is marked as one. */
    textLabel() {
      return this.locale === "de" ? "Text" : "Text (English)";
    },
    altLabel() {
      return this.locale === "de"
        ? "Alternativtext"
        : "Alternativtext (English)";
    },
    textRules() {
      return heroTextRules(this.locale);
    },
    /**
     * The editor and the media field take no Vuetify `rules`, so the form runs
     * them itself and writes the message underneath.
     */
    htmlErrors() {
      return [
        firstHeroRuleError(heroRichtextRules(this.locale), this.html),
        this.errorOf("html"),
      ].filter(Boolean);
    },
    /**
     * A Block whose width is „Automatisch“ shrinks to fit its content, so
     * there is no room inside it to align anything in — the alignment is set
     * and stored, it simply has nothing to do yet.
     */
    alignHint() {
      return this.block.width === "auto"
        ? `${ALIGN_HINT} ${ALIGN_NEEDS_WIDTH_HINT}`
        : ALIGN_HINT;
    },
    imageErrors() {
      return [
        firstHeroRuleError(heroImageRules, this.block.image),
        this.errorOf("image"),
      ].filter(Boolean);
    },
  },
  methods: {
    /**
     * The Panel the switch writes when it is turned on. The Panel is an object
     * of four keys and this form has controls for none of them yet, so the
     * switch writes the „Glas“ preset whole and `null` back.
     *
     * @returns {Object} A fresh „Glas“ Panel.
     */
    heroGlassPanel,
    /**
     * What the English view puts into an empty field: the German text, which
     * is what the storefront shows there. An empty German text has nothing to
     * offer and leaves the placeholder off (hero layout spec §4).
     */
    germanPlaceholder(value) {
      return this.locale === "de" || value ? "" : this.germanText;
    },
    /** Why an English field may be left empty; German has no such choice. */
    translationHint(value) {
      return this.locale === "de" || value ? "" : TRANSLATION_HINT;
    },
    /**
     * „Alternativtext“ already explains what it is for, and a translator needs
     * that as much as an author does — so the English view adds its hint to
     * that one rather than replacing it.
     */
    altHintOf(value) {
      return [this.translationHint(value), ALT_HINT]
        .filter(Boolean)
        .join(" · ");
    },
    errorOf(field) {
      return this.errors[field] || null;
    },
    setText(value) {
      this.patch({
        text: setHeroLocalizedText(this.block.text, this.locale, value),
      });
    },
    setHtml(value) {
      this.patch({
        html: setHeroLocalizedText(this.block.html, this.locale, value),
      });
    },
    setAlt(value) {
      this.patch({
        alt: setHeroLocalizedText(this.block.alt, this.locale, value),
      });
    },
    /**
     * One click of the pad: one step of 0.5 rem in that cell's direction, or
     * back to nought at the middle cell.
     */
    nudge(pad) {
      this.patch({
        offset: pad.reset
          ? { ...NO_HERO_OFFSET }
          : heroOffsetStep(this.block.offset, pad),
      });
    },
    /**
     * One key of the Panel. Each control of the group writes exactly its own,
     * so the other three keep whatever the author set them to.
     */
    patchPanel(fields) {
      this.patch({ panel: { ...this.block.panel, ...fields } });
    },
    patch(fields) {
      this.$emit("input", fields);
    },
  },
};
</script>

<style scoped>
/* „Schriftgröße“ and the colour control stand beside each other above the
   editor. The column is 420 px wide, so the select keeps a readable width and
   the chips take what is left, wrapping rather than overflowing. */
.hero-block-form__size {
  flex: 0 1 150px;
}

.hero-block-form__typography .hero-block-form__color {
  flex: 1 1 180px;
}

/* The corner steps are drawn, not named: each button carries a box with that
   step's radius, and the German word rides along as its label. */
.hero-block-form__corner-glyph {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
}

/* „Darstellung“ lives in a 420 px column, so nothing in it may push sideways:
   the steps wrap rather than overflow, and the chip keeps its width whatever
   the switch beside it asks for. */
.hero-block-form__corners {
  flex-wrap: wrap;
}

.hero-block-form__glass {
  flex: 0 0 auto;
}

/* „Lage“ reads as placement, so its cells are a square 3x3 pad rather than a
   row of controls — and a `v-btn` sizes itself by its content, so the grid has
   to overrule its width and height. */
.hero-block-form__pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: 120px;
  flex: 0 0 auto;
}

.hero-block-form__nudge.v-btn {
  min-width: 0;
  width: 100%;
  height: 36px;
  padding: 0;
}
</style>
