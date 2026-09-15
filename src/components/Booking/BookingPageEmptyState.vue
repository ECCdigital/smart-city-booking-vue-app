<template>
  <v-card
    outlined
    class="booking-page-empty-state mx-auto text-center pa-8"
    max-width="640"
  >
    <v-icon size="56" color="grey lighten-1" class="mb-4">{{ icon }}</v-icon>
    <div class="text-h6 font-weight-bold mb-2">{{ headline }}</div>
    <div class="text-body-2 grey--text text--darken-1">{{ sentence }}</div>
    <div
      v-if="detail"
      class="booking-page-empty-state__detail text-body-2 mt-3 font-family-monospace grey--text text--darken-2"
    >
      {{ detail }}
    </div>
    <v-btn
      color="primary"
      depressed
      class="booking-page-empty-state__action mt-6"
      @click="$emit('action')"
    >
      {{ buttonLabel }}
    </v-btn>
  </v-card>
</template>

<script>
/**
 * The one empty state of the Buchungsseite and Serienbuchungsseite (spec
 * "The five page states"): icon, headline, one sentence, an optional
 * monospace detail line (the tenant id of a non-member link) and one primary
 * button. The h1 and "Zurück" stay above it; the caller decides what the
 * button does - never a redirect, the recipient keeps the URL they were sent.
 */
export default {
  name: "BookingPageEmptyState",
  props: {
    icon: { type: String, required: true },
    headline: { type: String, required: true },
    sentence: { type: String, required: true },
    detail: { type: String, default: null },
    buttonLabel: { type: String, required: true },
  },
};
</script>

<style scoped>
.booking-page-empty-state__detail {
  font-family: monospace;
  word-break: break-all;
}
</style>
