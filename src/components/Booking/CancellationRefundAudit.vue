<template>
  <CancellationRefundPanel
    v-if="audit"
    :title="title"
    icon="mdi-history"
    :original-amount-eur="Number(audit.originalAmountEur || 0)"
    :refund-amount-eur="Number(audit.refundAmountEur || 0)"
    :cancellation-fee-eur="Number(audit.cancellationFeeEur || 0)"
    :policy-summary="policySummary"
    :footer="cancelledAtFooter"
    :unpaid="unpaid"
  />
</template>

<script>
import CancellationRefundPanel from "@/components/Booking/CancellationRefundPanel.vue";
import { isUnpaidCancellation } from "@/utils/cancellationRefund";

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
    /** Cancelled before it was paid: what dropped away and what is owed. */
    unpaid() {
      return isUnpaidCancellation(this.audit);
    },
    title() {
      return this.$t(
        this.unpaid
          ? "booking.cancellationRefund.auditTitleUnpaid"
          : "booking.cancellationRefund.auditTitle"
      );
    },
    /**
     * The refund was fixed at the cancellation, so the audit names no tier
     * and no time before the start - only that a rejected request was free
     * of charge, or that the administration overrode the tenant's rule.
     */
    policySummary() {
      if (!this.audit) return "";

      if (this.audit.rejection) {
        return this.$t("booking.cancellationRefund.rejectionAudit");
      }

      if (!this.audit.adminOverride) return "";
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
