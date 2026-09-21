<template>
  <div data-test="setup-links">
    <div class="py-3">
      <h4 class="text-subtitle-1">{{ $t("tenant.onboarding.setup.legal") }}</h4>
      <p class="text-body-2 text--secondary mb-2">
        {{ $t("tenant.onboarding.setup.legal-hint") }}
      </p>
      <v-btn small outlined :to="formRoute('legal')" data-test="setup-legal">
        {{ $t("tenant.onboarding.setup.legal-action") }}
      </v-btn>
    </div>
    <v-divider />
    <div v-if="paid" class="py-3">
      <h4 class="text-subtitle-1">
        {{ $t("tenant.onboarding.setup.payment") }}
      </h4>
      <p class="text-body-2 text--secondary mb-2">
        {{ $t("tenant.onboarding.setup.payment-hint") }}
      </p>
      <v-btn
        small
        outlined
        :to="formRoute('payments')"
        data-test="setup-payment"
      >
        {{ $t("tenant.onboarding.setup.payment-action") }}
      </v-btn>
    </div>
    <p v-else class="text-body-2 text--secondary py-3 mb-0">
      {{ $t("tenant.onboarding.setup.payment-not-required") }}
    </p>
  </div>
</template>

<script>
/**
 * Legal texts and payment stay in the existing tenant forms; the query names
 * the wizard step to return to (supervision spec §9).
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
