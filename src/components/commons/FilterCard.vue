<template>
  <v-card class="scb-filter-card" flat>
    <div class="scb-filter-card__header" data-test="filter-head">
      <div class="d-flex align-center">
        <div class="scb-filter-card__header-icon mr-3">
          <v-icon color="primary" small>mdi-filter-variant</v-icon>
        </div>
        <div>
          <div class="scb-filter-card__title">{{ $t("filter.title") }}</div>
          <div class="scb-filter-card__subtitle">{{ subtitle }}</div>
        </div>
      </div>
      <v-btn
        v-if="activeCount > 0"
        text
        x-small
        color="primary"
        class="px-2"
        data-test="filter-reset-all"
        @click="resetAll"
      >
        {{ $t("filter.resetAll") }}
      </v-btn>
    </div>

    <template v-for="section in sections">
      <v-divider :key="`divider-${section.key}`" />
      <div :key="`label-${section.key}`" class="scb-filter-card__section-label">
        <span data-test="filter-section-label">{{ section.label }}</span>
        <button
          v-if="restricts(section)"
          type="button"
          class="scb-filter-card__section-reset"
          data-test="filter-section-reset"
          @click="reset(section)"
        >
          {{ $t("filter.reset") }}
        </button>
      </div>
      <div
        v-if="section.segmented"
        :key="`segments-${section.key}`"
        class="scb-filter-card__segments"
      >
        <v-btn-toggle
          :value="section.selected"
          mandatory
          dense
          rounded
          color="primary"
          class="scb-filter-segments"
          @change="$emit('change', section.key, $event)"
        >
          <v-btn
            v-for="option in section.options"
            :key="String(option.value)"
            :value="option.value"
            small
            text
            class="scb-filter-segments__segment"
            data-test="filter-segment"
          >
            <v-icon v-if="option.icon" left small>{{ option.icon }}</v-icon>
            {{ option.label }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div v-else :key="`rows-${section.key}`" class="scb-filter-card__rows">
        <div
          v-if="!section.options.length"
          class="scb-filter-card__empty"
          data-test="filter-empty"
        >
          {{ $t("filter.empty") }}
        </div>
        <button
          v-for="option in section.options"
          :key="String(option.value)"
          type="button"
          class="scb-filter-row"
          :class="{ 'scb-filter-row--active': isPicked(section, option) }"
          :aria-pressed="String(isPicked(section, option))"
          data-test="filter-row"
          @click="toggle(section, option)"
        >
          <span v-if="option.icon" class="scb-filter-row__icon">
            <v-icon small :color="option.color">{{ option.icon }}</v-icon>
          </span>
          <span class="scb-filter-row__title">{{ option.label }}</span>
          <v-icon
            :color="isPicked(section, option) ? 'primary' : undefined"
            class="scb-filter-row__box"
          >
            {{ boxIcon(section, option) }}
          </v-icon>
        </button>
      </div>
    </template>
  </v-card>
</template>

<script>
import {
  emptySelection,
  isMultiple,
  restrictionCount,
  totalRestrictionCount,
} from "@/utils/filterSections";

/**
 * The filter card behind the funnel of the search bar: a head with the
 * number of active restrictions and "Alle zurücksetzen", then one section per
 * filter (see `@/utils/filterSections`). The page owns the selections; the
 * card raises `change(key, selection)` and nothing else.
 */
export default {
  name: "FilterCard",
  props: {
    sections: { type: Array, required: true },
  },
  computed: {
    activeCount() {
      return totalRestrictionCount(this.sections);
    },
    subtitle() {
      return this.activeCount === 0
        ? this.$t("filter.none")
        : this.$tc("filter.active", this.activeCount);
    },
  },
  methods: {
    restricts(section) {
      return restrictionCount(section) > 0;
    },
    reset(section) {
      this.$emit("change", section.key, emptySelection(section));
    },
    resetAll() {
      this.sections.filter(this.restricts).forEach(this.reset);
    },
    boxIcon(section, option) {
      const picked = this.isPicked(section, option);
      if (isMultiple(section)) return picked ? "$checkboxOn" : "$checkboxOff";
      return picked ? "$radioOn" : "$radioOff";
    },
    isPicked(section, option) {
      return isMultiple(section)
        ? section.selected.includes(option.value)
        : section.selected === option.value;
    },
    // A single choice lifts the pick when it is picked again.
    toggle(section, option) {
      const picked = this.isPicked(section, option);
      let next;
      if (!isMultiple(section)) {
        next = picked ? emptySelection(section) : option.value;
      } else if (picked) {
        next = section.selected.filter((value) => value !== option.value);
      } else {
        next = [...section.selected, option.value];
      }
      this.$emit("change", section.key, next);
    },
  },
};
</script>

<style scoped lang="scss">
.scb-filter-card {
  overflow: hidden;
  border: 1px solid var(--scb-rule);
}

.scb-filter-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--scb-section-header-padding);
  background: var(--scb-selected-tint-faint);
}

.scb-filter-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--scb-radius-surface);
  background: var(--scb-selected-tint-strong);
}

.scb-filter-card__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
}

.scb-filter-card__subtitle {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.scb-filter-card__section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--scb-space-3) var(--scb-space-4) var(--scb-space-1);
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
}

.scb-filter-card__section-reset {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-medium);
  letter-spacing: 0;
  text-transform: none;
  color: var(--v-primary-base);
}

.scb-filter-card__segments {
  padding: var(--scb-space-1) var(--scb-space-4) var(--scb-space-3);
}

// The segments share the width by their labels; a switch whose labels do
// not fit 340px widens the card (the menu allows up to 420px).
.scb-filter-segments {
  display: flex;
  width: 100%;

  .scb-filter-segments__segment {
    flex: 1 1 auto;
    padding: 0 var(--scb-space-2);
    text-transform: none;
    letter-spacing: 0;
  }
}

// Long lists (tags, roles, tenants) scroll inside their section.
.scb-filter-card__rows {
  display: flex;
  flex-direction: column;
  max-height: 264px;
  overflow-y: auto;
  padding: 0 var(--scb-space-2) var(--scb-space-3);
}

.scb-filter-card__empty {
  padding: var(--scb-space-1) var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-caption);
}

.scb-filter-row {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--scb-space-3);
  width: 100%;
  padding: var(--scb-space-1) var(--scb-space-2);
  border: 0;
  border-radius: var(--scb-radius-control);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--scb-motion-fast);

  &:hover {
    background: var(--scb-hover-tint);
  }

  &--active {
    background: var(--scb-selected-tint-faint);

    .scb-filter-row__title {
      font-weight: var(--scb-font-weight-semibold);
    }
  }
}

.scb-filter-row__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--scb-radius-surface);
  background: var(--scb-hover-tint);
}

.scb-filter-row__title {
  flex: 1;
  font-size: var(--scb-font-size-md);
  color: var(--scb-text);
}

.scb-filter-row__box {
  flex-shrink: 0;
}
</style>
