<template>
  <div class="flow-counter" :data-test="`${testId}-counter`">
    <v-btn
      icon
      small
      outlined
      class="flow-counter__step"
      :disabled="number <= 1"
      :aria-label="$t('bookable.flow.amount.less')"
      :data-test="`${testId}-less`"
      @click="$emit('input', Math.max(1, Math.floor(number) - 1))"
    >
      <v-icon small>mdi-minus</v-icon>
    </v-btn>
    <v-text-field
      :value="value"
      type="number"
      min="1"
      step="1"
      outlined
      dense
      hide-details="auto"
      class="flow-counter__field"
      :aria-label="label"
      :rules="rules"
      :data-test="`${testId}-input`"
      @input="$emit('input', $event)"
      @blur="$emit('leave')"
    />
    <v-btn
      icon
      small
      outlined
      class="flow-counter__step"
      :aria-label="$t('bookable.flow.amount.more')"
      :data-test="`${testId}-more`"
      @click="$emit('input', Math.max(1, Math.floor(number) + 1))"
    >
      <v-icon small>mdi-plus</v-icon>
    </v-btn>
    <span class="flow-counter__unit">{{ unit }}</span>
  </div>
</template>

<script>
/**
 * A whole number from 1 with „weniger“ and „mehr“ beside the field - the
 * counter of Anzahl and Höchstmenge je Buchung. The buttons report the next
 * whole number from 1, the field what was typed (`input`), and leaving the
 * field `leave`; the host decides what a typed value means.
 */
export default {
  name: "FlowCounter",
  props: {
    value: { type: [Number, String], default: "" },
    label: { type: String, required: true },
    unit: { type: String, default: "" },
    rules: { type: Array, default: () => [] },
    /** The `data-test` prefix of the counter, its field and buttons. */
    testId: { type: String, required: true },
  },
  computed: {
    number() {
      return Number(this.value) || 0;
    },
  },
};
</script>

<style scoped>
.flow-counter {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-2);
}

/* Level with the dense field, whose Meldung may open beneath it. */
.flow-counter__step {
  margin-top: 6px;
}

.flow-counter__field {
  flex: 0 0 112px;
  max-width: 112px;
}

.flow-counter__field ::v-deep input {
  text-align: center;
  font-weight: var(--scb-font-weight-semibold);
  -moz-appearance: textfield;
}

/* The Meldung runs on under the buttons rather than wrapping in the
   narrow field. */
.flow-counter__field ::v-deep .v-text-field__details {
  overflow: visible;
}

.flow-counter__field ::v-deep .v-messages {
  width: max-content;
  max-width: 22rem;
}

.flow-counter__field ::v-deep input::-webkit-outer-spin-button,
.flow-counter__field ::v-deep input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.flow-counter__unit {
  margin-top: 10px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>
