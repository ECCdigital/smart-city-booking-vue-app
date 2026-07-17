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
    policySummary() {
      if (!this.audit) return "";

      const days = this.formatDays(this.audit.daysBeforeStart);
      const percentage = this.audit.appliedRefundPercentage;

      if (this.audit.adminOverride) {
        return this.$t("booking.cancellationRefund.auditOverride", {
          days,
          suggested: this.audit.suggestedRefundPercentage,
          applied: percentage,
        });
      }

      return this.$t("booking.cancellationRefund.singlePolicy", {
        days,
        percentage,
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
  methods: {
    formatDays(value) {
      return value === null || value === undefined ? "–" : value;
    },
  },
};
</script>
