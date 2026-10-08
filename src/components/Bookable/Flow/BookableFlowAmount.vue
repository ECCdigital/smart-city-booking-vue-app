<template>
  <div class="bookable-amount" data-test="flow-amount">
    <div
      class="bookable-amount__box"
      :class="{ 'bookable-amount__box--warning': warns }"
      data-test="flow-amount-box"
    >
      <div class="bookable-amount__question">
        <v-icon small>mdi-layers-outline</v-icon>
        {{ $t("bookable.flow.amount.title") }}
      </div>

      <div
        v-if="external"
        class="bookable-amount__note bookable-amount__note--warning"
        data-test="flow-amount-external"
      >
        <div class="bookable-amount__note-title">
          {{ $t("bookable.flow.amount.external-title") }}
        </div>
        <p class="mb-2">
          {{ $t("bookable.flow.amount.external-text") }}
        </p>
        <button
          type="button"
          class="bookable-amount__link"
          data-test="flow-amount-external-link"
          @click="$emit('open-section', { ...externalSetting })"
        >
          {{ $t("bookable.flow.availability.external-link") }}
          <v-icon small color="primary">mdi-arrow-right</v-icon>
        </button>
      </div>

      <template v-else>
        <FlowSegmented
          :value="amountLimited ? 'limited' : 'unlimited'"
          :options="limitOptions"
          :label="$t('bookable.flow.amount.title')"
          test-id="flow-amount-mode"
          @input="setAmountLimited($event === 'limited')"
        />
        <FlowCounter
          v-if="amountLimited"
          class="bookable-amount__counter"
          :value="amountValue"
          :label="$t('bookable.flow.amount.title')"
          :unit="unitOf(amountValue)"
          test-id="flow-amount"
          @input="typeAmount"
          @leave="typing.amount = false"
        />
        <p v-else class="bookable-amount__hint">
          {{ $t("bookable.flow.amount.unlimited-hint") }}
        </p>

        <p
          v-if="warns"
          class="bookable-amount__warning"
          data-test="flow-amount-warning"
        >
          <v-icon small color="warning">mdi-alert-outline</v-icon>
          {{ $t("bookable.flow.amount.room-warning") }}
        </p>
      </template>
    </div>

    <!-- Not the provider's to decide: its Anzahl and this limit both
         apply, so the Höchstmenge stays editable while it handles the
         Anzahl. -->
    <div
      v-if="showsMax"
      class="bookable-amount__box"
      data-test="flow-max-amount"
    >
      <div class="bookable-amount__question">
        <v-icon small>mdi-cart-arrow-down</v-icon>
        {{ $t("bookable.flow.amount.max-title") }}
      </div>
      <FlowSegmented
        :value="maxLimited ? 'limited' : 'unlimited'"
        :options="limitOptions"
        :label="$t('bookable.flow.amount.max-title')"
        test-id="flow-max-amount-mode"
        @input="setMaxLimited($event === 'limited')"
      />
      <FlowCounter
        v-if="maxLimited"
        class="bookable-amount__counter"
        :value="maxValue"
        :label="$t('bookable.flow.amount.max-title')"
        :unit="unitOf(maxValue)"
        :rules="fieldRules.maxAmountPerBooking"
        test-id="flow-max-amount"
        @input="typeMax"
        @leave="typing.max = false"
      />
      <p v-else class="bookable-amount__hint">
        {{ $t("bookable.flow.amount.max-unlimited-hint") }}
      </p>
    </div>
  </div>
</template>

<script>
import FlowCounter from "@/components/Bookable/Flow/FlowCounter.vue";
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import bookableEditing from "@/mixins/bookableEditing";
import { EXTERNAL_PROVIDER_SETTING } from "@/utils/bookableEditSections";
import { handlesCapability } from "@/utils/bookableExternalProviders";
import {
  isUnlimitedAmount,
  isUnlimitedMaxAmount,
  showsMaxAmount,
  warnsAboutAmount,
} from "@/utils/bookableFlow";

const isEmpty = (value) => value == null || String(value).trim() === "";

