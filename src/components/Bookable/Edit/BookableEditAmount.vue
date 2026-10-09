<template>
  <div class="bookable-amount" data-test="flow-amount">
    <div
      class="bookable-amount__box"
      :class="{ 'bookable-amount__box--warning': warns }"
      data-test="flow-amount-box"
      data-field="amount"
    >
      <div class="bookable-amount__question">
        <v-icon small>mdi-layers-outline</v-icon>
        {{ $t("bookable.amount.title") }}
      </div>

      <BookableExternalNote
        v-if="external"
        :title="$t('bookable.amount.external-title')"
        :text="$t('bookable.amount.external-text')"
        test-id="flow-amount-external"
        @open-section="$emit('open-section', $event)"
      />

      <template v-else>
        <FlowSegmented
          :value="amountLimited ? 'limited' : 'unlimited'"
          :options="limitOptions"
          :label="$t('bookable.amount.title')"
          test-id="flow-amount-mode"
          @input="setAmountLimited($event === 'limited')"
        />
        <FlowCounter
          v-if="amountLimited"
          class="bookable-amount__counter"
          :value="amountValue"
          :label="$t('bookable.amount.title')"
          :unit="unitOf(amountValue)"
          test-id="flow-amount"
          @input="typeAmount"
          @leave="typing.amount = false"
        />
        <p v-else class="bookable-amount__hint">
          {{ $t("bookable.amount.unlimited-hint") }}
        </p>

        <p
          v-if="warns"
          class="bookable-amount__warning"
          data-test="flow-amount-warning"
        >
          <v-icon small color="warning">mdi-alert-outline</v-icon>
          {{ $t("bookable.amount.room-warning") }}
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
      data-field="maxAmountPerBooking"
    >
      <div class="bookable-amount__question">
        <v-icon small>mdi-cart-arrow-down</v-icon>
        {{ $t("bookable.amount.max-title") }}
      </div>
      <FlowSegmented
        :value="maxLimited ? 'limited' : 'unlimited'"
        :options="limitOptions"
        :label="$t('bookable.amount.max-title')"
        test-id="flow-max-amount-mode"
        @input="setMaxLimited($event === 'limited')"
      />
      <FlowCounter
        v-if="maxLimited"
        class="bookable-amount__counter"
        :value="maxValue"
        :label="$t('bookable.amount.max-title')"
        :unit="unitOf(maxValue)"
        :rules="fieldRules.maxAmountPerBooking"
        test-id="flow-max-amount"
        @input="typeMax"
        @leave="typing.max = false"
      />
      <p v-else class="bookable-amount__hint">
        {{ $t("bookable.amount.max-unlimited-hint") }}
      </p>
    </div>
  </div>
</template>

<script>
import FlowCounter from "@/components/Bookable/Flow/FlowCounter.vue";
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import bookableEditing from "@/mixins/bookableEditing";
import BookableExternalNote from "@/components/Bookable/Edit/BookableExternalNote.vue";
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
  name: "BookableEditAmount",
  components: { FlowCounter, FlowSegmented, BookableExternalNote },
  mixins: [bookableEditing],
  data() {
    return {
      typing: { amount: false, max: false },
    };
  },
  computed: {
    external() {
      return this.providerTakesOver("maxAmount");
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
        label: this.$t(`bookable.amount.${value}`),
      }));
    },
  },
  methods: {
    unitOf(count) {
      return this.bookable.priceType === "per-square-meter"
        ? this.$t("bookable.amount.unit-square-meter")
        : this.$tc("bookable.amount.unit", Number(count) || 0);
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
</style>
