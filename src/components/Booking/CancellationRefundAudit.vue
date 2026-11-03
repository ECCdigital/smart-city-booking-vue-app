<template>
  <CancellationRefundPanel
    v-if="audit"
    :title="$t('booking.cancellationRefund.auditTitle')"
    icon="mdi-history"
    :original-amount-eur="Number(audit.originalAmountEur || 0)"
    :refund-amount-eur="Number(audit.refundAmountEur || 0)"
    :cancellation-fee-eur="Number(audit.cancellationFeeEur || 0)"
    :policy-summary="policySummary"
    :footer="cancelledAtFooter"
  />
</template>

<script>
import CancellationRefundPanel from "@/components/Booking/CancellationRefundPanel.vue";

export default {
  name: "CancellationRefundAudit",
  components: { CancellationRefundPanel },
  props: {
    audit: {
      type: Object,
      default: null,
    },
  },
  computed: {
    /**
     * The refund was fixed at the cancellation, so the audit names no tier
     * and no time before the start - only that the administration overrode
     * the tenant's rule, where it did.
     */
    policySummary() {
      if (!this.audit?.adminOverride) return "";
      return this.$t("booking.cancellationRefund.auditOverride", {
        suggested: this.audit.suggestedRefundPercentage,
        applied: this.audit.appliedRefundPercentage,
      });
    },
    cancelledAtFooter() {
      if (!this.audit?.cancelledAt) return "";
      const label = new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(Number(this.audit.cancelledAt)));
      return `${this.$t("booking.cancellationRefund.cancelledAt")}: ${label}`;
    },
  },
};
</script>
