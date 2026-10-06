<template>
  <v-card outlined class="hero-block-form rounded-lg">
    <!--
      The card names the Block before anything is set on it: the list marks
      the selected row, this head says the same in words, and the primary
      rule on the card's left is the one the selected row carries.
    -->
    <div class="hero-block-form__head d-flex align-center px-4 pt-3 pb-2">
      <div class="hero-block-form__glyph mr-3">
        <v-icon small>{{ typeIcon }}</v-icon>
      </div>
      <div class="hero-block-form__naming">
        <div class="text-subtitle-2 text-truncate hero-block-form__title">
          {{ title }}
        </div>
        <div class="text-caption text--secondary hero-block-form__whereabouts">
          {{ whereabouts }}
        </div>
      </div>
    </div>

    <!--
      The four sections of the spec as tabs (§7): the active one names what
      is being set, the bar lists what else there is to set. A section that
      carries a refused field says so with a dot, because its message is out
      of sight while another section is open.
    -->
    <v-tabs
      v-model="tab"
      grow
      height="40"
      slider-size="3"
      class="hero-block-form__tabs"
    >
      <v-tab
        v-for="section in sections"
        :key="section.key"
        :href="`#${section.key}`"
        :data-section="section.key"
        class="hero-block-form__tab"
      >
        {{ section.title }}
        <span
          v-if="section.faulted"
          class="hero-block-form__tab-dot"
          :title="faultedTitle"
        />
      </v-tab>
    </v-tabs>
    <v-divider />

    <!--
      Every pane is rendered from the start (`eager`): the rich-text editor
      keeps its undo history across a tab switch, and a message under a field
      of another pane still has its field to stand under.
    -->
    <v-tabs-items v-model="tab" class="hero-block-form__panes">
      <v-tab-item value="inhalt" eager class="hero-block-form__pane">
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

          <!--
            A text is formatted in the grammar of the rich-text leiste: the
            caption in the left column, the control beside it, one property
            per row. „Zeichen“ carries the one mark a text Block has, „Fett“;
            „Schriftgröße“ is the same six-step scale the leiste shows, the
            German word in the tooltip (hero layout spec §7).
          -->
          <div class="hero-block-form__format">
            <div class="hero-block-form__format-row">
              <span
                class="hero-block-form__format-caption text-caption text--secondary"
              >
                Zeichen
              </span>
              <div class="hero-block-form__format-controls">
                <v-btn-toggle
                  :value="isBold ? 'bold' : null"
                  dense
                  color="primary"
                  class="hero-block-form__weight"
                  @change="patch({ weight: $event ? 'bold' : 'normal' })"
                >
                  <v-btn
                    value="bold"
                    class="hero-block-form__bold"
                    title="Fett"
                    aria-label="Fett"
                    :aria-pressed="String(isBold)"
                    small
                  >
                    <v-icon small>mdi-format-bold</v-icon>
                  </v-btn>
                </v-btn-toggle>
              </div>
            </div>

            <div class="hero-block-form__format-row">
              <span
                class="hero-block-form__format-caption text-caption text--secondary"
              >
                Schriftgröße
              </span>
              <div class="hero-block-form__format-controls">
                <v-btn-toggle
                  :value="size"
                  mandatory
                  dense
                  color="primary"
                  class="hero-block-form__size"
                  @change="patch({ size: $event })"
                >
                  <v-btn
                    v-for="step in sizeSteps"
                    :key="step.value"
                    :value="step.value"
                    class="hero-block-form__size-step"
                    :title="step.text"
                    :aria-label="step.text"
                    :aria-pressed="String(size === step.value)"
                    small
                  >
                    {{ step.short }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </div>

            <div class="hero-block-form__format-row">
              <span
                class="hero-block-form__format-caption text-caption text--secondary"
              >
                Farbe
              </span>
              <HeroColorField
                :value="block.color"
                :theme-colors="themeColors"
                :error="errorOf('color')"
                label=""
                class="hero-block-form__color"
                @input="patch({ color: $event })"
              />
            </div>
          </div>

          <v-switch
            :input-value="block.shadow"
            label="Schatten für bessere Lesbarkeit"
            color="primary"
            dense
            hide-details
            class="mt-3"
            @change="patch({ shadow: !!$event })"
          />
        </template>

        <template v-else-if="isRichtext">
          <!--
          A rich-text Block offers no size and no colour of its own in the
          form: every run of words takes both from the leiste, and one that
          carries no class follows the Block's stored defaults (hero layout
          spec §7).
        -->
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
      </v-tab-item>

      <v-tab-item value="position" eager class="hero-block-form__pane">
        <HeroPositionGrid
          :block="block"
          :blocks="blocks"
          @input="$emit('update:zone', $event)"
        />
      </v-tab-item>

      <v-tab-item value="darstellung" eager class="hero-block-form__pane">
        <!--
        „Darstellung“ opens with the tile, so an author reads what
        „Deckkraft 40“ means before looking at the frames (spec §7).
      -->
        <HeroBlockTile
          :block="block"
          :background="background"
          :theme-colors="themeColors"
          :locale="locale"
          class="hero-block-form__tile mb-4"
        />

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
          <div class="d-flex align-start">
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
            <!--
              „Lage“ is the group; „Versatz“ and „Im Vordergrund“ are the two
              things in it, so the readout carries its own name (spec §12) and
              the two stand together beside the pad they belong to.
            -->
            <div class="hero-block-form__lage-side ml-4">
              <div class="hero-block-form__versatz">
                <div
                  class="hero-block-form__versatz-label text-caption text--secondary"
                >
                  Versatz
                </div>
                <div class="text-body-2">{{ offsetReadout }}</div>
              </div>
              <v-switch
                :input-value="block.layer === 'front'"
                label="Im Vordergrund"
                color="primary"
                class="mt-3"
                dense
                hide-details
                @change="patch({ layer: $event ? 'front' : 'back' })"
              />
            </div>
          </div>
        </div>

        <!--
          The four inherited controls stay folded; the row reads their values
          while closed, the way „Höhe“ and „Hintergrund“ do above the list.
        -->
        <v-expansion-panels flat class="hero-block-form__fine mt-4">
          <v-expansion-panel class="hero-block-form__fine-panel">
            <v-expansion-panel-header class="hero-block-form__fine-header">
              <div class="d-flex align-center">
                <v-icon small class="mr-3" color="grey"
                  >mdi-tune-variant</v-icon
                >
                <div class="hero-block-form__fine-text">
                  <div class="text-subtitle-2">Feinabstimmung</div>
                  <div
                    class="text-caption text--secondary hero-block-form__fine-summary"
                  >
                    {{ fineSummary }}
                  </div>
                </div>
              </div>
            </v-expansion-panel-header>
            <v-expansion-panel-content class="hero-block-form__fine-body">
              <!--
                Four scales, no selects: every step stands on the row, the
                pressed one is the value, and the word beside the label says
                what a short step stands for („S“ is „Klein“).
              -->
              <div
                v-for="field in fineFields"
                :key="field.key"
                class="hero-block-form__fine-field"
                :data-field="field.key"
              >
                <div class="d-flex align-baseline mb-1">
                  <span
                    class="text-caption text--secondary hero-block-form__fine-label"
                  >
                    {{ field.label }}
                  </span>
                  <v-spacer />
                  <span class="text-caption hero-block-form__fine-value">
                    {{ field.current }}
                  </span>
                </div>
                <v-btn-toggle
                  :value="block[field.key]"
                  mandatory
                  dense
                  color="primary"
                  class="hero-block-form__fine-steps"
                  @change="patchFine(field.key, $event)"
                >
                  <v-btn
                    v-for="step in field.steps"
                    :key="step.value"
                    :value="step.value"
                    class="hero-block-form__fine-step"
                    :title="step.text"
                    :aria-label="step.text"
                    small
                    text
                  >
                    {{ step.short || step.text }}
                  </v-btn>
                </v-btn-toggle>
                <div
                  v-if="field.hint"
                  class="text-caption text--secondary mt-1 hero-block-form__fine-hint"
                >
                  {{ field.hint }}
                </div>
              </div>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-tab-item>

      <v-tab-item value="sichtbarkeit" eager class="hero-block-form__pane">
        <v-switch
          :input-value="block.homeOnly"
          label="Nur auf der Startseite anzeigen"
          :hint="homeOnlyHint"
          persistent-hint
          color="primary"
          class="mt-0"
          dense
          @change="patch({ homeOnly: !!$event })"
        />
        <v-switch
          :input-value="block.hideOnMobile"
          label="Auf Mobilgeräten ausblenden"
          :hint="hideOnMobileHint"
          persistent-hint
          color="primary"
          class="mt-4"
          dense
          @change="patch({ hideOnMobile: !!$event })"
        />
      </v-tab-item>
    </v-tabs-items>
  </v-card>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import HeroBlockTile from "@/components/Instance/Edit/HeroBlockTile.vue";
