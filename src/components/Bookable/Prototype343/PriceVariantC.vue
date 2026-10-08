<!-- PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
     Variant C, neu: Satz mit Beispielrechnung. The price is one sentence
     with the fields inline, the options as lines under it, and beside it
     the receipt the checkout would compute for an example booking (Dauer
     and Menge adjustable), after the backend's rule. Anzahl and Höchstmenge
     are one sentence with a row of units that shows both. -->
<template>
  <div>
    <template v-if="part === 'price'">
      <div v-if="external" class="p343-note p343-note--warning">
        <strong>Preise kommen von einem externen Anbieter.</strong>
        Die Preisgestaltung führt ParkraumService.
      </div>

      <div v-else class="c343">
        <div class="c343__main">
          <div v-if="mode !== 'tiers'" class="c343__sentence">
            <span>Eine Buchung kostet</span>
            <v-text-field
              :value="first.priceEur"
              :error-messages="issues['price.0']"
              :aria-label="naming.price"
              type="number"
              min="0"
              step="0.01"
              suffix="€"
              outlined
              dense
              hide-details="auto"
              class="c343__input c343__input--price"
              @input="setPrice"
            />
            <span>netto</span>
            <v-select
              :value="bookable.priceType"
              :items="priceTypeOptions"
              item-text="label"
              item-value="value"
              :aria-label="naming.priceType"
              outlined
              dense
              hide-details
              class="c343__input c343__input--type"
              @change="setPriceType"
            />
            <span>zzgl.</span>
            <v-select
              :value="vatChoice"
              :items="vatItems"
              :aria-label="naming.vat"
              outlined
              dense
              hide-details
              class="c343__input c343__input--vat"
              @change="chooseVat"
            />
            <v-text-field
              v-if="vatChoice === 'other'"
              :value="bookable.priceValueAddedTax"
              :error-messages="issues.vat"
              type="number"
              min="0"
              max="100"
              suffix="%"
              outlined
              dense
              hide-details="auto"
              class="c343__input c343__input--vat"
              @input="setVat"
            />
            <span>{{ naming.vat }}.</span>
          </div>

          <div v-else>
            <div class="p343-question">
              {{ naming.modes.tiers }} {{ naming.priceTypes[bookable.priceType] }}
            </div>
            <div class="c343__sentence mb-3">
              <span>{{ naming.priceType }}</span>
              <v-select
                :value="bookable.priceType"
                :items="priceTypeOptions"
                item-text="label"
                item-value="value"
                outlined
                dense
                hide-details
                class="c343__input c343__input--type"
                @change="setPriceType"
              />
              <span>zzgl.</span>
              <v-select
                :value="vatChoice"
                :items="vatItems"
                outlined
                dense
                hide-details
                class="c343__input c343__input--vat"
                @change="chooseVat"
              />
              <span>{{ naming.vat }}</span>
            </div>
            <BookableEditPrice
              :bookable="bookable"
              tiers-only
              @update:bookable="$emit('update:bookable', $event)"
            />
          </div>

          <ul class="c343__options">
            <li v-if="showsFixed && mode !== 'tiers'">
              <v-checkbox
                :input-value="!!first.fixedPrice"
                dense
                hide-details
                class="mt-0 pt-0"
                @change="setCategory({ fixedPrice: !!$event })"
              >
                <template #label>
                  <div>
                    <div>{{ fixedLabel[0] }}</div>
                    <div class="p343-hint mt-0">{{ fixedLabel[1] }}</div>
                  </div>
                </template>
              </v-checkbox>
            </li>
            <li v-if="showsCoupons">
              <v-checkbox
                :input-value="coupons"
                dense
                hide-details
                class="mt-0 pt-0"
                @change="patch({ enableCoupons: !!$event })"
              >
                <template #label>
                  <div>
                    <div>{{ naming.coupons[0] }}</div>
                    <div class="p343-hint mt-0">{{ naming.coupons[1] }}</div>
                  </div>
                </template>
              </v-checkbox>
            </li>
            <li v-if="modeOptions.length > 2">
              <v-btn
                text
                small
                color="primary"
                class="px-0"
                @click="setMode(mode === 'tiers' ? 'simple' : 'tiers')"
              >
                {{
                  mode === "tiers"
                    ? `Zurück zu einem Preis`
                    : `${naming.modes.tiers} anlegen …`
                }}
              </v-btn>
            </li>
          </ul>
        </div>

        <aside class="c343__receipt" aria-label="Beispielrechnung">
          <div class="c343__receipt-title">So rechnet der Checkout</div>
          <template v-if="price > 0 && mode !== 'tiers'">
            <label class="c343__slider">
              <span>Dauer ab Fr 14:00</span>
              <strong>{{ hours }} Std.</strong>
              <input v-model.number="hours" type="range" min="1" max="72" />
            </label>
            <label class="c343__slider">
              <span>Menge</span>
              <strong>{{ quantity }} {{ unit }}</strong>
              <input v-model.number="quantity" type="range" min="1" max="10" />
            </label>
            <div class="c343__line">
              <span>{{ sample.how }}</span>
              <span>{{ euro(sample.net) }}</span>
            </div>
            <div class="c343__line">
              <span>+ {{ vatRate }} % MwSt.</span>
              <span>{{ euro(sample.gross - sample.net) }}</span>
            </div>
            <div class="c343__line c343__line--total">
              <span>Buchende zahlen</span>
              <span>{{ euro(sample.gross) }}</span>
            </div>
            <div v-if="coupons" class="p343-hint">
              Ein Rabattcode kann den Betrag im Checkout senken.
            </div>
          </template>
          <p v-else-if="mode === 'tiers'" class="p343-hint mb-0">
            Bei Staffelpreisen hängt der Betrag von der passenden Kategorie ab.
          </p>
          <p v-else class="mb-0">
            <strong>Kostenfrei.</strong> Im Checkout gibt es keinen
            Zahlungsschritt.
          </p>
        </aside>
      </div>
    </template>

    <template v-else>
      <p v-if="externalAmount" class="p343-note">
        Die Anzahl kommt von einem externen Anbieter.
      </p>
      <div v-else class="c343__sentence">
        <span>Es gibt</span>
        <v-select
          :value="unlimited ? 'unlimited' : 'limited'"
          :items="limitItems"
          outlined
          dense
          hide-details
          class="c343__input c343__input--limit"
          @change="setUnlimited($event === 'unlimited')"
        />
        <Stepper
          v-if="!unlimited"
          :value="amount"
          :label="naming.amount"
          :unit="unit"
          @input="setAmount"
        />
        <span v-else>viele</span>
        <span>davon.</span>
      </div>

      <div v-if="showsMax" class="c343__sentence mt-4">
        <span>Eine Buchung nimmt</span>
        <v-select
          :value="maxUnlimited ? 'unlimited' : 'limited'"
          :items="maxItems"
          outlined
          dense
          hide-details
          class="c343__input c343__input--limit"
          @change="setMaxUnlimited($event === 'unlimited')"
        />
        <Stepper
          v-if="!maxUnlimited"
          :value="max"
          :label="naming.max"
          :unit="unit"
          @input="setMax"
        />
        <span>.</span>
      </div>

      <div class="c343__units" aria-hidden="true">
        <span
          v-for="i in shownUnits"
          :key="i"
          class="c343__unit"
          :class="{ 'c343__unit--one': maxUnlimited || i <= max }"
        />
        <span v-if="unlimited || amount > 12" class="c343__more">…</span>
      </div>
      <div class="p343-hint">
        {{ unitsCaption }}
      </div>
      <p v-if="warns" class="p343-hint mb-0">
        <v-icon small color="warning">mdi-alert-outline</v-icon>
        Mehr als eine Einheit für einen Raum – sicher?
      </p>
    </template>
  </div>
