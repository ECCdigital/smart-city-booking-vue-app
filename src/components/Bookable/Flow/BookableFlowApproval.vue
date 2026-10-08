<template>
  <div class="bookable-confirmation" data-test="confirmation">
    <div
      class="bookable-confirmation__question"
      data-test="confirmation-question"
    >
      <v-icon small>mdi-check-decagram-outline</v-icon>
      {{ $t("bookable.flow.approval.question") }}
    </div>
    <OnboardingChoiceTiles
      :value="value"
      :options="options"
      :label="$t('bookable.flow.approval.question')"
      test-id="confirmation"
      @input="patch({ autoCommitBooking: $event === 'auto' })"
    />
  </div>
</template>

<script>
import OnboardingChoiceTiles from "@/components/Tenant/Onboarding/OnboardingChoiceTiles.vue";
import bookableEditing from "@/mixins/bookableEditing";

/**
 * The Bestätigung (`autoCommitBooking`): how incoming bookings are
 * confirmed, „Automatisch“ or „Manuell bestätigen“. One component for the
 * card in the editing page's tab Berechtigungen and the guided flow's step;
 * it knows no mode and draws no card.
 *
 * A missing value reads as manual, as in the backend: it commits a booking
 * only when every bookable in it has `autoCommitBooking` set (bundle
 * checkout). The hints follow what it then does - a passing booking is
 * accepted, a paid one only waits for the payment - and leave out the cart
 * rule.
 */
export default {
  name: "BookableFlowApproval",
  components: { OnboardingChoiceTiles },
  mixins: [bookableEditing],
  computed: {
    value() {
      return this.bookable.autoCommitBooking ? "auto" : "manual";
    },
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

<style scoped>
.bookable-confirmation__question {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-3);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}
</style>
