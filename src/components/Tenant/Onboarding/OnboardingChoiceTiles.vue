<template>
  <div>
    <div
      class="choice-tiles"
      role="radiogroup"
      :aria-label="label"
      :data-test="testId"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        role="radio"
        class="choice-tile"
        :class="{
          'choice-tile--selected': option.value === value,
          'choice-tile--invalid': !!error,
        }"
        :aria-checked="String(option.value === value)"
        :data-test="`${testId}-${option.value}`"
        @click="$emit('input', option.value)"
      >
        <v-icon
          class="choice-tile__radio"
          size="18"
          :color="option.value === value ? 'primary' : undefined"
        >
          {{
            option.value === value
              ? "mdi-radiobox-marked"
              : "mdi-radiobox-blank"
          }}
        </v-icon>
        <span class="choice-tile__text">
          <span class="choice-tile__title">{{ option.label }}</span>
          <span v-if="option.description" class="choice-tile__description">
            {{ option.description }}
          </span>
        </span>
      </button>
    </div>
    <p v-if="error" class="choice-tiles__error error--text">{{ error }}</p>
  </div>
</template>

<script>
/**
 * A deliberate choice between a few options, each a tile with a title and a
 * line saying what it means - for the questions the wizard refuses to
 * preselect (supervision spec §9). A radio group; a click reports the
 * option's value as `input`.
 */
export default {
  name: "OnboardingChoiceTiles",
  props: {
    value: { type: String, default: null },
    /** `{ value, label, description }` per tile. */
    options: { type: Array, required: true },
    label: { type: String, default: null },
    error: { type: String, default: null },
    /** The `data-test` of the group; a tile appends its value. */
    testId: { type: String, required: true },
  },
};
</script>

<style scoped>
.choice-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--scb-space-3);
}

.choice-tile {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-3);
  padding: var(--scb-space-3) var(--scb-space-4);
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast),
    border-color var(--scb-motion-fast);
}

.choice-tile:hover {
  background-color: var(--scb-hover-tint);
}

.choice-tile:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

.choice-tile--selected {
  border-color: var(--v-primary-base);
  background-color: var(--scb-selected-tint-faint);
}

.choice-tile--selected:hover {
  background-color: var(--scb-selected-tint);
}

.choice-tile--invalid:not(.choice-tile--selected) {
  border-color: var(--v-error-base);
}

.choice-tile__radio {
  flex: none;
  margin-top: 1px;
}

.choice-tile__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.choice-tile__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.choice-tile__description {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.choice-tiles__error {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-xs);
}

@media (prefers-reduced-motion: reduce) {
  .choice-tile {
    transition: none;
  }
}
</style>
