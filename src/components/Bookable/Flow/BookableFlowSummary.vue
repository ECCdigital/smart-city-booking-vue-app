<template>
  <aside
    class="flow-summary"
    :aria-label="$t('bookable.flow.overview.title')"
    data-test="flow-summary"
  >
    <!-- A section card, beside the form in both modes. -->
    <v-card outlined class="section-card">
      <v-card-title class="section-header">
        <v-icon>mdi-clipboard-text-outline</v-icon>
        <span>{{ $t("bookable.flow.overview.title") }}</span>
      </v-card-title>
      <v-divider />
      <div class="flow-summary__body">
        <section
          v-for="block in blocks"
          :key="block.step"
          class="flow-summary__block"
          :class="{ 'flow-summary__block--current': block.step === current }"
          :aria-current="block.step === current ? 'step' : null"
          :data-test="`flow-summary-${block.step}`"
        >
          <button
            type="button"
            class="flow-summary__title"
            :data-test="`overview-heading-${block.step}`"
            @click="$emit('go', block.target)"
          >
            <v-icon small>{{ icons[block.step] }}</v-icon>
            {{ $t(`bookable.flow.steps.${block.step}.title`) }}
          </button>
          <span v-if="block.open" class="flow-summary__open">
            {{ $t("bookable.flow.overview.open") }}
          </span>
          <button
            v-for="row in block.rows"
            v-else
            :key="row.key"
            type="button"
            class="flow-summary__row"
            :class="{ 'flow-summary__row--issue': row.issues.length }"
            :data-test="`overview-row-${row.key}`"
            @click="$emit('go', row.target)"
          >
            <span v-if="row.label" class="flow-summary__label">
              {{ $t(row.label) }}
            </span>
            <span
              class="flow-summary__value"
              :class="{ 'flow-summary__value--empty': !row.value.length }"
            >
              {{ valueText(row.value) }}
            </span>
            <span
              v-for="issue in row.issues"
              :key="issue"
              class="flow-summary__issue"
              data-test="overview-issue"
            >
              <v-icon x-small color="error">mdi-alert-circle-outline</v-icon>
              {{ issueText(issue) }}
            </span>
          </button>
        </section>
      </div>
    </v-card>
  </aside>
</template>

<script>
import bookableEditing from "@/mixins/bookableEditing";
import { overviewBlocks } from "@/utils/bookableFlow";
import { bookableMessage } from "@/utils/bookableValidation";
import {
  cachedEventTitlesById,
  loadEventTitlesById,
} from "@/utils/eventTitles";

const ICONS = {
  identity: "mdi-card-account-details-outline",
  availability: "mdi-calendar-clock-outline",
  price: "mdi-cash",
  amount: "mdi-counter",
  permission: "mdi-account-key-outline",
  approval: "mdi-check-decagram-outline",
  more: "mdi-tune-variant",
  publication: "mdi-storefront-outline",
};

/**
 * The one overview of a bookable beside the form, on the editing page and in
 * the guided flow alike (ECCdigital/tickets#364): a block per step as
 * `overviewBlocks` computes it, a row per field with the field's name and
 * value, the issues of the check at their row. Expert options show by the
 * expert-mode rule, as in the fields.
 *
 * A click on a row asks for its field, one on a block's heading for the
 * block's first field: `go` with `{ step, tab, section, field, area }`. The
 * page decides where that is - the tab and section of the editing page, or
 * the step of the flow. Only the flow marks a block, its `current` step.
 */
export default {
  name: "BookableFlowSummary",
  mixins: [bookableEditing],
  props: {
    /** The steps visited so far in the flow; by default every step. */
    visited: { type: Array, default: null },
    /** The current step of the flow; the editing page has none. */
    current: { type: String, default: null },
  },
  data() {
    return {
      icons: ICONS,
      eventTitlesById: cachedEventTitlesById() || {},
    };
  },
  computed: {
    blocks() {
      return overviewBlocks(this.bookable, {
        ...(this.visited ? { visited: this.visited } : {}),
        shown: this.expertOptionShown,
        eventTitlesById: this.eventTitlesById,
      });
    },
    needsEventTitles() {
      return this.bookable.type === "ticket";
    },
  },
  watch: {
    needsEventTitles: {
      immediate: true,
      async handler(needed) {
        if (needed) this.eventTitlesById = await loadEventTitlesById();
      },
    },
  },
  methods: {
    /** The parts of a row's value, joined by commas; none is „Nicht festgelegt“. */
    valueText(parts) {
      if (!parts.length) return this.$t("bookable.flow.overview.empty");
      return parts.map(this.partText).join(", ");
    },
    partText(part) {
      if (part.type === "text") return part.text;
      if (part.type === "plural") return this.$tc(part.key, part.count);
      const params = {};
      Object.entries(part.params || {}).forEach(([name, param]) => {
        params[name] = param && param.type ? this.partText(param) : param;
      });
      return this.$t(part.key, params);
    },
    issueText(key) {
      return bookableMessage(key, (k, params) => this.$t(k, params));
    },
  },
};
</script>

<style scoped>
.flow-summary__body {
  padding: var(--scb-space-2);
}

.flow-summary__block {
  padding: var(--scb-space-1);
  color: var(--scb-text);
  border-radius: var(--scb-radius-control);
}

.flow-summary__block + .flow-summary__block {
  margin-top: 2px;
}

.flow-summary__block--current {
  background-color: var(--scb-selected-tint-faint);
}

/* The heading and every row are buttons of their own: each leads to a
   field. */
.flow-summary__title,
.flow-summary__row {
  display: flex;
  width: 100%;
  font: inherit;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  border-radius: var(--scb-radius-control);
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast);
}

.flow-summary__title:hover,
.flow-summary__row:hover {
  background-color: var(--scb-hover-tint);
}

.flow-summary__title:focus-visible,
.flow-summary__row:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

.flow-summary__title {
  align-items: center;
  gap: var(--scb-space-1);
  padding: var(--scb-space-1);
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
  flex-wrap: wrap;
  align-items: baseline;
  padding: 2px var(--scb-space-1) 2px var(--scb-space-6);
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

/* A message of the check, under the row it belongs to. */
.flow-summary__issue {
  display: flex;
  align-items: baseline;
  gap: var(--scb-space-1);
  flex: 1 0 100%;
  padding-top: 2px;
  font-size: var(--scb-font-size-xs);
  color: var(--v-error-base);
}

.flow-summary__issue .v-icon {
  align-self: center;
}

.flow-summary__open {
  display: block;
  padding: 0 0 2px var(--scb-space-6);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-caption);
}

@media (prefers-reduced-motion: reduce) {
  .flow-summary__title,
  .flow-summary__row {
    transition: none;
  }
}
</style>
