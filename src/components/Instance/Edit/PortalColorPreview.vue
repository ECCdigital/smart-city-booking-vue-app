<template>
  <div
    class="portal-color-preview"
    :class="`portal-color-preview--${mode}`"
    :data-mode="mode"
  >
    <span class="portal-color-preview__label">{{ modeLabel }}</span>
    <div class="portal-color-preview__bits">
      <div
        v-if="show.includes('category')"
        class="portal-color-preview__category"
      >
        <span
          class="portal-color-preview__circle"
          data-part="category"
          :style="filled(decor)"
        >
          <v-icon x-small :color="contrastOf(decor)">mdi-soccer</v-icon>
        </span>
        <span>Sport</span>
      </div>
      <div v-if="show.includes('card')" class="portal-color-preview__card">
        <div
          class="portal-color-preview__stripe"
          data-part="stripe"
          :style="{ background: decor }"
        />
        <div class="portal-color-preview__card-body">
          <div class="d-flex align-center">
            <b>Turnhalle Nord</b>
            <span
              class="portal-color-preview__badge ml-2"
              data-part="badge-type"
              :style="filled(decor)"
            >
              Raum
            </span>
            <span
              class="portal-color-preview__badge ml-1"
              data-part="badge-flat"
              :style="filled(flatRate)"
            >
              Pauschal
            </span>
          </div>
          <div class="d-flex align-center mt-1">
            <span
              class="portal-color-preview__price"
              data-part="price"
              :style="{ color: primary }"
            >
              ab 12,50 €
            </span>
            <span
              class="portal-color-preview__button ml-auto"
              data-part="button"
              :style="filled(primary)"
              >Buchen</span
            >
          </div>
        </div>
      </div>
      <div
        v-if="show.includes('selection')"
        class="portal-color-preview__chips"
      >
        <span
          class="portal-color-preview__chip"
          data-part="chip-selected"
          :style="filled(secondary)"
          >Heute</span
        >
        <span
          class="portal-color-preview__chip portal-color-preview__chip--off"
        >
          Morgen
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { contrastOf, STOREFRONT_COLORS } from "@/utils/brandingContrast";
import { isHeroHexColor } from "@/utils/heroBlockValidation";

const MODE_LABELS = Object.freeze({ light: "Hell", dark: "Dunkel" });

/**
 * A few parts of the storefront in one colour mode, drawn from the colours of
 * the form: what primary, secondary and accent carry there. Without an accent
 * each part takes today's colour, badges and stripe primary, „Pauschal“
 * secondary.
 */
export default {
  name: "PortalColorPreview",
  props: {
    colors: { type: Object, required: true },
    mode: {
      type: String,
      default: "light",
      validator: (value) => value in MODE_LABELS,
    },
    // The parts to draw: "card", "selection", "category".
    show: { type: Array, required: true },
  },
  computed: {
    modeLabel() {
      return MODE_LABELS[this.mode];
    },
    primary() {
      return this.colors.primary || STOREFRONT_COLORS.primary;
    },
    secondary() {
      return this.colors.secondary || STOREFRONT_COLORS.secondary;
    },
    accent() {
      // The storefront writes the accent only when it is a colour; anything
      // else leaves every element on its fallback.
      const accent = this.colors.accent;
      return isHeroHexColor(accent) ? accent : null;
    },
    decor() {
      return this.accent || this.primary;
    },
    flatRate() {
      return this.accent || this.secondary;
    },
  },
  methods: {
    contrastOf,
    filled(color) {
      return { background: color, color: contrastOf(color) };
    },
  },
};
</script>

<style scoped>
.portal-color-preview {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-1);
  padding: var(--scb-space-2) var(--scb-space-3);
  border-radius: var(--scb-radius-surface);
  border: 1px solid var(--scb-surface-border);
  font-size: 11px;
}

/* Literal colours on purpose: the tiles mimic the portal's light and dark
   pages and must not follow the admin UI's own theme. */
.portal-color-preview--light {
  background: #f9fafb;
  color: #111827;
}

.portal-color-preview--dark {
  background: #030712;
  color: #f3f4f6;
}

.portal-color-preview__label {
  font-size: var(--scb-font-size-xs);
  opacity: 0.7;
}

.portal-color-preview__bits {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
}

.portal-color-preview__category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.portal-color-preview__circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.portal-color-preview__card {
  display: flex;
  flex: 1;
  min-width: 170px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(127, 127, 127, 0.25);
}

.portal-color-preview--light .portal-color-preview__card {
  background: #ffffff;
}

.portal-color-preview--dark .portal-color-preview__card {
  background: #111827;
}

.portal-color-preview__stripe {
  width: 4px;
}

.portal-color-preview__card-body {
  flex: 1;
  padding: 6px 8px;
}

.portal-color-preview__badge {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
}

.portal-color-preview__price {
  font-weight: 700;
}

.portal-color-preview__button {
  padding: 1px 8px;
  border-radius: 4px;
}

.portal-color-preview__chips {
  display: flex;
  gap: 4px;
}

.portal-color-preview__chip {
  padding: 1px 8px;
  border-radius: 999px;
}

.portal-color-preview__chip--off {
  border: 1px solid rgba(127, 127, 127, 0.4);
}
</style>
