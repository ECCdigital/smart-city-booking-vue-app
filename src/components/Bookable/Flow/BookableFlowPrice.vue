<template>
  <div data-test="flow-price">
    <div v-if="external" class="flow-note flow-note--warning">
      <div class="flow-note__title">
        {{ $t("bookable.flow.price.external-title") }}
      </div>
      {{ $t("bookable.flow.price.external-text") }}
    </div>

    <template v-else>
      <div class="flow-field">
        <FlowSegmented
          :value="mode"
          :options="modeOptions"
          :label="$t('bookable.flow.steps.price.title')"
          test-id="flow-price-mode"
          @input="setMode"
        />
      </div>

      <p v-if="mode === 'free'" class="flow-note mb-0" data-test="flow-free">
        {{ $t("bookable.flow.price.free-info") }}
      </p>

      <template v-else>
        <p v-if="prefilled" class="flow-note" data-test="flow-prefilled">
          {{
            $t("bookable.flow.price.prefilled", {
              reason: $t(`bookable.flow.price.reasons.${bookingMode}`),
            })
          }}
        </p>

        <div class="flow-field">
          <div class="flow-question">
            {{
              mode === "tiers"
                ? $t("bookable.flow.price.basis-tiers")
                : $t("bookable.flow.price.basis")
            }}
          </div>
          <FlowSegmented
            :value="basis"
            :options="basisOptions"
            :label="$t('bookable.flow.price.basis')"
            test-id="flow-price-basis"
            @input="setBasis"
          />
          <div v-if="mode === 'tiers'" class="flow-field__hint">
            {{ $t("bookable.flow.price.basis-tiers-hint") }}
          </div>
        </div>

        <div v-if="basis === 'fixed'" class="flow-field flow-inline">
          <span class="flow-inline__text">
            {{ $t("bookable.flow.price.unit") }}
          </span>
          <v-chip-group
            :value="bookable.priceType"
            mandatory
            active-class="primary--text"
            @change="patch({ priceType: $event })"
          >
            <v-chip
              v-for="unit in units"
              :key="unit"
              :value="unit"
              small
              outlined
              :data-test="`flow-price-unit-${unit}`"
            >
              {{ $t(`bookable.flow.price.units.${unit}`) }}
            </v-chip>
          </v-chip-group>
        </div>

        <template v-if="mode === 'simple'">
          <div class="flow-field">
            <v-text-field
              :value="firstCategory.priceEur"
              :label="
                vatOn
                  ? $t('bookable.flow.price.amount-net')
                  : $t('bookable.flow.price.amount')
              "
              type="number"
              min="0"
              step="0.01"
              suffix="€"
              outlined
              dense
              hide-details
              data-test="flow-price-amount"
              @input="setCategory({ priceEur: $event })"
            />
            <div class="flow-field__hint" data-test="flow-price-explain">
              {{ explanation }}
            </div>
          </div>

          <v-switch
            v-if="basis === 'per-day' && !longRange"
            :input-value="!!firstCategory.fixedPrice"
            :label="$t('bookable.flow.price.full-days')"
            dense
            hide-details
            class="flow-switch"
            @change="setCategory({ fixedPrice: !!$event })"
          />
          <v-switch
            v-if="basis === 'fixed' && !singleUnit"
            :input-value="!!firstCategory.fixedPrice"
            dense
            hide-details
            class="flow-switch"
            @change="setCategory({ fixedPrice: !!$event })"
          >
            <template #label>
              <div>
                <div>{{ $t("bookable.flow.price.once-per-booking") }}</div>
                <div class="flow-field__hint mt-0">
                  {{ $t("bookable.flow.price.once-per-booking-hint") }}
                </div>
              </div>
            </template>
          </v-switch>
        </template>

        <div v-else class="flow-field">
          <BookableEditPrice
            :bookable="bookable"
            tiers-only
            @update:bookable="$emit('update:bookable', $event)"
          />
        </div>

        <!-- VAT: on or off, a common rate as a chip, any other typed. -->
        <div class="flow-box" data-test="flow-vat">
          <v-switch
            :input-value="vatOn"
            dense
            hide-details
            class="mt-0 pt-0"
            data-test="flow-vat-switch"
            @change="setVat($event ? 19 : 0)"
          >
            <template #label>
              <div>
                <div class="flow-question mb-0">
                  {{ $t("bookable.flow.price.vat") }}
                </div>
                <div class="flow-field__hint mt-0">
                  {{
                    vatOn
                      ? $t("bookable.flow.price.vat-on")
                      : $t("bookable.flow.price.vat-off")
                  }}
                </div>
              </div>
            </template>
          </v-switch>
          <div v-if="vatOn" class="flow-inline mt-3">
            <v-chip-group
              :value="vatChoice"
              mandatory
              active-class="primary--text"
              @change="chooseVat"
            >
              <v-chip
                v-for="rate in vatRates"
                :key="rate"
                :value="rate"
                small
                outlined
              >
                {{ rate }} %
              </v-chip>
              <v-chip value="other" small outlined>
                {{ $t("bookable.flow.price.vat-other") }}
              </v-chip>
            </v-chip-group>
            <v-text-field
              v-if="vatChoice === 'other'"
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
              class="flow-vat-rate"
              @input="setVat($event)"
            />
          </div>
          <div
            v-if="mode === 'simple' && price > 0"
            class="flow-box__summary"
            data-test="flow-vat-summary"
          >
            <span>
              {{
                vatOn
                  ? $t("bookable.flow.price.vat-summary", {
                      net: euro(price),
                      rate: vatRate,
                    })
                  : $t("bookable.flow.price.vat-none")
              }}
            </span>
            <span class="flow-box__total">
              {{ euro(gross) }}
              <span class="flow-field__hint">
                {{
                  vatOn
                    ? $t("bookable.flow.price.gross")
                    : $t("bookable.flow.price.final")
                }}
              </span>
            </span>
          </div>
        </div>

        <v-switch
          v-if="expertMode"
          :input-value="bookable.enableCoupons !== false"
          dense
          hide-details
          class="flow-switch"
          data-test="flow-coupons"
          @change="patch({ enableCoupons: !!$event })"
        >
          <template #label>
            <div>
              <div>{{ $t("bookable.flow.price.coupons") }}</div>
              <div class="flow-field__hint mt-0">
                {{
                  bookable.enableCoupons !== false
                    ? $t("bookable.flow.price.coupons-on")
                    : $t("bookable.flow.price.coupons-off")
                }}
              </div>
            </div>
          </template>
        </v-switch>
      </template>
    </template>
  </div>