/**
 * Anzahl and Höchstmenge je Buchung, in both modes: the editing page frames
 * it as the card „Anzahl“ in „Preise & Kapazität“, the guided flow as the
 * step „Anzahl & Kapazität“. Each is „Begrenzt“ with a counter from 1 or
 * „Unbegrenzt“, stored as `null`. An Anzahl of 0 reads as „Unbegrenzt“, as
 * in the backend; the Höchstmenge shows unless the Anzahl is exactly 1 and
 * none is set. More than one unit of a room is questioned, not refused.
 * Where a provider handles the Anzahl only its note shows, with a jump to
 * its settings in Schließsysteme (`open-section`).
 *
 * The only state held: while an emptied field has focus it stays
 * „Begrenzt“, though the bookable already reads unlimited.
 */
export default {
  name: "BookableFlowAmount",
  components: { FlowCounter, FlowSegmented },
  mixins: [bookableEditing],
  data() {
    return {
      typing: { amount: false, max: false },
      externalSetting: EXTERNAL_PROVIDER_SETTING,
    };
  },
  computed: {
    external() {
      return handlesCapability(this.bookable, "maxAmount");
    },
    amountLimited() {
      return !isUnlimitedAmount(this.bookable) || this.typing.amount;
    },
    amountValue() {
      return isUnlimitedAmount(this.bookable)
        ? ""
        : Number(this.bookable.amount);
    },
    warns() {
      return warnsAboutAmount(this.bookable);
    },
    showsMax() {
      return showsMaxAmount(this.bookable) || this.typing.max;
    },
    maxLimited() {
      return !isUnlimitedMaxAmount(this.bookable) || this.typing.max;
    },
    maxValue() {
      return isUnlimitedMaxAmount(this.bookable)
        ? ""
        : this.bookable.maxAmountPerBooking;
    },
    limitOptions() {
      return ["limited", "unlimited"].map((value) => ({
        value,
        label: this.$t(`bookable.flow.amount.${value}`),
      }));
    },
  },
  methods: {
    unitOf(count) {
      return this.bookable.priceType === "per-square-meter"
        ? this.$t("bookable.flow.amount.unit-square-meter")
        : this.$tc("bookable.flow.amount.unit", Number(count) || 0);
    },
    setAmountLimited(limited) {
      this.typing.amount = false;
      this.patch({ amount: limited ? 1 : null });
    },
    /** The counter only knows whole numbers from 1; emptied is unlimited. */
    typeAmount(value) {
      this.typing.amount = isEmpty(value);
      if (this.typing.amount) {
        this.patch({ amount: null });
        return;
      }
      this.patch({ amount: Math.max(1, Math.floor(Number(value)) || 1) });
    },
    setMaxLimited(limited) {
      this.typing.max = false;
      this.patch({ maxAmountPerBooking: limited ? 1 : null });
    },
    /**
     * Emptied is unlimited and saved as null - the backend refuses an empty
     * string. Any other number stays as typed, so a refused one (0, a
     * fraction) shows its Meldung rather than turning into another limit.
     */
    typeMax(value) {
      this.typing.max = isEmpty(value);
      if (this.typing.max) {
        this.patch({ maxAmountPerBooking: null });
        return;
      }
      const number = Number(value);
      this.patch({
        maxAmountPerBooking: Number.isNaN(number) ? value : number,
      });
    },
  },
};
</script>

<style scoped>
.bookable-amount__box {
  padding: var(--scb-space-4);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.bookable-amount__box + .bookable-amount__box {
  margin-top: var(--scb-space-5);
}

.bookable-amount__box--warning {
  border-color: var(--v-warning-base);
}

.bookable-amount__question {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-3);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.bookable-amount__counter {
  margin-top: var(--scb-space-4);
}

.bookable-amount__hint {
  margin: var(--scb-space-3) 0 0;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.bookable-amount__warning {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin: var(--scb-space-3) 0 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
}

.bookable-amount__note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}

.bookable-amount__note--warning {
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}

.bookable-amount__note-title {
  margin-bottom: 2px;
  font-weight: var(--scb-font-weight-semibold);
}

.bookable-amount__link {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-1);
  padding: 0;
  font: inherit;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-link);
  background: none;
  border: 0;
  cursor: pointer;
}

.bookable-amount__link:hover,
.bookable-amount__link:focus-visible {
  text-decoration: underline;
}
</style>
