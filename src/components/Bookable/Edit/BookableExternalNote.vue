<script>
import { EXTERNAL_PROVIDER_SETTING } from "@/utils/bookableEditSections";

/**
 * The note in place of a field an external provider takes over (the
 * Buchungsart, the Preis, the Anzahl): what the provider does, and
 * „Zur Einstellung“ - `open-section` with the place of the provider's
 * settings, which the frame opens in either mode.
 */
export default {
  name: "BookableExternalNote",
  props: {
    title: { type: String, required: true },
    text: { type: String, required: true },
    /** `data-test` of the note; its link is `<testId>-link`. */
    testId: { type: String, required: true },
  },
  methods: {
    openSetting() {
      this.$emit("open-section", { ...EXTERNAL_PROVIDER_SETTING });
    },
  },
};
</script>

<template>
  <div class="external-note" :data-test="testId">
    <div class="external-note__title">{{ title }}</div>
    <p class="external-note__text">{{ text }}</p>
    <button
      type="button"
      class="external-note__link"
      :data-test="`${testId}-link`"
      @click="openSetting"
    >
      {{ $t("bookable.availability.external-link") }}
      <v-icon small color="primary">mdi-arrow-right</v-icon>
    </button>
  </div>
</template>

<style scoped>
.external-note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
  border-radius: var(--scb-radius-control);
}

.external-note__title {
  font-weight: var(--scb-font-weight-semibold);
}

.external-note__text {
  margin: 0 0 var(--scb-space-2);
}

.external-note__link {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-1);
  padding: 0;
  font: inherit;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-link);
  background: none;
  border: 0;
  cursor: pointer;
}

.external-note__link:hover,
.external-note__link:focus-visible {
  text-decoration: underline;
}
</style>
