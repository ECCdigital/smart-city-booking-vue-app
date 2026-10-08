<!-- PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
     The flow's counter (BookableFlowAmount) as a piece B and C share. -->
<template>
  <div class="p343-stepper">
    <v-btn
      icon
      small
      outlined
      :disabled="value <= 1"
      aria-label="weniger"
      @click="$emit('input', value - 1)"
    >
      <v-icon small>mdi-minus</v-icon>
    </v-btn>
    <input
      :value="value"
      type="number"
      min="1"
      step="1"
      class="p343-stepper__input"
      :aria-label="label"
      @input="$emit('input', $event.target.value)"
    />
    <v-btn
      icon
      small
      outlined
      aria-label="mehr"
      @click="$emit('input', value + 1)"
    >
      <v-icon small>mdi-plus</v-icon>
    </v-btn>
    <span class="p343-stepper__unit">{{ unit }}</span>
  </div>
</template>

<script>
export default {
  name: "Stepper",
  props: {
    value: { type: Number, required: true },
    label: { type: String, default: "" },
    unit: { type: String, default: "" },
  },
};
</script>

<style scoped>
.p343-stepper {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
}
.p343-stepper__input {
  width: 64px;
  height: 36px;
  text-align: center;
  font: inherit;
  font-size: 1.125rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  -moz-appearance: textfield;
}
.p343-stepper__input::-webkit-outer-spin-button,
.p343-stepper__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.p343-stepper__unit {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>
