<template>
  <div class="hero-color-field">
    <div class="text-caption text--secondary mb-1">Farbe</div>

    <div class="d-flex flex-wrap hero-color-field__chips">
      <v-chip
        v-for="option in options"
        :key="option.value"
        class="mr-2 mb-2"
        small
        :color="option.active ? 'primary' : undefined"
        :dark="option.active"
        :outlined="!option.active"
        @click="choose(option.value)"
      >
        <span
          v-if="option.swatch"
          class="hero-color-field__swatch mr-2"
          :style="{ backgroundColor: option.swatch }"
        />
        <v-icon v-else x-small left>mdi-format-color-text</v-icon>
        {{ option.label }}
      </v-chip>

      <v-menu offset-y :close-on-content-click="false">
        <template #activator="{ on, attrs }">
          <v-chip
            class="mr-2 mb-2 hero-color-field__custom"
            small
            :color="isCustom ? 'primary' : undefined"
            :dark="isCustom"
            :outlined="!isCustom"
            v-bind="attrs"
            v-on="on"
          >
            <span
              v-if="isCustom"
              class="hero-color-field__swatch mr-2"
              :style="{ backgroundColor: current }"
            />
            <v-icon v-else x-small left>mdi-eyedropper-variant</v-icon>
            {{ customLabel }}
          </v-chip>
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
    </div>

    <div v-if="errorMessage" class="error--text text-caption">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import {
  firstHeroRuleError,
  heroHexRules,
  heroHexWithoutAlpha,
  isHeroHexColor,
} from "@/utils/heroBlockValidation";

// The four named tokens of the contract. Their real look lives in the
// storefront's theme; „Primärfarbe“ and „Sekundärfarbe“ are painted with the
// instance's own branding colours so the chip shows what the site will show.
const NAMED_OPTIONS = Object.freeze([
  { value: "default", label: "Standard" },
  { value: "primary", label: "Primärfarbe" },
  { value: "secondary", label: "Sekundärfarbe" },
  { value: "white", label: "Weiß" },
]);

// What „Eigene…“ starts from when the Block still carries a token and the
// author has not picked anything this session.
const FALLBACK_CUSTOM = "#000000";

/**
 * The colour control of a text or rich-text Block: five chips, the last of
 * which opens the hex picker (hero layout spec §7).
 *
 * The contract stores one string — a token or `#rrggbb` — so the chips and the
 * picker write into the same value. Alpha is dropped on the way in: the picker
 * offers it, the contract has no room for it.
 */
export default {
  name: "HeroColorField",
  props: {
    /** The Block's `color`: a token or a hex value. */
    value: { type: String, default: null },
    /** The instance's `branding.theme.colors`, for the two painted chips. */
    themeColors: { type: Object, default: null },
  },
  data() {
    // The last hex of this dialog session, so that leaving „Eigene…“ and
    // coming back does not throw the picked colour away.
    return { lastCustom: isHeroHexColor(this.value) ? this.value : null };
  },
  computed: {
    /**
     * A Block that carries no colour at all reads as „Standard“: that is the
     * contract's default, and the backend fills it on save.
     */
    current() {
      return this.value == null ? "default" : this.value;
    },
    isCustom() {
      return isHeroHexColor(this.current);
    },
    customLabel() {
      return this.isCustom ? this.current.toLowerCase() : "Eigene…";
    },
    options() {
      return NAMED_OPTIONS.map((option) => ({
        ...option,
        active: this.current === option.value,
        swatch: this.swatchOf(option.value),
      }));
    },
    pickerValue() {
      return this.isCustom ? this.current : this.lastCustom || FALLBACK_CUSTOM;
    },
    /**
     * Only a hand-written layout can carry a colour that is neither a token
     * nor a hex value; the control still has to say so, because the save is
     * blocked until it is fixed.
     */
    errorMessage() {
      if (NAMED_OPTIONS.some((option) => option.value === this.current)) {
        return null;
      }
      return firstHeroRuleError(heroHexRules, this.current);
    },
  },
  watch: {
    value(next) {
      if (isHeroHexColor(next)) {
        this.lastCustom = next;
      }
    },
  },
  methods: {
    swatchOf(token) {
      if (token === "white") {
        return "#ffffff";
      }
      const colors = this.themeColors || {};
      return colors[token] || null;
    },
    choose(value) {
      if (value !== this.current) {
        this.$emit("input", value);
      }
    },
    /**
     * The picker. Opening „Eigene…“ writes nothing — a menu the author closes
     * again must leave the Draft as it was; the first pick is the change.
     */
    pick(picked) {
      this.$emit("input", heroHexWithoutAlpha(picked));
    },
  },
};
</script>

<style scoped>
.hero-color-field__swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
}

/* „Weiß“ on a light sheet is a white dot on white — the ring is what makes it
   visible, and on a dark sheet it has to be the light one. */
.theme--dark .hero-color-field__swatch {
  border-color: rgba(255, 255, 255, 0.35);
}
</style>