</template>

<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import bookableFlowStep from "@/mixins/bookableFlowStep";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import {
  VAT_RATES,
  applyPriceBasis,
  applyPriceMode,
  bookingModeOf,
  handlesExternalPricing,
  priceBasisOf,
  priceExplanation,
  priceModeOf,
} from "@/utils/bookableFlow";

const euro = (value) =>
  Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });

/**
 * Step 3, Preis: Kostenfrei, Einfacher Preis or Tarife after the cloud
 * variant, the basis of the price, VAT and coupons. Tarife are the price
 * editor's graduated prices; the flow asks only for their basis. The chosen
 * mode is the step's own until the categories say it (a fresh tier list
 * still looks like a simple price), so the step is kept alive by the flow.
 */
export default {
  name: "BookableFlowPrice",
  components: { FlowSegmented, BookableEditPrice },
  mixins: [bookableFlowStep, bookableExpertMode],
  data() {
    return {
      mode: priceModeOf(this.bookable),
      prefilled: false,
      otherVat: !this.isCommonVat(this.bookable.priceValueAddedTax),
      vatRates: VAT_RATES,
      units: ["per-item", "per-square-meter"],
    };
  },
  computed: {
    external() {
      return handlesExternalPricing(this.bookable);
    },
    bookingMode() {
      return bookingModeOf(this.bookable);
    },
    longRange() {
      return ["week", "month"].includes(this.bookingMode);
    },
    basis() {
      return priceBasisOf(this.bookable);
    },
    firstCategory() {
      return this.bookable.priceCategories?.[0] || {};
    },
    price() {
      return Number(this.firstCategory.priceEur) || 0;
    },
    singleUnit() {
      return Number(this.bookable.amount) === 1;
    },
    vatRate() {
      return Number(this.bookable.priceValueAddedTax) || 0;
    },
    vatOn() {
      return this.vatRate > 0;
    },
    vatChoice() {
      return this.otherVat ? "other" : this.vatRate;
    },
    gross() {
      return this.price * (1 + this.vatRate / 100);
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
      if (this.expertMode || this.mode === "tiers") modes.push("tiers");
      return modes.map((value) => ({
        value,
        label: this.$t(`bookable.flow.price.modes.${value}`),
      }));
    },
    basisOptions() {
      return ["per-hour", "per-day", "fixed"].map((value) => ({
        value,
        label: this.$t(`bookable.flow.price.bases.${value}`),
      }));
    },
  },
  methods: {
    euro,
    isCommonVat(rate) {
      const value = Number(rate) || 0;
      return value === 0 || VAT_RATES.includes(value);
    },
    setMode(mode) {
      if (mode === this.mode) return;
      this.prefilled = this.mode === "free" && mode !== "free";
      this.mode = mode;
      this.apply((next) => applyPriceMode(next, mode));
    },
    setBasis(basis) {
      this.apply((next) => applyPriceBasis(next, basis));
    },
    setCategory(changes) {
      this.apply((next) => {
        next.priceCategories[0] = { ...next.priceCategories[0], ...changes };
      });
    },
    chooseVat(choice) {
      this.otherVat = choice === "other";
      if (!this.otherVat) this.setVat(choice);
    },
    setVat(rate) {
      if (!Number(rate)) this.otherVat = false;
      this.patch({ priceValueAddedTax: Number(rate) || 0 });
    },
  },
};
</script>
