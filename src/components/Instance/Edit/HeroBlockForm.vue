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

      <!-- „Formatierter Text“ and „Bild“ get their fields with ticket 07. -->
      <p v-else class="text--secondary text-body-2 mb-0">
        Der Inhalt dieses Blocktyps lässt sich hier noch nicht bearbeiten.
      </p>
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
import HeroColorField from "@/components/Instance/Edit/HeroColorField.vue";
import HeroPositionGrid from "@/components/Instance/Edit/HeroPositionGrid.vue";
import {
  heroBlockType,
  heroLocalizedText,
  setHeroLocalizedText,
} from "@/utils/heroBlocks";
import {
  HERO_TEXT_MAX_LENGTH,
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
  components: { HeroColorField, HeroPositionGrid, SubSection },
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
      maxTextLength: HERO_TEXT_MAX_LENGTH,
    };
  },
  computed: {
    isText() {
      return this.block.type === "text";
    },
    typeIcon() {
      return heroBlockType(this.block.type).icon;
    },
    text() {
      return heroLocalizedText(this.block.text, this.locale);
    },
    /** German is the required locale, so only it is marked as one. */
    textLabel() {
      return this.locale === "de" ? "Text" : "Text (English)";
    },
    textRules() {
      return heroTextRules(this.locale);
    },
  },
  methods: {
    setText(value) {
      this.patch({
        text: setHeroLocalizedText(this.block.text, this.locale, value),
      });
    },
    patch(fields) {
      this.$emit("input", fields);
    },
  },
};
</script>
