<script>
/**
 * The strip over the sections of the Zugangspunkte page
 * (ECCdigital/tickets#1106): the three numbered steps of the setup, each with
 * a check or its state, while something is open - and once all are done the
 * one line „Eingerichtet: …“ instead. What it shows comes from `setupState`
 * in `src/utilities/access-setup.js`; the strip only draws it.
 */
export default {
  name: "AccessSetupStrip",
  props: {
    // The steps as `setupState` derives them: `{ key, done, state }`.
    steps: { type: Array, required: true },
    // The line „Eingerichtet: …“ once all steps are done, else empty.
    done: { type: String, default: "" },
  },
};
</script>

<template>
  <div v-if="done" class="setup-strip__done" data-test="setup-done">
    <v-icon small color="success" class="mr-2">mdi-check-circle</v-icon>
    <span>{{ done }}</span>
  </div>
  <ol v-else class="setup-strip" data-test="setup-strip">
    <li
      v-for="(step, index) in steps"
      :key="step.key"
      class="setup-strip__step"
      :class="{ 'setup-strip__step--done': step.done }"
      data-test="setup-step"
    >
      <span class="setup-strip__mark" data-test="setup-step-mark">
        <v-icon v-if="step.done" small color="white">mdi-check</v-icon>
        <template v-else>{{ index + 1 }}</template>
      </span>
      <span>
        <span class="setup-strip__title" data-test="setup-step-title">
          {{ $t(`accessPoint.management.setup.steps.${step.key}.title`) }}
        </span>
        <span class="setup-strip__state" data-test="setup-step-state">
          {{ step.state }}
        </span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
/* A real sequence, so the numbers carry meaning. */
.setup-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

.setup-strip__step {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
  padding: var(--scb-space-3) var(--scb-space-4);
  background: var(--scb-surface-tint);
}

.setup-strip__step + .setup-strip__step {
  border-left: 1px solid var(--scb-rule-strong);
}

.setup-strip__step--done {
  background: transparent;
}

.setup-strip__mark {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  border: 2px solid var(--v-primary-base);
  color: var(--v-primary-base);
}

.setup-strip__step--done .setup-strip__mark {
  background: var(--v-success-base);
  border-color: var(--v-success-base);
}

.setup-strip__title {
  display: block;
  font-weight: var(--scb-font-weight-semibold);
  font-size: var(--scb-font-size-sm);
}

.setup-strip__state {
  display: block;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.setup-strip__done {
  display: flex;
  align-items: center;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

/* Below $scb-bp-sm (959px) the steps stack. */
@media (max-width: 959px) {
  .setup-strip {
    grid-template-columns: 1fr;
  }

  .setup-strip__step + .setup-strip__step {
    border-left: 0;
    border-top: 1px solid var(--scb-rule-strong);
  }
}
</style>
