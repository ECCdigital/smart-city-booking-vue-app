<template>
  <aside
    class="flow-summary"
    :aria-label="$t('bookable.flow.overview.title')"
    data-test="flow-summary"
  >
    <!-- A section card, as the editor's overview is. -->
    <v-card outlined class="section-card">
      <v-card-title class="section-header">
        <v-icon>mdi-clipboard-text-outline</v-icon>
        <span>{{ $t("bookable.flow.overview.title") }}</span>
      </v-card-title>
      <v-divider />
      <div class="flow-summary__body">
        <button
          v-for="block in blocks"
          :key="block.step"
          type="button"
          class="flow-summary__block"
          :class="{ 'flow-summary__block--current': block.step === current }"
          :aria-current="block.step === current ? 'step' : null"
          :data-test="`flow-summary-${block.step}`"
          @click="$emit('go', block.step)"
        >
          <span class="flow-summary__title">
            <v-icon small>{{ icons[block.step] }}</v-icon>
            {{ $t(`bookable.flow.steps.${block.step}.title`) }}
          </span>
          <span v-if="block.open" class="flow-summary__open">
            {{ $t("bookable.flow.overview.open") }}
          </span>
          <template v-else>
            <span
              v-for="row in block.rows"
              :key="row.label"
              class="flow-summary__row"
            >
              <span class="flow-summary__label">{{ $t(row.label) }}</span>
              <span
                class="flow-summary__value"
                :class="{ 'flow-summary__value--empty': !row.value.length }"
              >
                {{ valueText(row.value) }}
              </span>
            </span>
          </template>
        </button>
      </div>
    </v-card>
  </aside>
</template>

<script>
const ICONS = {
  identity: "mdi-card-account-details-outline",
  availability: "mdi-calendar-clock-outline",
  price: "mdi-cash",
  amount: "mdi-counter",
  permission: "mdi-account-key-outline",
  approval: "mdi-check-decagram-outline",
  more: "mdi-tune-variant",
};

/**
 * The overview beside the guided flow on a wide screen (ECCdigital/
 * tickets#331): a block per step as `overviewBlocks` computes it, each a
 * button that asks the flow to go to its step (`go`).
 */
export default {
  name: "BookableFlowSummary",
  props: {
    /** `overviewBlocks(bookable, { visited, eventTitlesById })` */
    blocks: { type: Array, required: true },
    /** The current step. */
    current: { type: String, default: null },
  },
  data() {
    return { icons: ICONS };
  },
  methods: {
    /** The parts of a row's value, joined by commas; none reads „–“. */
    valueText(parts) {
      if (!parts.length) return this.$t("bookable.flow.overview.empty");
      return parts.map(this.partText).join(", ");
    },
    partText(part) {
      if (part.type === "text") return part.text;
      if (part.type === "plural") return this.$tc(part.key, part.count);
      return this.$t(part.key, part.params);
    },
  },
};
</script>

<style scoped>
.flow-summary__body {
  padding: var(--scb-space-2);
}

.flow-summary__block {
  display: block;
  width: 100%;
  padding: var(--scb-space-2);
  font: inherit;
  text-align: left;
  color: var(--scb-text);
  background: none;
  border: 0;
  border-radius: var(--scb-radius-control);
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast);
}

.flow-summary__block + .flow-summary__block {
  margin-top: 2px;
}

.flow-summary__block:hover {
  background-color: var(--scb-hover-tint);
}

.flow-summary__block:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

.flow-summary__block--current,
.flow-summary__block--current:hover {
  background-color: var(--scb-selected-tint-faint);
}

.flow-summary__title {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
}

.flow-summary__title .v-icon {
  color: inherit;
}

.flow-summary__block--current .flow-summary__title {
  color: var(--v-primary-base);
}

.flow-summary__row {
  display: flex;
  align-items: baseline;
  padding: 2px 0 2px var(--scb-space-5);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
}

.flow-summary__label {
  flex: 0 0 42%;
  padding-right: var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.flow-summary__value {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: var(--scb-font-weight-medium);
  overflow-wrap: anywhere;
}

.flow-summary__value--empty {
  font-weight: normal;
  color: var(--scb-text-caption);
}

.flow-summary__open {
  display: block;
  padding: 0 0 2px var(--scb-space-5);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-caption);
}

@media (prefers-reduced-motion: reduce) {
  .flow-summary__block {
    transition: none;
  }
}
</style>
