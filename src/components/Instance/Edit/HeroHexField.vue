<template>
  <v-text-field
    :value="value"
    :label="label"
    :rules="rules"
    :clearable="optional"
    :hint="hint"
    :persistent-hint="!!hint"
    placeholder="#rrggbb"
    background-color="accent"
    filled
    dense
    class="hero-hex-field"
    @input="onInput"
  >
    <template #append>
      <v-menu offset-y left :close-on-content-click="false">
        <template #activator="{ on, attrs }">
          <v-btn
            icon
            x-small
            class="hero-hex-field__picker"
            :title="`${label} wählen`"
            v-bind="attrs"
            v-on="on"
          >
            <span
              v-if="swatch"
              class="hero-hex-field__swatch"
              :style="{ backgroundColor: swatch }"
            />
            <v-icon v-else small>mdi-eyedropper-variant</v-icon>
          </v-btn>
        </template>
        <v-color-picker
          :value="pickerValue"
          mode="hexa"
          hide-mode-switch
          show-swatches
          swatches-max-height="200px"
          @input="pick"
        />
      </v-menu>
    </template>
  </v-text-field>
</template>

<script>
import {
  heroHexRules,
  heroHexWithoutAlpha,
  heroOptionalHexRules,
  isHeroHexColor,
} from "@/utils/heroBlockValidation";

const REQUIRED_MESSAGE = "Pflichtfeld";

// What the picker starts from while the field is still empty.
const FALLBACK_COLOR = "#000000";

// „Pflichtfeld“ before the hex message: an empty required field is missing,
// not misspelt.
const REQUIRED_RULES = Object.freeze([
  (value) => !!value || REQUIRED_MESSAGE,
  ...heroHexRules,
]);

/**
 * One Background colour: a `#rrggbb` field with the picker behind the swatch
 * beside it (hero layout spec §8).
 *
 * Background colours are hex only — the named tokens of a text Block have no
 * meaning behind the Hero, so there are no chips here. An `optional` field
 * answers `null` when it is cleared, which is how „Farbe im Dunkelmodus“
 * loses its key again: an absent dark value means „follow the light one“, and
 * an empty string would not.
 */
export default {
  name: "HeroHexField",
  props: {
    /** The colour as the Background holds it. */
    value: { type: String, default: null },
    label: { type: String, required: true },
    /** Whether an empty field is a legal value rather than a missing one. */
    optional: { type: Boolean, default: false },
    hint: { type: String, default: null },
  },
  computed: {
    rules() {
      return this.optional ? heroOptionalHexRules : REQUIRED_RULES;
    },
    swatch() {
      return isHeroHexColor(this.value) ? this.value : null;
    },
    pickerValue() {
      return this.swatch || FALLBACK_COLOR;
    },
  },
  methods: {
    onInput(next) {
      const text = String(next == null ? "" : next).trim();
      // The clear button answers `null`; so does an emptied optional field.
      this.$emit("input", this.optional && text === "" ? null : text);
    },
    pick(picked) {
      this.$emit("input", heroHexWithoutAlpha(picked));
    },
  },
};
</script>

<style scoped>
.hero-hex-field__swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
}

/* „Weiß“ on a light sheet is a white dot on white — the ring is what makes it
   visible, and on a dark sheet it has to be the light one. */
.theme--dark .hero-hex-field__swatch {
  border-color: rgba(255, 255, 255, 0.35);
}
</style>