</template>

<script>
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import Stepper from "./Stepper.vue";
import priceVariant from "./priceVariant";
import { VAT_RATES, samplePrice } from "./priceShared";

export default {
  name: "PriceVariantC",
  components: { BookableEditPrice, Stepper },
  mixins: [priceVariant],
  data: () => ({ hours: 2.5, quantity: 1, otherVat: false }),
  computed: {
    sample() {
      return samplePrice(this.bookable, {
        hours: this.hours,
        quantity: this.quantity,
      });
    },
    vatItems() {
      return [
        { value: 0, text: "0 %" },
        ...VAT_RATES.map((r) => ({ value: r, text: `${r} %` })),
        { value: "other", text: "anderer Satz" },
      ];
    },
    // Transient like the mode: a typed 19 shows as the chip 19 – same data.
    vatChoice() {
      if (this.otherVat) return "other";
      return [0, ...VAT_RATES].includes(this.vatRate) ? this.vatRate : "other";
    },
    limitItems() {
      return [
        { value: "limited", text: "genau" },
        { value: "unlimited", text: "beliebig" },
      ];
    },
    maxItems() {
      return [
        { value: "unlimited", text: "beliebig viele" },
        { value: "limited", text: "höchstens" },
      ];
    },
    shownUnits() {
      return this.unlimited ? 12 : Math.min(this.amount, 12);
    },
    unitsCaption() {
      const all = this.unlimited
        ? `${this.naming.amount}: ${this.naming.unlimited.toLowerCase()}`
        : `${this.naming.amount}: ${this.amount} ${this.unit}`;
      const max = this.maxUnlimited
        ? "eine Buchung darf alle freien nehmen"
        : `${this.naming.max}: ${this.max}`;
      return `${all} · ${max}`;
    },
  },
  methods: {
    chooseVat(choice) {
      this.otherVat = choice === "other";
      if (!this.otherVat) this.setVat(choice);
    },
  },
};
</script>