import HeroColorField from "@/components/Instance/Edit/HeroColorField.vue";
import HeroPositionGrid from "@/components/Instance/Edit/HeroPositionGrid.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  HERO_DEFAULT_SIZE,
  HERO_ZONE_LABELS,
  heroBlockLabel,
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
//
// `short` is what the step's button carries in the 420 px column; `text` is
// the German word, shown beside the label for the pressed step and as the
// button's title.
const SPACING_STEPS = Object.freeze([
  { value: "none", text: "Kein", short: "Kein" },
  { value: "xs", text: "Sehr klein", short: "XS" },
  { value: "sm", text: "Klein", short: "S" },
  { value: "md", text: "Mittel", short: "M" },
  { value: "lg", text: "Groß", short: "L" },
  { value: "xl", text: "Sehr groß", short: "XL" },
]);

// „Ausrichtung“ places a Block's content inside its own box, on every type —
// the lines of a text, the image of an image Block (hero layout spec §11).
//
// Deliberately duplicated: Tiptap.vue reads the same three words from
// `richtext.align.*` via $t, its own established pattern, while `Instance/Edit/`
// stays inline German per spec §12 — the two conventions cannot share a source.
const ALIGN_STEPS = Object.freeze([
  { value: "auto", text: "Automatisch" },
  { value: "left", text: "Links" },
  { value: "center", text: "Zentriert" },
  { value: "right", text: "Rechts" },
]);

