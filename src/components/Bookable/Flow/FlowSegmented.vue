<template>
  <div
    class="flow-segmented"
    role="radiogroup"
    :aria-label="label"
    :data-test="testId"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="flow-segmented__option"
      :class="{ 'flow-segmented__option--on': option.value === value }"
      :aria-checked="String(option.value === value)"
      :disabled="disabled"
      :data-test="`${testId}-${option.value}`"
      @click="$emit('input', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script>
/**
 * One answer out of a few, as one bar of joined segments - the cloud
 * variant's control for the flow's questions („Ohne Zeit | Für eine Zeit“).
 * A radio group; a click reports the option's value as `input`.
 */
export default {
  name: "FlowSegmented",
  props: {
    value: { type: [String, Number], default: null },
    /** `{ value, label }` per segment. */
    options: { type: Array, required: true },
    label: { type: String, default: null },
    disabled: { type: Boolean, default: false },
    /** The `data-test` of the group; a segment appends its value. */
    testId: { type: String, required: true },
  },
};
</script>

<style scoped>
.flow-segmented {
  display: flex;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
}

.flow-segmented__option {
  flex: 1 1 0;
  min-width: 0;
  padding: var(--scb-space-2) var(--scb-space-3);
  font: inherit;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
  background: var(--scb-surface);
  border: 0;
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.flow-segmented__option + .flow-segmented__option {
  border-left: 1px solid var(--scb-surface-border);
}

.flow-segmented__option:hover:not(:disabled) {
  background-color: var(--scb-hover-tint);
}

.flow-segmented__option:focus-visible {
  box-shadow: inset 0 0 0 2px var(--v-primary-base);
}

.flow-segmented__option--on,
.flow-segmented__option--on:hover:not(:disabled) {
  font-weight: var(--scb-font-weight-semibold);
  color: #fff;
  background-color: var(--v-primary-base);
}

.flow-segmented__option:disabled {
  cursor: default;
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .flow-segmented__option {
    transition: none;
  }
}
</style>
