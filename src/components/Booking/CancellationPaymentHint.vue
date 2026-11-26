<template>
  <!-- What the cancellation leaves the customer, from `rejectPaymentOutcome`. -->
  <v-alert :type="outcome.type" text dense class="text-body-2 mt-4 mb-0">
    <div class="font-weight-bold">{{ outcome.status }}</div>
    <div v-if="outcome.text">{{ outcome.text }}</div>
  </v-alert>
</template>

<script>
export default {
  name: "CancellationPaymentHint",
  props: {
    /** `{ type, status, text }` as `rejectPaymentOutcome` answers it. */
    outcome: {
      type: Object,
      required: true,
    },
  },
};
</script>
