<template>
  <!-- PROTOTYPE (ECCdigital/tickets#54), throwaway: the filter card of the
       booking list (BookingFilterCard) made generic - a header with the
       count and "Alle zurücksetzen", then one checkbox section per filter. -->
  <v-card class="proto-filter-card" elevation="8" rounded="lg">
    <div class="proto-filter-card__header">
      <div class="d-flex align-center">
        <div class="proto-filter-card__header-icon mr-3">
          <v-icon color="primary" small>mdi-filter-variant</v-icon>
        </div>
        <div>
          <div class="text-subtitle-2 font-weight-bold line-height-tight">
            {{ $t("booking.filter.title") }}
          </div>
          <div class="text-caption grey--text">{{ subtitle }}</div>
        </div>
      </div>
      <v-btn
        v-if="activeCount > 0"
        text
        x-small
        color="primary"
        class="px-2"
        @click="$emit('reset')"
      >
        {{ $t("booking.filter.resetAll") }}
      </v-btn>
    </div>

    <template v-for="section in sections">
      <v-divider :key="`d-${section.key}`" />
      <div :key="`l-${section.key}`" class="proto-filter-card__section-label">
        <span>{{ section.label }}</span>
        <button
          v-if="section.selected.length"
          type="button"
          class="proto-filter-card__section-reset"
          @click="$emit('reset-section', section.key)"
        >
          {{ $t("booking.filter.reset") }}
        </button>
      </div>
      <div :key="`r-${section.key}`" class="proto-filter-card__rows">
        <div
          v-if="!section.options.length"
          class="proto-filter-card__empty text-caption"
        >
          Keine Einträge
        </div>
        <button
          v-for="option in section.options"
          :key="option.value"
          type="button"
          class="proto-filter-row"
          :class="{
            'proto-filter-row--active': section.selected.includes(option.value),
          }"
          @click="$emit('toggle', section.key, option.value)"
        >
          <div class="proto-filter-row__icon">
            <v-icon small :color="option.color">{{ option.icon }}</v-icon>
          </div>
          <span class="proto-filter-row__title">{{ option.label }}</span>
          <v-icon
            :color="
              section.selected.includes(option.value) ? 'primary' : undefined
            "
            class="proto-filter-row__box"
          >
            {{
              section.selected.includes(option.value)
                ? "$checkboxOn"
                : "$checkboxOff"
            }}
          </v-icon>
        </button>
      </div>
    </template>
  </v-card>
</template>

<script>
export default {
  name: "FilterCardPrototype",
  props: {
    // [{ key, label, selected: [value], options: [{ value, label, icon, color }] }]
    sections: { type: Array, required: true },
    activeCount: { type: Number, required: true },
  },
  computed: {
    subtitle() {
      return this.activeCount === 0
        ? this.$t("booking.filter.none")
        : this.$tc("booking.filter.active", this.activeCount);
    },
  },
};
</script>

<style scoped lang="scss">
.proto-filter-card {
  overflow: hidden;
  border: 1px solid var(--scb-rule);
}

.proto-filter-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  background: color-mix(in srgb, var(--v-primary-base) 4%, transparent);
}

.proto-filter-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--scb-selected-tint-strong);
}

.line-height-tight {
  line-height: 1.25;
}

.proto-filter-card__section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
}

.proto-filter-card__section-reset {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: var(--scb-font-size-caption);
  letter-spacing: 0;
  text-transform: none;
  font-weight: var(--scb-font-weight-medium);
  color: var(--v-primary-base);
}

// Long lists (tags, roles) scroll inside their section.
.proto-filter-card__rows {
  display: flex;
  flex-direction: column;
  max-height: 264px;
  overflow-y: auto;
  padding: 2px 8px 10px;
}

.proto-filter-card__empty {
  padding: 6px 8px;
  color: var(--scb-text-caption);
}

.proto-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--scb-motion-fast);

  &:hover {
    background: var(--scb-hover-tint);
  }

  &--active {
    background: var(--scb-selected-tint-faint);

    .proto-filter-row__title {
      font-weight: var(--scb-font-weight-semibold);
    }
  }
}

.proto-filter-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--scb-hover-tint);
  flex-shrink: 0;
}

.proto-filter-row__title {
  flex: 1;
  font-size: var(--scb-font-size-md);
  color: var(--scb-text);
}

.proto-filter-row__box {
  flex-shrink: 0;
}
</style>
