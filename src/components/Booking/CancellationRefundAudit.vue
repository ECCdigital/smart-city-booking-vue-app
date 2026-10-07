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
    /**
     * Whether the booking has a time span. Without one there are no days
     * before its start, whatever an audit stored before 4.3.1 says (it
     * counted from 01.01.1970).
     */
    hasTimeSpan: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    policySummary() {
      if (!this.audit) return "";

      const days = this.hasTimeSpan ? this.audit.daysBeforeStart : null;
      const withoutTimeSpan = days === null || days === undefined;
      const percentage = this.audit.appliedRefundPercentage;

      if (this.audit.adminOverride) {
        return this.$t(
          withoutTimeSpan
            ? "booking.cancellationRefund.auditOverrideWithoutTimeSpan"
            : "booking.cancellationRefund.auditOverride",
          {
            days,
            suggested: this.audit.suggestedRefundPercentage,
            applied: percentage,
          }
        );
      }

      return this.$t(
        withoutTimeSpan
          ? "booking.cancellationRefund.singlePolicyWithoutTimeSpan"
          : "booking.cancellationRefund.singlePolicy",
        { days, percentage }
      );
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