const WIDTH_STEPS = Object.freeze([
  { value: "auto", text: "Automatisch", short: "Auto" },
  { value: "sm", text: "Schmal", short: "S" },
  { value: "md", text: "Mittel", short: "M" },
  { value: "lg", text: "Breit", short: "L" },
  { value: "full", text: "Volle Breite", short: "Voll" },
]);

/**
 * The German word of a step, for the value beside a label and the folded
 * row's summary.
 *
 * @param {Array} steps - One of the scales above.
 * @param {string} value - The stored value.
 * @returns {string} The word, or the value itself when no step carries it.
 */
function stepWord(steps, value) {
  const step = steps.find((entry) => entry.value === value);
  return step ? step.text : value;
}

// The six steps of „Schriftgröße“ (hero layout spec §12). `short` is what the
// step's button shows, the same symbol the leiste's scale shows; `text` is
// the German word, the button's tooltip.
//
// Deliberately duplicated: Tiptap.vue reads the same six words from
// `richtext.size.*` via $t, its own established pattern, while `Instance/Edit/`
// stays inline German per spec §12 — the two conventions cannot share a source.
const SIZE_STEPS = Object.freeze([
  { value: "xs", text: "Sehr klein", short: "XS" },
  { value: "sm", text: "Klein", short: "S" },
  { value: "md", text: "Normal", short: "M" },
  { value: "lg", text: "Groß", short: "L" },
  { value: "xl", text: "Sehr groß", short: "XL" },
  { value: "2xl", text: "Riesig", short: "2XL" },
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

// What the two switches of „Sichtbarkeit“ do, said at the switch.
const HOME_ONLY_HINT =
  "Der kompakte Kopfbereich der Unterseiten lässt den Block aus.";
const HIDE_ON_MOBILE_HINT =
  "Auf schmalen Bildschirmen wird der Block nicht gezeigt.";

// The four sections of the detail form, in the order of the spec (§7), as
// the tabs of the Block's card.
const SECTIONS = Object.freeze([
  { key: "inhalt", title: "Inhalt" },
  { key: "position", title: "Position" },
  { key: "darstellung", title: "Darstellung" },
  { key: "sichtbarkeit", title: "Sichtbarkeit" },
]);

const FAULTED_TITLE = "Enthält eine Angabe, die der Server ablehnt";

/**
 * The section a refused field's message stands in — so the tab can show a
 * dot while another one is open. Everything the editor has no place for
 * lands at the „Blöcke“ section instead and never reaches this form.
 *
 * @param {string} field - The key as `errors` carries it.
 * @returns {string} A key of `SECTIONS`.
 */
function sectionOfField(field) {
  if (field === "zone") {
    return "position";
  }
  if (field === "homeOnly" || field === "hideOnMobile") {
    return "sichtbarkeit";
  }
  if (
    /^(panel|offset)\./.test(field) ||
    ["layer", "align", "outerSpacing", "innerSpacing", "width"].includes(field)
  ) {
    return "darstellung";
  }
  return "inhalt";
}

// What „Ausrichtung“ says about itself, and what it adds while the Block has
// no width to spare (hero layout spec §7).
const ALIGN_HINT = "Automatisch folgt der Spalte der Position.";
const ALIGN_NEEDS_WIDTH_HINT = "Wirkt erst ab einer festen Breite.";

/**
 * The detail form of the selected Block, as one card: its head names the
 * Block, its type and its Zone, and the four sections of the spec —
 * „Inhalt“ → „Position“ → „Darstellung“ → „Sichtbarkeit“ (hero layout spec
 * §7) — are its tabs. The tab an author stands on stays when the selection
 * moves to another Block, so two Blocks are compared on the same section.
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
    HeroBlockTile,
    HeroColorField,
    HeroPositionGrid,
    MediaReferenceField,
    MediaReferenceImage,
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
     * The Draft's Background, for the preview tile alone: the tile paints the
     * Block on a strip of it, so a translucent Panel has something to be
     * translucent against (hero layout spec §7). No control of this form
     * writes it — „Hintergrund“ owns it.
     */
    background: { type: Object, default: null },
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
      sizeSteps: SIZE_STEPS,
      maxHeightSteps: MAX_HEIGHT_STEPS,
      maxTextLength: HERO_TEXT_MAX_LENGTH,
      maxHtmlLength: HERO_RICHTEXT_MAX_LENGTH,
      panelColorTokens: HERO_PANEL_COLOR_TOKENS,
      cornerSteps: CORNER_STEPS,
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
      homeOnlyHint: HOME_ONLY_HINT,
      hideOnMobileHint: HIDE_ON_MOBILE_HINT,
      faultedTitle: FAULTED_TITLE,
      // The open section. Editor state, like the selection: never saved.
      tab: "inhalt",
    };
  },
  computed: {
    /** The card's title: the Block's first German line, or its type. */
    title() {
      return heroBlockLabel(this.block);
    },
    /** The card's second line: what kind of Block, and where it sits. */
    whereabouts() {
      const zone = HERO_ZONE_LABELS[this.block.zone] || this.block.zone;

      return `${heroBlockType(this.block.type).label} an Position „${zone}“`;
    },
    /** What the folded „Feinabstimmung“ row says: its four values, in one line. */
    fineSummary() {
      return this.fineFields
        .map((field) => `${field.label} ${field.current}`)
        .join(", ");
    },
    /**
     * The four inherited controls as scales: which key, which steps, the word
     * of the pressed step and, for „Ausrichtung“, its hint.
     */
    fineFields() {
      return [
        {
          key: "align",
          label: "Ausrichtung",
          steps: ALIGN_STEPS,
          hint: this.alignHint,
        },
        { key: "outerSpacing", label: "Außenabstand", steps: SPACING_STEPS },
        { key: "innerSpacing", label: "Innenabstand", steps: SPACING_STEPS },
        { key: "width", label: "Breite", steps: WIDTH_STEPS },
      ].map((field) => ({
        ...field,
        current: stepWord(field.steps, this.block[field.key]),
      }));
    },
    /** The sections whose tab carries a dot. */
    faultedSections() {
      return Object.keys(this.errors)
        .filter((field) => this.errors[field])
        .map(sectionOfField);
    },
    sections() {
      return SECTIONS.map((section) => ({
        ...section,
        faulted: this.faultedSections.includes(section.key),
      }));
    },
    isText() {
      return this.block.type === "text";
    },
    /**
     * The pressed step of a text Block's „Schriftgröße“ scale; a Block that
     * stores none reads as „Normal“, the default the contract fills in on
     * save (hero layout spec §7).
     */
    size() {
      return this.block.size || HERO_DEFAULT_SIZE;
    },
    isBold() {
      return this.block.weight === "bold";
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
    /** One step of one of the four scales of „Feinabstimmung“. */
    patchFine(key, value) {
      this.patch({ [key]: value });
    },
    patch(fields) {
      this.$emit("input", fields);
    },
  },
};
</script>

