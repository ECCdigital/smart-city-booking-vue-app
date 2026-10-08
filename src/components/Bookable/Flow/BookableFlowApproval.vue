<template>
  <div data-test="flow-approval">
    <div class="flow-question">
      {{ $t("bookable.flow.approval.question") }}
    </div>
    <OnboardingChoiceTiles
      :value="bookable.autoCommitBooking ? 'auto' : 'manual'"
      :options="options"
      :label="$t('bookable.flow.approval.question')"
      test-id="flow-approval"
      @input="patch({ autoCommitBooking: $event === 'auto' })"
    />
  </div>
</template>

<script>
import OnboardingChoiceTiles from "@/components/Tenant/Onboarding/OnboardingChoiceTiles.vue";
import bookableFlowStep from "@/mixins/bookableFlowStep";

/** Step 6, Freigabe: bookings confirmed at once, or after a manual review. */
export default {
  name: "BookableFlowApproval",
  components: { OnboardingChoiceTiles },
  mixins: [bookableFlowStep],
  computed: {
    options() {
      return ["auto", "manual"].map((value) => ({
        value,
        label: this.$t(`bookable.flow.approval.${value}`),
        description: this.$t(`bookable.flow.approval.${value}-hint`),
      }));
    },
  },
};
</script>
