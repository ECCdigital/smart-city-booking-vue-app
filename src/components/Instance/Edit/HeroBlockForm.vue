<template>
  <div class="hero-block-form">
    <SubSection title="Inhalt" :icon="typeIcon" no-margin>
      <template v-if="isText">
        <v-text-field
          :value="text"
          :label="textLabel"
          :counter="maxTextLength"
          :rules="textRules"
          background-color="accent"
          filled
          dense
          class="hero-block-form__text"
          @input="setText"
        />

        <v-select
          :value="block.size"
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
          @input="patch({ color: $event })"
        />
      </template>

      <template v-else-if="isRichtext">
        <div class="text-caption text--secondary mb-1">{{ textLabel }}</div>
        <!--
          One editor per locale view (hero layout spec §7): the key throws the
          instance away when the toggle or the selection moves, so the two
          locales never share an undo history.
        -->
        <Tiptap
          :key="`${block.id}:${locale}`"
          :value="html"
          :max-length="maxHtmlLength"
          :min-height="140"
          links
          class="hero-block-form__richtext mb-1"
          @input="setHtml"
        />
        <div v-if="htmlError" class="error--text text-caption mb-3">
          {{ htmlError }}
        </div>

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
          @input="patch({ color: $event })"
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
        <div v-if="imageError" class="error--text text-caption mt-1">
          {{ imageError }}
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
          hint="Wird vorgelesen und angezeigt, wenn das Bild fehlt"
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
        @change="patch({ width: $event })"
      />
      <v-switch
        :input-value="block.panel === 'translucent'"
        label="Halbtransparente Fläche hinter dem Block"
        color="primary"
        class="mt-0"
        dense
        hide-details
        @change="patch({ panel: $event ? 'translucent' : 'none' })"
      />
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
  heroBlockType,
  heroLocalizedText,
  setHeroLocalizedText,
} from "@/utils/heroBlocks";
import {
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

const WIDTH_STEPS = Object.freeze([
  { value: "auto", text: "Automatisch" },
  { value: "sm", text: "Schmal" },
  { value: "md", text: "Mittel" },
  { value: "lg", text: "Breit" },
  { value: "full", text: "Volle Breite" },
]);

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

// An image Block is painted on the public portal, so it may only ever point at
// a public medium — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Der Kopfbereich wird öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

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
  },
  data() {
    return {
      spacingSteps: SPACING_STEPS,
      widthSteps: WIDTH_STEPS,
      sizeSteps: SIZE_STEPS,
      maxHeightSteps: MAX_HEIGHT_STEPS,
      maxTextLength: HERO_TEXT_MAX_LENGTH,
      maxHtmlLength: HERO_RICHTEXT_MAX_LENGTH,
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
    };
  },
  computed: {
    isText() {
      return this.block.type === "text";
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
    htmlError() {
      return firstHeroRuleError(heroRichtextRules(this.locale), this.html);
    },
    imageError() {
      return firstHeroRuleError(heroImageRules, this.block.image);
    },
  },
  methods: {
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
    patch(fields) {
      this.$emit("input", fields);
    },
  },
};
</script>
