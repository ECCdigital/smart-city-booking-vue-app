<template>
  <div class="flow-more" data-test="flow-more">
    <section
      v-for="area in areas"
      :key="area.key"
      class="flow-more__row"
      :class="{ 'flow-more__row--open': isOpen(area.key) }"
      :data-test="`more-area-${area.key}`"
      :data-area="area.key"
    >
      <button
        :id="`flow-more-${area.key}-toggle`"
        type="button"
        class="flow-more__head"
        :aria-expanded="String(isOpen(area.key))"
        :aria-controls="`flow-more-${area.key}`"
        :data-test="`more-area-${area.key}-toggle`"
        @click="toggle(area.key)"
      >
        <v-icon class="flow-more__icon" small>{{ area.icon }}</v-icon>
        <span class="flow-more__text">
          <span class="flow-more__title">{{ $t(area.titleKey) }}</span>
          <span class="flow-more__hint">{{ $t(area.hintKey) }}</span>
        </span>
        <span
          class="flow-more__state"
          :class="{ 'flow-more__state--used': area.summary.length }"
          :data-test="`more-area-${area.key}-state`"
        >
          {{ stateText(area.summary) }}
        </span>
        <v-icon class="flow-more__chevron" small>mdi-chevron-down</v-icon>
      </button>
      <v-expand-transition>
        <div
          v-if="isOpen(area.key)"
          :id="`flow-more-${area.key}`"
          role="region"
          :aria-labelledby="`flow-more-${area.key}-toggle`"
          class="flow-more__body"
        >
          <component
            :is="area.comp"
            :bookable="bookable"
            @update:bookable="$emit('update:bookable', $event)"
          />
        </div>
      </v-expand-transition>
    </section>
  </div>
</template>

<script>
import bookableEditing from "@/mixins/bookableEditing";
import { AREA_COMPONENTS } from "@/components/Bookable/Edit/bookableEditTabs";
import { areaSummary, areaUsed, shownAreas } from "@/utils/bookableAreas";

/**
 * The optional step „Weitere Einstellungen“ (ECCdigital/tickets#363): a row
 * per area without a step of its own, in the order of the editing page's
 * tabs, with its title, hint and state - „Nicht genutzt“ or its summary.
 * Opened, a row shows the same component as the area's card on the editing
 * page, without a heading of its own. Each time the step opens, exactly the
 * areas in use are open. Nothing here is required: „Weiter“ goes on.
 *
 * Without expert mode an expert area shows by the expert-mode rule, so an
 * unused one is left out (`shownAreas`).
 */
export default {
  name: "BookableFlowMore",
  mixins: [bookableEditing],
  data() {
    return { open: this.usedKeys() };
  },
  computed: {
    areas() {
      return shownAreas(this.expertOptionShown).map((area) => ({
        ...area,
        ...AREA_COMPONENTS[area.key],
        summary: areaSummary(area.key, this.bookable),
      }));
    },
  },
  // Kept alive by the flow: opening the step again starts over from what
  // is in use.
  activated() {
    this.open = this.usedKeys();
  },
  methods: {
    usedKeys() {
      return shownAreas(this.expertOptionShown)
        .map((area) => area.key)
        .filter((key) => areaUsed(key, this.bookable));
    },
    isOpen(key) {
      return this.open.includes(key);
    },
    toggle(key) {
      this.open = this.isOpen(key)
        ? this.open.filter((entry) => entry !== key)
        : [...this.open, key];
    },
    /**
     * Opens the area `key` and brings it into view: the flow asks for it
     * when a link of the confirmation or a refused save leads here.
     */
    reveal(key) {
      if (!this.isOpen(key)) this.open = [...this.open, key];
      this.$nextTick(() =>
        this.$el
          .querySelector(`[data-area='${key}']`)
          ?.scrollIntoView?.({ behavior: "smooth", block: "start" })
      );
    },
    stateText(summary) {
      if (!summary.length) return this.$t("bookable.flow.more.unused");
      return summary.map(this.partText).join(", ");
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
.flow-more__row + .flow-more__row {
  border-top: 1px solid var(--scb-rule);
}

.flow-more__head {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
  width: 100%;
  padding: var(--scb-space-3) var(--scb-space-2);
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

.flow-more__head:hover {
  background-color: var(--scb-hover-tint);
}

.flow-more__head:focus-visible {
  box-shadow: inset 0 0 0 2px var(--v-primary-base);
}

.flow-more__icon,
.flow-more__chevron {
  flex: none;
  color: var(--scb-text-muted);
}

.flow-more__chevron {
  transition: transform var(--scb-motion-base);
}

.flow-more__row--open .flow-more__chevron {
  transform: rotate(180deg);
}

.flow-more__text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.flow-more__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
}

.flow-more__hint {
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.flow-more__state {
  flex: 0 1 auto;
  max-width: 40%;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  text-align: right;
  color: var(--scb-text-caption);
}

.flow-more__state--used {
  font-weight: var(--scb-font-weight-medium);
  color: var(--v-primary-base);
}

/* The area's component, aligned with the title above it. */
.flow-more__body {
  padding: var(--scb-space-1) var(--scb-space-2) var(--scb-space-5)
    calc(var(--scb-space-2) + 16px + var(--scb-space-3));
}

@media (max-width: 599px) {
  /* $scb-bp-xs: the state moves under the title, the body to the edge. */
  .flow-more__head {
    flex-wrap: wrap;
  }

  .flow-more__state {
    order: 3;
    flex-basis: 100%;
    max-width: none;
    padding-left: calc(16px + var(--scb-space-3));
    text-align: left;
  }

  .flow-more__body {
    padding-left: var(--scb-space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-more__head,
  .flow-more__chevron {
    transition: none;
  }
}
</style>
