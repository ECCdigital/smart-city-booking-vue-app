<template>
  <div class="refund-amounts">
    <div class="refund-amounts__grid">
      <div class="refund-amounts__item">
        <div class="refund-amounts__icon refund-amounts__icon--original">
          <v-icon x-small>mdi-receipt-text-outline</v-icon>
        </div>
        <div class="refund-amounts__content">
          <span class="refund-amounts__label">
            {{ $t("booking.cancellationRefund.originalAmount") }}
          </span>
          <span class="refund-amounts__value">
            {{ currency(originalAmountEur) }}
          </span>
        </div>
      </div>

      <div class="refund-amounts__arrow" aria-hidden="true">
        <v-icon x-small color="grey">mdi-chevron-right</v-icon>
      </div>

      <div class="refund-amounts__item refund-amounts__item--highlight">
        <div class="refund-amounts__icon refund-amounts__icon--refund">
          <v-icon x-small>mdi-cash-refund</v-icon>
        </div>
        <div class="refund-amounts__content">
          <span class="refund-amounts__label">
            {{ $t("booking.cancellationRefund.refundAmount") }}
          </span>
          <span class="refund-amounts__value refund-amounts__value--refund">
            {{ currency(refundAmountEur) }}
          </span>
          <v-chip
            v-if="refundShareLabel"
            x-small
            label
            color="success"
            text-color="white"
            class="refund-amounts__chip mt-1"
          >
            {{ refundShareLabel }}
          </v-chip>
        </div>
      </div>

      <div class="refund-amounts__arrow" aria-hidden="true">
        <v-icon x-small color="grey">mdi-chevron-right</v-icon>
      </div>

      <div class="refund-amounts__item">
        <div class="refund-amounts__icon refund-amounts__icon--fee">
          <v-icon x-small>mdi-hand-coin-outline</v-icon>
        </div>
        <div class="refund-amounts__content">
          <span class="refund-amounts__label">
            {{ $t("booking.cancellationRefund.cancellationFee") }}
          </span>
          <span class="refund-amounts__value">
            {{ currency(cancellationFeeEur) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="showSplitBar" class="refund-amounts__split">
      <div
        class="refund-amounts__split-refund"
        :style="{ width: `${refundSharePercent}%` }"
      />
      <div
        class="refund-amounts__split-fee"
        :style="{ width: `${feeSharePercent}%` }"
      />
    </div>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";

export default {
  name: "CancellationRefundAmounts",
  props: {
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
  },
  computed: {
    refundSharePercent() {
      const original = Number(this.originalAmountEur) || 0;
      if (original <= 0) return 0;
      return Math.min(
        100,
        Math.max(
          0,
          Math.round((Number(this.refundAmountEur) / original) * 100)
        )
      );
    },
    feeSharePercent() {
      return Math.max(0, 100 - this.refundSharePercent);
    },
    showSplitBar() {
      return Number(this.originalAmountEur) > 0;
    },
    refundShareLabel() {
      if (!this.showSplitBar) return "";
      return this.$t("booking.cancellationRefund.refundShare", {
        percentage: this.refundSharePercent,
      });
    },
  },
  methods: {
    currency(value) {
      return FormatService.currency(Number(value || 0));
    },
  },
};
</script>

<style scoped>
.refund-amounts {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background-color: var(--v-accent-base, #fafafa);
  overflow: hidden;
}

.theme--dark .refund-amounts {
  border-color: rgba(255, 255, 255, 0.12);
  background-color: rgba(255, 255, 255, 0.03);
}

.refund-amounts__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  padding: 10px 8px;
}

.refund-amounts__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 2px 6px;
}

.refund-amounts__item--highlight {
  background: rgba(76, 175, 80, 0.08);
  border-radius: 4px;
}

.theme--dark .refund-amounts__item--highlight {
  background: rgba(76, 175, 80, 0.14);
}

.refund-amounts__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  padding-top: 10px;
}

.refund-amounts__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  flex-shrink: 0;
}

.refund-amounts__icon--original {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.54);
}

.refund-amounts__icon--refund {
  background: rgba(76, 175, 80, 0.18);
  color: var(--v-success-base, #4caf50);
}

.refund-amounts__icon--fee {
  background: rgba(251, 140, 0, 0.16);
  color: var(--v-warning-darken1, #f57c00);
}

.theme--dark .refund-amounts__icon--original {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.refund-amounts__content {
  min-width: 0;
}

.refund-amounts__label {
  display: block;
  font-size: 0.7rem;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 2px;
}

.theme--dark .refund-amounts__label {
  color: rgba(255, 255, 255, 0.65);
}

.refund-amounts__value {
  display: block;
  font-size: 0.95rem;
  line-height: 1.25;
  font-weight: 600;
  white-space: nowrap;
}

.refund-amounts__value--refund {
  color: var(--v-success-base, #4caf50);
}

.refund-amounts__chip {
  height: 18px !important;
  font-size: 0.65rem !important;
}

.refund-amounts__split {
  display: flex;
  height: 3px;
  background: rgba(0, 0, 0, 0.06);
}

.theme--dark .refund-amounts__split {
  background: rgba(255, 255, 255, 0.08);
}

.refund-amounts__split-refund {
  background: var(--v-success-base, #4caf50);
  transition: width 0.25s ease;
}

.refund-amounts__split-fee {
  background: rgba(251, 140, 0, 0.75);
  transition: width 0.25s ease;
}

@media (max-width: 700px) {
  .refund-amounts__grid {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 10px;
  }

  .refund-amounts__arrow {
    display: none;
  }

  .refund-amounts__item--highlight {
    order: -1;
  }
}
</style>
