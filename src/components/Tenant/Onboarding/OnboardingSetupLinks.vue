<template>
  <div class="booking-rows" data-test="setup-links">
    <div class="booking-row">
      <div class="booking-row__main">
        <div class="booking-row__title">
          {{ $t("tenant.onboarding.setup.legal") }}
        </div>
        <div class="booking-row__subtitle setup-links__subtitle">
          {{ $t("tenant.onboarding.setup.legal-hint") }}
        </div>
      </div>
      <div class="booking-row__aside">
        <v-btn small outlined :to="formRoute('legal')" data-test="setup-legal">
          {{ $t("tenant.onboarding.setup.legal-action") }}
        </v-btn>
      </div>
    </div>
    <div class="booking-row">
      <div class="booking-row__main">
        <div class="booking-row__title">
          {{ $t("tenant.onboarding.setup.payment") }}
        </div>
        <div class="booking-row__subtitle setup-links__subtitle">
          {{
            paid
              ? $t("tenant.onboarding.setup.payment-hint")
              : $t("tenant.onboarding.setup.payment-not-required")
          }}
        </div>
      </div>
      <div v-if="paid" class="booking-row__aside">
        <v-btn
          small
          outlined
          :to="formRoute('payments')"
          data-test="setup-payment"
        >
          {{ $t("tenant.onboarding.setup.payment-action") }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Legal texts and payment stay in the existing tenant forms; the query names
 * the wizard step to return to (supervision spec §9). Drawn as hairline
 * rows: the topic on the left, the way to its form on the right.
 */
export default {
  name: "OnboardingSetupLinks",
  props: {
    paid: { type: Boolean, default: false },
    returnStep: { type: String, required: true },
    bookableId: { type: String, default: "" },
  },
  methods: {
    formRoute(tab) {
      return {
        name: "tenant",
        query: {
          tab,
          onboardingStep: this.returnStep,
          onboardingBookable: this.bookableId,
        },
      };
    },
  },
};
</script>

<style scoped>
/* A hint may take two lines; the row's subtitle clips by default. */
.setup-links__subtitle {
  white-space: normal;
}

.booking-row {
  align-items: flex-start;
  padding: var(--scb-space-3) 0;
}

.booking-row__aside {
  padding-top: 2px;
}
</style>