<style scoped>
/* The card continues the rule of the selected row: one primary line down the
   left, and otherwise the outline every box of the column has. */
.hero-block-form.v-card--outlined {
  border-left: 3px solid var(--v-primary-base);
}

.hero-block-form__glyph {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--v-accent-base);
}

.hero-block-form__naming {
  flex: 1 1 auto;
  min-width: 0;
}

/* Four German words in a 420 px column: the tabs give up Vuetify's minimum
   width, its tracking and its capitals, and read as the labels they are. */
.hero-block-form__tabs ::v-deep .v-tab {
  min-width: 0;
  padding: 0 8px;
  font-size: 13px;
  letter-spacing: normal;
  text-transform: none;
}

.hero-block-form__tab-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background-color: var(--v-error-base);
}

.hero-block-form__pane {
  padding: 16px;
}

/* The three formatting rows of a text Block share the leiste's grammar and
   its measures (`Tiptap.vue`): the same caption column, the same 28 px
   buttons, so „Text“ and „Formatierter Text“ read as one system. */
.hero-block-form__format {
  margin-top: 4px;
}

.hero-block-form__format-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  column-gap: 8px;
  align-items: start;
}

.hero-block-form__format-row + .hero-block-form__format-row {
  margin-top: 8px;
}

.hero-block-form__format-caption {
  padding-top: 6px;
  line-height: 1.2;
}

