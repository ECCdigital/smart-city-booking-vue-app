<!-- PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
     Variant B, Fragen des Ablaufs: segment bars for the mode and the
     Preisart (now the backend's four, no „Fester Preis“), an example
     sentence under the price, the VAT box with gross total; Anzahl and
     Höchstmenge as two boxes of Begrenzt | Unbegrenzt with a counter. -->
<template>
  <div>
    <template v-if="part === 'price'">
      <div v-if="external" class="p343-note p343-note--warning">
        <strong>Preise kommen von einem externen Anbieter.</strong>
        Die Preisgestaltung führt ParkraumService.
      </div>

      <template v-else>
        <div class="p343-field">
          <FlowSegmented
            :value="mode"
            :options="modeOptions"
            :label="naming.mode"
            test-id="p343-mode"
            @input="setMode"
          />
        </div>

        <p v-if="mode === 'free'" class="p343-note mb-0">
          Dieses Objekt ist kostenfrei buchbar – im Checkout gibt es keinen
          Zahlungsschritt.
        </p>

        <template v-else>
          <div class="p343-field">
            <div class="p343-question">{{ naming.priceType }}</div>
            <FlowSegmented
              :value="bookable.priceType"
              :options="priceTypeOptions"
              :label="naming.priceType"
              test-id="p343-type"
              @input="setPriceType"
            />
          </div>

          <template v-if="mode === 'simple'">
            <div class="p343-field">
              <v-text-field
                :value="first.priceEur"
                :label="naming.price"
                :error-messages="issues['price.0']"
                type="number"
                min="0"
                step="0.01"
                suffix="€"
                outlined
                dense
                hide-details="auto"
                @input="setPrice"
              />
              <div class="p343-hint">{{ example }}</div>
            </div>

            <v-switch
              v-if="showsFixed"
              :input-value="!!first.fixedPrice"
              dense
              hide-details
              class="mt-0 mb-4"
              @change="setCategory({ fixedPrice: !!$event })"
            >
              <template #label>
                <div>
                  <div>{{ fixedLabel[0] }}</div>
                  <div class="p343-hint mt-0">{{ fixedLabel[1] }}</div>
                </div>
              </template>
            </v-switch>
          </template>

          <div v-else class="p343-field">
            <BookableEditPrice
              :bookable="bookable"
              tiers-only
              @update:bookable="$emit('update:bookable', $event)"
            />
          </div>

          <div class="p343-box">
            <v-switch
              :input-value="vatRate > 0"
              dense
              hide-details
              class="mt-0 pt-0"
              @change="setVat($event ? 19 : 0)"
            >
              <template #label>
                <div>
                  <div class="p343-question mb-0">{{ naming.vat }}</div>
                  <div class="p343-hint mt-0">
                    {{
                      vatRate > 0
                        ? "Auf den Betrag kommt Mehrwertsteuer."
                        : "Der Betrag ist der Endpreis."
                    }}
                  </div>
                </div>
              </template>
            </v-switch>
            <div v-if="vatRate > 0" class="p343-inline mt-3">
              <v-chip
                v-for="rate in VAT_RATES"
                :key="rate"
                small
                outlined
                :color="vatRate === rate ? 'primary' : undefined"
                @click="setVat(rate)"
              >
                {{ rate }} %
              </v-chip>
              <v-text-field
                :value="bookable.priceValueAddedTax"
                label="Satz"
                :error-messages="issues.vat"
                type="number"
                min="0"
                max="100"
                step="0.1"
                suffix="%"
                outlined
                dense
                hide-details="auto"
                style="max-width: 120px"
                @input="setVat"
              />
            </div>
            <div v-if="mode === 'simple' && price > 0" class="p343-summary">
              <span>
                {{
                  vatRate > 0
                    ? `${euro(price)} netto + ${vatRate} % MwSt.`
                    : "Ohne Steueraufschlag"
                }}
              </span>
              <span class="p343-total">
                {{ euro(gross) }}
                <span class="p343-hint">
                  {{ vatRate > 0 ? "brutto" : "Endpreis" }}
                </span>
              </span>
            </div>
          </div>

          <v-switch
            v-if="showsCoupons"
            :input-value="coupons"
            dense
            hide-details
            class="mt-5"
            @change="patch({ enableCoupons: !!$event })"
          >
            <template #label>
              <div>
                <div>{{ naming.coupons[0] }}</div>
                <div class="p343-hint mt-0">{{ naming.coupons[1] }}</div>
              </div>
            </template>
          </v-switch>
        </template>
      </template>
    </template>

    <template v-else>
      <div class="p343-box" :class="{ 'p343-box--warning': warns }">
        <div class="p343-question">{{ naming.amount }}</div>
        <p v-if="externalAmount" class="p343-note mb-0">
          Die Anzahl kommt von einem externen Anbieter.
        </p>
        <template v-else>
          <FlowSegmented
            :value="unlimited ? 'unlimited' : 'limited'"
            :options="limitOptions"
            :label="naming.amount"
            test-id="p343-amount"
            @input="setUnlimited($event === 'unlimited')"
          />
          <Stepper
            v-if="!unlimited"
            class="mt-4"
            :value="amount"
            :label="naming.amount"
            :unit="unit"
            @input="setAmount"
          />
          <p v-else class="p343-hint mb-0">{{ naming.amountUnlimited }}</p>
          <p v-if="warns" class="p343-hint mb-0">
            <v-icon small color="warning">mdi-alert-outline</v-icon>
            Mehr als eine Einheit für einen Raum – sicher?
          </p>
        </template>
      </div>

      <div v-if="showsMax" class="p343-box">
        <div class="p343-question">{{ naming.max }}</div>
        <FlowSegmented
          :value="maxUnlimited ? 'unlimited' : 'limited'"
          :options="limitOptions"
          :label="naming.max"
          test-id="p343-max"
          @input="setMaxUnlimited($event === 'unlimited')"
        />
        <Stepper
          v-if="!maxUnlimited"
          class="mt-4"
          :value="max"
          :label="naming.max"
          :unit="`${unit} je Buchung`"
          @input="setMax"
        />
        <p v-else class="p343-hint mb-0">{{ naming.maxUnlimited }}</p>
        <div v-if="issues.max" class="p343-error">{{ issues.max }}</div>
      </div>
    </template>
  </div>
</template>

<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import Stepper from "./Stepper.vue";
import priceVariant from "./priceVariant";
import { samplePrice } from "./priceShared";

export default {
  name: "PriceVariantB",
  components: { FlowSegmented, BookableEditPrice, Stepper },
  mixins: [priceVariant],
  computed: {
    limitOptions() {
      return [
        { value: "limited", label: this.naming.limited },
        { value: "unlimited", label: this.naming.unlimited },
      ];
    },
    example() {
      if (!(this.price > 0)) return "Ohne Betrag bleibt die Buchung kostenfrei.";
      const hours = this.bookable.priceType === "per-day" ? 46 : 2.5;
      const s = samplePrice(this.bookable, { hours, quantity: 1 });
      const when =
        this.bookable.priceType === "per-day"
          ? "Freitag 14:00 bis Sonntag 12:00"
          : "Freitag 14:00 bis 16:30";
      return `Beispiel ${when}: ${s.how} = ${this.euro(s.net)} netto.`;
    },
  },
};
</script>

<style scoped>
.p343-box {
  margin-top: var(--scb-space-5);
  padding: var(--scb-space-4);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}
.p343-box:first-child {
  margin-top: 0;
}
.p343-box--warning {
  border-color: var(--v-warning-base);
}
.p343-summary {
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
.p343-total {
  font-size: 1.25rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--v-primary-base);
}
</style>