<style scoped>
.c343 {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--scb-space-5);
}
@media (min-width: 960px) {
  .c343 {
    grid-template-columns: minmax(0, 1fr) 280px;
  }
}
.c343__sentence {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  line-height: 2.5;
  color: var(--scb-text);
}
.c343__input {
  flex: 0 0 auto;
}
.c343__input--price {
  width: 130px;
}
.c343__input--type {
  width: 150px;
}
.c343__input--vat {
  width: 130px;
}
.c343__input--limit {
  width: 160px;
}
.c343__options {
  margin: var(--scb-space-4) 0 0;
  padding: 0;
  list-style: none;
}
.c343__options li {
  padding: var(--scb-space-2) 0;
  border-top: 1px solid var(--scb-rule);
}
.c343__receipt {
  align-self: start;
  padding: var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  background: var(--scb-surface-tint);
  border: 1px dashed var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}
.c343__receipt-title {
  margin-bottom: var(--scb-space-3);
  font-weight: var(--scb-font-weight-semibold);
}
.c343__slider {
  display: grid;
  grid-template-columns: 1fr auto;
  margin-bottom: var(--scb-space-3);
  color: var(--scb-text-muted);
}
.c343__slider input {
  grid-column: 1 / -1;
  width: 100%;
}
.c343__line {
  display: flex;
  justify-content: space-between;
  gap: var(--scb-space-3);
  padding: var(--scb-space-1) 0;
  border-top: 1px solid var(--scb-rule);
}
.c343__line--total {
  font-weight: var(--scb-font-weight-semibold);
  color: var(--v-primary-base);
}
.c343__units {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--scb-space-5);
}
.c343__unit {
  width: 22px;
  height: 22px;
  border: 1px solid var(--scb-surface-border);
  border-radius: 4px;
  background: var(--scb-surface);
}
.c343__unit--one {
  background: var(--scb-selected-tint);
  border-color: var(--v-primary-base);
}
.c343__more {
  align-self: center;
  color: var(--scb-text-muted);
}
</style>
