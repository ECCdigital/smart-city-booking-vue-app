<template>
  <div
    class="flow-box flow-amount"
    :class="{ 'flow-amount--warning': warns }"
    data-test="flow-amount"
  >
    <div class="flow-amount__head">
      <v-icon small>mdi-layers-outline</v-icon>
      <span class="flow-question mb-0">
        {{ $t("bookable.flow.amount.title") }}
      </span>
    </div>

    <p v-if="external" class="flow-note mb-0">
      {{ $t("bookable.flow.amount.external") }}
    </p>

    <template v-else>
      <FlowSegmented
        :value="unlimited ? 'unlimited' : 'limited'"
        :options="options"
        :label="$t('bookable.flow.amount.title')"
        test-id="flow-amount-mode"
        @input="setUnlimited($event === 'unlimited')"
      />

      <div v-if="!unlimited" class="flow-amount__counter">
        <v-btn
          icon
          small
          outlined
          :disabled="amount <= 1"
          :aria-label="$t('bookable.flow.amount.less')"
          data-test="flow-amount-less"
          @click="setAmount(amount - 1)"
        >
          <v-icon small>mdi-minus</v-icon>
        </v-btn>
        <input
          :value="amount"
          type="number"
          min="1"
          step="1"
          class="flow-amount__input"
          :aria-label="$t('bookable.flow.amount.title')"
          data-test="flow-amount-input"
          @input="setAmount($event.target.value)"
        />
        <v-btn
          icon
          small
          outlined
          :aria-label="$t('bookable.flow.amount.more')"
          data-test="flow-amount-more"
          @click="setAmount(amount + 1)"
        >
          <v-icon small>mdi-plus</v-icon>
        </v-btn>
        <span class="flow-amount__unit">
          {{ $tc("bookable.flow.amount.unit", amount) }}
        </span>
      </div>
      <p v-else class="flow-field__hint mb-0">
        {{ $t("bookable.flow.amount.unlimited-hint") }}
      </p>

      <p
        v-if="warns"
        class="flow-amount__warning"
        data-test="flow-amount-warning"
      >
        <v-icon small color="warning">mdi-alert-outline</v-icon>
        {{ $t("bookable.flow.amount.room-warning") }}
      </p>
    </template>
  </div>
</template>

<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import bookableFlowStep from "@/mixins/bookableFlowStep";
import { providerHandles } from "@/utils/bookableExternalProviders";
import { isUnlimitedAmount, warnsAboutAmount } from "@/utils/bookableFlow";

/**
 * Step 4, Anzahl & Kapazität: limited with a counter from 1, or unlimited
 * (stored as `null`, which the price tab reads as unlimited). More than one
 * unit of a room or venue is questioned, not refused.
 */
export default {
  name: "BookableFlowAmount",
  components: { FlowSegmented },
  mixins: [bookableFlowStep],
  computed: {
    external() {
      return (this.bookable.externalProviders || []).some((provider) =>
        providerHandles(provider, "maxAmount")
      );
    },
    unlimited() {
      return isUnlimitedAmount(this.bookable);
    },
    amount() {
      return Number(this.bookable.amount) || 1;
    },
    warns() {
      return warnsAboutAmount(this.bookable);
    },
    options() {
      return ["limited", "unlimited"].map((value) => ({
        value,
        label: this.$t(`bookable.flow.amount.${value}`),
      }));
    },
  },
  methods: {
    setUnlimited(unlimited) {
      this.patch({ amount: unlimited ? null : 1 });
    },
    setAmount(value) {
      const amount = Math.max(1, Math.floor(Number(value)) || 1);
      this.patch({ amount });
    },
  },
};
</script>

<style scoped>
.flow-amount--warning {
  border-color: var(--v-warning-base);
}

.flow-amount__head {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-3);
}

.flow-amount__counter {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-4);
}

.flow-amount__input {
  width: 64px;
  height: 36px;
  text-align: center;
  font: inherit;
  font-size: 1.125rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  -moz-appearance: textfield;
}

.flow-amount__input::-webkit-outer-spin-button,
.flow-amount__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.flow-amount__input:focus-visible {
  outline: none;
  border-color: var(--v-primary-base);
  box-shadow: 0 0 0 1px var(--v-primary-base);
}

.flow-amount__unit {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.flow-amount__warning {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin: var(--scb-space-3) 0 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
}
</style>
