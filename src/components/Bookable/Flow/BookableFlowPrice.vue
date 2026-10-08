<template>
  <div class="bookable-price" data-test="flow-price">
    <div
      v-if="external"
      class="bookable-price__note bookable-price__note--warning"
      data-test="flow-price-external"
    >
      <div class="bookable-price__note-title">
        {{ $t("bookable.flow.price.external-title") }}
      </div>
      {{ $t("bookable.flow.price.external-text") }}
    </div>

    <template v-else>
      <div class="bookable-price__field">
        <FlowSegmented
          :value="mode"
          :options="modeOptions"
          :label="$t('bookable.flow.steps.price.title')"
          test-id="flow-price-mode"
          @input="setMode"
        />
      </div>

      <p
        v-if="mode === 'free'"
        class="bookable-price__note mb-0"
        data-test="flow-free"
      >
        {{ $t("bookable.flow.price.free-info") }}
      </p>

      <template v-else>
        <p
          v-if="prefilled"
          class="bookable-price__note"
          data-test="flow-prefilled"
        >
          {{
            $t("bookable.flow.price.prefilled", {
              reason: $t(`bookable.flow.price.reasons.${bookingMode}`),
            })
          }}
        </p>

        <div class="bookable-price__field">
          <div class="bookable-price__question">
            {{ typeQuestion }}
          </div>
          <FlowSegmented
            :value="bookable.priceType"
            :options="typeOptions"
            :label="typeQuestion"
            test-id="flow-price-type"
            @input="setType"
          />
          <div v-if="mode === 'tiers'" class="bookable-price__hint">
            {{ $t("bookable.flow.price.type-tiers-hint") }}
          </div>
        </div>

        <template v-if="mode === 'simple'">
          <div class="bookable-price__field" data-test="flow-price-amount">
            <v-text-field
              :value="firstCategory.priceEur"
              :label="amountLabel"
              type="number"
              min="0"
              step="0.01"
              suffix="€"
              outlined
              dense
              hide-details="auto"
              :rules="fieldRules.price"
              @input="setCategory({ priceEur: $event })"
            />
            <div class="bookable-price__hint" data-test="flow-price-explain">
              {{ explanation }}
            </div>
          </div>

          <div data-test="flow-price-fixed">
            <v-switch
              :input-value="!!firstCategory.fixedPrice"
              dense
              hide-details
              class="bookable-price__switch"
              @change="setCategory({ fixedPrice: !!$event })"
            >
              <template #label>
                <div>
                  <div>{{ $t(`${fixedKey}.label`) }}</div>
                  <div class="bookable-price__hint mt-0">
                    {{ $t(`${fixedKey}.hint`) }}
                  </div>
                </div>
              </template>
            </v-switch>
          </div>
        </template>

        <div v-else class="bookable-price__field">
          <BookableEditPriceTiers
            :bookable="bookable"
            @update:bookable="$emit('update:bookable', $event)"
          />
        </div>

        <!-- Mehrwertsteuer is one number: 19 % and 7 % set it, any other is
             typed, „aus“ is 0 %. -->
        <div class="bookable-price__box" data-test="flow-vat">
          <div data-test="flow-vat-switch">
            <v-switch
              :input-value="vatOn"
              dense
              hide-details
              class="mt-0 pt-0"
              @change="setVat($event ? 19 : 0)"
            >
              <template #label>
                <div>
                  <div class="bookable-price__question mb-0">
                    {{ $t("bookable.flow.price.vat") }}
                  </div>
                  <div class="bookable-price__hint mt-0">
                    {{
                      vatOn
                        ? $t("bookable.flow.price.vat-on")
                        : $t("bookable.flow.price.vat-off")
                    }}
                  </div>
                </div>
              </template>
            </v-switch>
          </div>
          <div v-if="vatOn" class="bookable-price__inline mt-3">
            <v-chip
              v-for="rate in vatRates"
              :key="rate"
              small
              outlined
              :color="vatRate === rate ? 'primary' : undefined"
              :data-test="`flow-vat-${rate}`"
              @click="setVat(rate)"
            >
              {{ rate }} %
            </v-chip>
            <div class="bookable-price__vat-rate" data-test="flow-vat-rate">
              <v-text-field
                :value="bookable.priceValueAddedTax"
                :label="$t('bookable.flow.price.vat-rate')"
                type="number"
                min="0"
                max="100"
                step="0.1"
                suffix="%"
                outlined
                dense
                hide-details
                @focus="vatTyping = true"
                @blur="vatTyping = false"
                @input="setVat"
              />
            </div>
          </div>
          <div
            v-if="mode === 'simple' && price > 0"
            class="bookable-price__summary"
            data-test="flow-vat-summary"
          >
            <span>
              {{
                vatOn
                  ? $t("bookable.flow.price.vat-summary", {
                      net: euro(price),
                      rate: vatRate.toLocaleString("de-DE"),
                    })
                  : $t("bookable.flow.price.vat-none")
              }}
            </span>
            <span class="bookable-price__total">
              {{ euro(gross) }}
              <span class="bookable-price__hint">
                {{
                  vatOn
                    ? $t("bookable.flow.price.gross")
                    : $t("bookable.flow.price.final")
                }}
              </span>
            </span>
          </div>
        </div>

        <div v-if="expertOptionShown('coupons')" data-test="flow-coupons">
          <v-switch
            :input-value="couponsOn"
            dense
            hide-details
            class="bookable-price__switch mt-5"
            @change="patch({ enableCoupons: !!$event })"
          >
            <template #label>
              <div>
                <div>{{ $t("bookable.flow.price.coupons") }}</div>
                <div class="bookable-price__hint mt-0">
                  {{
                    couponsOn
                      ? $t("bookable.flow.price.coupons-on")
                      : $t("bookable.flow.price.coupons-off")
                  }}
                </div>
              </div>
            </template>
          </v-switch>
        </div>
      </template>
    </template>
  </div>
