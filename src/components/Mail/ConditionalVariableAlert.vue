<template>
  <v-alert
    v-if="warnings.length"
    type="warning"
    text
    dense
    class="mail-variable-alert text-caption mb-2"
  >
    <div v-for="warning in warnings" :key="warning.variable.name">
      {{ warning.text }}
    </div>
  </v-alert>
</template>

<script>
import { warningsInValue } from "./mailVariableCatalog.js";

/**
 * The warning under a field whose value names a conditional variable that
 * stays empty for the tenant as edited right now (`requires`, warning level).
 * Derived from the value, so it is there again when a saved snippet reopens.
 */
export default {
  name: "ConditionalVariableAlert",
  props: {
    value: { type: String, default: "" },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
  },
  computed: {
    warnings() {
      return warningsInValue(this.value, this.variables, this.tenant);
    },
  },
};
</script>