.hero-block-form__format-controls {
  min-width: 0;
}

.hero-block-form__format-row .v-btn.v-btn.v-size--small {
  min-width: 32px;
  height: 28px;
  padding: 0 7px;
  font-size: 12px;
  letter-spacing: 0;
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
   row of controls — and a small `v-btn` insists on 50 px, so the rule has to
   outrank Vuetify's own (`.v-btn:not(.v-btn--round).v-size--small`) or the
   cells run out of the pad and under the readout. */
.hero-block-form__pad {
  display: grid;
  grid-template-columns: repeat(3, 36px);
  gap: 4px;
  flex: 0 0 auto;
}

.hero-block-form__pad .hero-block-form__nudge.v-btn.v-size--small {
  min-width: 36px;
  width: 36px;
  height: 36px;
  padding: 0;
}

.hero-block-form__lage-side {
  flex: 1 1 auto;
  min-width: 0;
}

/* „Feinabstimmung“ is the same kind of folded row as „Höhe“ and
   „Hintergrund“ above the list, so it wears the same outline and radius. */
.hero-block-form__fine-panel.v-expansion-panel {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

.hero-block-form__fine-header,
.hero-block-form__fine-panel.v-expansion-panel--active
  > .hero-block-form__fine-header {
  min-height: 56px;
  padding: 8px 16px;
}

.hero-block-form__fine-text {
  min-width: 0;
}

.hero-block-form__fine-body ::v-deep .v-expansion-panel-content__wrap {
  padding: 4px 16px 16px;
}

.hero-block-form__fine-field + .hero-block-form__fine-field {
  margin-top: 14px;
}

/* The steps share the row equally, like the four heights above the list. */
.hero-block-form__fine-steps {
  display: flex;
  width: 100%;
}

.hero-block-form__fine-step.v-btn.v-size--small {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 4px;
  font-size: 12px;
  letter-spacing: 0;
}

.theme--dark .hero-block-form__fine-panel.v-expansion-panel {
  border-color: rgba(255, 255, 255, 0.12);
}
</style>
