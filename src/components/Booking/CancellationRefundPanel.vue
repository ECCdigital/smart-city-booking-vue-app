<template>
  <div class="cancellation-refund-panel">
    <v-divider v-if="showDivider" class="my-4" />

    <div class="cancellation-refund-panel__header">
      <div class="cancellation-refund-panel__title">
        <v-icon color="primary" small class="mr-2">{{ icon }}</v-icon>
        <span class="text-subtitle-2 font-weight-bold">{{ title }}</span>
      </div>
      <slot name="header-action" />
    </div>

    <CancellationRefundAmounts
      class="mt-2"
      :original-amount-eur="originalAmountEur"
      :refund-amount-eur="refundAmountEur"
      :cancellation-fee-eur="cancellationFeeEur"
    />

    <slot />

    <v-alert
      v-if="policySummary"
      type="info"
      text
      dense
      class="cancellation-refund-panel__policy mt-2 mb-0"
    >
      {{ policySummary }}
    </v-alert>

    <div
      v-if="footer"
      class="cancellation-refund-panel__footer text-caption text--secondary mt-1"
    >
      {{ footer }}
    </div>
  </div>
</template>

<script>
import CancellationRefundAmounts from "@/components/Booking/CancellationRefundAmounts.vue";

export default {
  name: "CancellationRefundPanel",
  components: { CancellationRefundAmounts },
  props: {
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "mdi-cash-refund",
    },
    originalAmountEur: {
      type: Number,
      default: 0,
    },
    refundAmountEur: {
      type: Number,
      default: 0,
    },
    cancellationFeeEur: {
      type: Number,
      default: 0,
    },
    policySummary: {
      type: String,
      default: "",
    },
    footer: {
      type: String,
      default: "",
    },
    showDivider: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.cancellation-refund-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cancellation-refund-panel__title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.cancellation-refund-panel__policy {
  border-radius: 4px !important;
}
</style>
