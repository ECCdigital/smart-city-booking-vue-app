<template>
  <div>
    <v-skeleton-loader
      v-if="loading"
      type="list-item-three-line"
      class="mb-2"
    />
    <v-alert v-else-if="error" type="error" text>
      {{ error }}
    </v-alert>
    <CancellationRefundPanel
      v-else-if="preview"
      show-divider
      :title="$t('booking.cancellationRefund.title')"
      :original-amount-eur="originalAmountEur"
      :refund-amount-eur="refundAmountEur"
      :cancellation-fee-eur="cancellationFeeEur"
      :policy-summary="policySummary"
    >
      <v-simple-table v-if="isGroup" dense class="mt-3 mb-1 refund-group-table">
        <thead>
          <tr>
            <th>{{ $t("booking.cancellationRefund.date") }}</th>
            <th>{{ $t("booking.cancellationRefund.booking") }}</th>
            <th class="text-right">
              {{ $t("booking.cancellationRefund.days") }}
            </th>
            <th class="text-right">
              {{ $t("booking.cancellationRefund.policyPercentage") }}
            </th>
            <th class="text-right">
              {{ $t("booking.cancellationRefund.originalAmount") }}
            </th>
            <th class="text-right">
              {{ $t("booking.cancellationRefund.refundAmount") }}
            </th>
            <th class="text-right">
              {{ $t("booking.cancellationRefund.cancellationFee") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="booking in displayedBookings" :key="booking.bookingId">
            <td>{{ formatBookingDate(booking) }}</td>
            <td>{{ booking.bookingId }}</td>
            <td class="text-right">
              {{ formatDays(booking.daysBeforeStart) }}
            </td>
            <td class="text-right">
              {{ booking.suggestedRefundPercentage }} %
            </td>
            <td class="text-right">
              {{ currency(booking.originalAmountEur) }}
            </td>
            <td class="text-right">{{ currency(booking.refundAmountEur) }}</td>
            <td class="text-right">
              {{ currency(booking.cancellationFeeEur) }}
            </td>
          </tr>
        </tbody>
      </v-simple-table>

      <v-checkbox
        v-model="useOverride"
        :label="$t('booking.cancellationRefund.override')"
        hide-details
        class="mt-3 mb-0"
        @change="emitOverride"
      />
      <v-text-field
        v-if="useOverride"
        v-model.number="localPercentage"
        :label="$t('booking.cancellationRefund.overridePercentage')"
        :rules="percentageRules"
        type="number"
        min="0"
        max="100"
        step="1"
        suffix="%"
        outlined
        dense
        class="mt-3 mb-0"
        @input="emitOverride"
      />
    </CancellationRefundPanel>
  </div>
</template>

<script>
import CancellationRefundPanel from "@/components/Booking/CancellationRefundPanel.vue";
import FormatService from "@/services/FormatService";

export default {
  name: "CancellationRefundPreview",
  components: { CancellationRefundPanel },
  props: {
    preview: {
      type: Object,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      useOverride: false,
      localPercentage: 100,
    };
  },
  computed: {
    isGroup() {
      return Array.isArray(this.preview?.bookings);
    },
    percentageRules() {
      return [
        (value) =>
          (value !== "" && value !== null && value !== undefined) ||
          this.$t("validation.required"),
        (value) =>
          Number.isInteger(Number(value)) ||
          this.$t("validation.integerRequired"),
        (value) =>
          (Number(value) >= 0 && Number(value) <= 100) ||
          this.$t("booking.cancellationRefund.percentageRange"),
      ];
    },
    isOverrideValid() {
      return (
        !this.useOverride ||
        (Number.isInteger(Number(this.localPercentage)) &&
          Number(this.localPercentage) >= 0 &&
          Number(this.localPercentage) <= 100)
      );
    },
    displayedBookings() {
      if (!this.isGroup) return [];
      return this.preview.bookings
        .map((booking) => {
          if (!this.useOverride || !this.isOverrideValid) return booking;
          const refundAmountEur = this.calculateRefund(
            booking.originalAmountEur,
            this.localPercentage
          );
          return {
            ...booking,
            refundAmountEur,
            cancellationFeeEur:
              Math.round(
                (Number(booking.originalAmountEur) - refundAmountEur) * 100
              ) / 100,
          };
        })
        .sort((a, b) => Number(a.timeBegin) - Number(b.timeBegin));
    },
    originalAmountEur() {
      return this.isGroup
        ? this.sumBookings("originalAmountEur")
        : Number(this.preview?.originalAmountEur || 0);
    },
    refundAmountEur() {
      if (this.isGroup) return this.sumBookings("refundAmountEur");
      if (!this.useOverride || !this.isOverrideValid) {
        return Number(this.preview?.refundAmountEur || 0);
      }
      return this.calculateRefund(this.originalAmountEur, this.localPercentage);
    },
    cancellationFeeEur() {
      return (
        Math.round((this.originalAmountEur - this.refundAmountEur) * 100) / 100
      );
    },
    policySummary() {
      if (this.isGroup) {
        const percentages = [
          ...new Set(
            this.preview.bookings.map(
              (booking) => booking.suggestedRefundPercentage
            )
          ),
        ];
        if (percentages.length === 1) {
          return this.$t("booking.cancellationRefund.groupPolicySingle", {
            percentage: percentages[0],
          });
        }
        return this.$t("booking.cancellationRefund.groupPolicyMixed");
      }
      return this.$t("booking.cancellationRefund.singlePolicy", {
        days: this.formatDays(this.preview.daysBeforeStart),
        percentage: this.preview.suggestedRefundPercentage,
      });
    },
  },
  watch: {
    preview: {
      immediate: true,
      handler(preview) {
        this.useOverride = false;
        this.localPercentage = this.defaultPercentage(preview);
        this.emitOverride();
      },
    },
    isOverrideValid: {
      immediate: true,
      handler(value) {
        this.$emit("update:valid", value);
      },
    },
  },
  methods: {
    defaultPercentage(preview) {
      if (!preview) return 100;
      if (Array.isArray(preview.bookings)) {
        const percentages = [
          ...new Set(
            preview.bookings.map((booking) => booking.suggestedRefundPercentage)
          ),
        ];
        return percentages.length === 1 ? percentages[0] : 100;
      }
      return preview.suggestedRefundPercentage ?? 100;
    },
    emitOverride() {
      this.$emit(
        "update:refund-percentage",
        this.useOverride && this.isOverrideValid
          ? Number(this.localPercentage)
          : undefined
      );
      this.$emit("update:valid", this.isOverrideValid);
    },
    sumBookings(field) {
      return (
        this.displayedBookings.reduce(
          (sum, booking) => sum + Math.round(Number(booking[field] || 0) * 100),
          0
        ) / 100
      );
    },
    calculateRefund(originalAmountEur, percentage) {
      const originalAmountCents = Math.round(
        Number(originalAmountEur || 0) * 100
      );
      return Math.round((originalAmountCents * Number(percentage)) / 100) / 100;
    },
    currency(value) {
      return FormatService.currency(Number(value || 0));
    },
    formatDays(value) {
      return value === null || value === undefined ? "–" : value;
    },
    formatBookingDate(booking) {
      if (!booking?.timeBegin) return "–";
      const date = FormatService.date(booking.timeBegin);
      const time = FormatService.time(booking.timeBegin);
      return time ? `${date} ${time}` : date;
    },
  },
};
</script>

<style scoped>
.refund-group-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
}
</style>