</template>

<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import BookableEditPriceTiers from "@/components/Bookable/Edit/BookableEditPriceTiers.vue";
import bookableEditing from "@/mixins/bookableEditing";
import {
  PRICE_TYPES,
  VAT_RATES,
  applyPriceMode,
  applyPriceType,
  bookingModeOf,
  handlesExternalPricing,
  priceExplanation,
  priceModeOf,
} from "@/utils/bookableFlow";

const euro = (value) =>
  Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });

const toNumber = (value) =>
  Number(typeof value === "string" ? value.replace(",", ".") : value) || 0;

/**
 * Preis, in both modes: the editing page frames it as the card „Preis“ in
 * „Preise & Kapazität“, the guided flow as the step „Preis“. The price form
 * (Kostenfrei, Einfacher Preis, Tarife), the Preisart of the backend, the
 * amount with an example as the backend reckons it, the fixed price named
 * by the Preisart, Mehrwertsteuer and Rabattcodes. Tarife are the Staffel.
 *
 * The form is read from the categories by `priceModeOf`; a chosen one is
 * kept only while they cannot show it yet (a simple price at 0 € looks
 * free, a fresh tier list simple), and losing that choice costs nothing.
 * Where ParkraumService handles the prices only its note shows; its
 * settings are the Schließsysteme's.
 */
export default {
  name: "BookableFlowPrice",
  components: { FlowSegmented, BookableEditPriceTiers },
  mixins: [bookableEditing],
  data() {
    return {
      chosenMode: null,
      prefilled: false,
      // While the rate is typed, an emptied field is not yet „aus“.
      vatTyping: false,
      vatRates: VAT_RATES,
    };
  },
  computed: {
    mode() {
      const stored = priceModeOf(this.bookable);
      const unshown =
        stored === "free" ||
        (stored === "simple" && this.chosenMode === "tiers");
      return this.chosenMode && unshown ? this.chosenMode : stored;
    },
    external() {
      return handlesExternalPricing(this.bookable);
    },
    bookingMode() {
      return bookingModeOf(this.bookable);
    },
    firstCategory() {
      return this.bookable.priceCategories?.[0] || {};
    },
    price() {
      return toNumber(this.firstCategory.priceEur);
    },
    fixedKey() {
      const type = PRICE_TYPES.includes(this.bookable.priceType)
        ? this.bookable.priceType
        : "per-item";
      return `bookable.flow.price.fixed.${type}`;
    },
    typeQuestion() {
      return this.mode === "tiers"
        ? this.$t("bookable.flow.price.type-tiers")
        : this.$t("bookable.flow.price.type");
    },
    vatRate() {
      return toNumber(this.bookable.priceValueAddedTax);
    },
    vatOn() {
      return this.vatRate > 0 || this.vatTyping;
    },
    amountLabel() {
      return this.vatRate > 0
        ? this.$t("bookable.flow.price.amount-net")
        : this.$t("bookable.flow.price.amount");
    },
    gross() {
      return this.price * (1 + this.vatRate / 100);
    },
    couponsOn() {
      return this.bookable.enableCoupons !== false;
    },
    explanation() {
      const { key, amounts } = priceExplanation(this.bookable);
      const params = {};
      Object.keys(amounts).forEach((name) => {
        params[name] = euro(amounts[name]);
      });
      return this.$t(`bookable.flow.price.explain.${key}`, params);
    },
    modeOptions() {
      const modes = ["free", "simple"];
      if (this.expertOptionShown("tiers") || this.mode === "tiers") {
        modes.push("tiers");
      }
      return modes.map((value) => ({
        value,
        label: this.$t(`bookable.flow.price.modes.${value}`),
      }));
    },
    typeOptions() {
      return PRICE_TYPES.map((value) => ({
        value,
        label: this.$t(`bookable.flow.price.types.${value}`),
      }));
    },
  },
  methods: {
    euro,
    setMode(mode) {
      if (mode === this.mode) return;
      this.prefilled = this.mode === "free" && mode !== "free";
      this.chosenMode = mode;
      this.apply((next) => applyPriceMode(next, mode));
    },
    setType(priceType) {
      this.apply((next) => applyPriceType(next, priceType));
    },
    setCategory(changes) {
      // An emptied amount reads as free; the form stays while it is typed.
      this.chosenMode = this.mode;
      const categories = this.bookable.priceCategories || [];
      this.patch({
        priceCategories: (categories.length ? categories : [{}]).map(
          (category, index) =>
            index === 0 ? { ...category, ...changes } : category
        ),
      });
    },
    setVat(rate) {
      this.patch({ priceValueAddedTax: toNumber(rate) });
    },
  },
};
</script>

<style scoped>
.bookable-price__field {
  margin-bottom: var(--scb-space-5);
}

.bookable-price__question {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.bookable-price__hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.bookable-price__note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}

.bookable-price__note--warning {
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}

.bookable-price__note-title {
  margin-bottom: 2px;
  font-weight: var(--scb-font-weight-semibold);
}

.bookable-price__switch {
  margin-top: 0;
  padding-top: 0;
  margin-bottom: var(--scb-space-4);
}

.bookable-price__box {
  margin-top: var(--scb-space-5);
  padding: var(--scb-space-4);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.bookable-price__inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-3);
}

.bookable-price__vat-rate {
  max-width: 160px;
}

.bookable-price__summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-4);
  padding-top: var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
  border-top: 1px solid var(--scb-rule);
}

.bookable-price__total {
  font-size: 1.25rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--v-primary-base);
}
</style>
