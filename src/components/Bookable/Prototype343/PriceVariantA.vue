<!-- PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
     Variant A, Formular des Editors: a grid of filled fields, no modes.
     0 € is kostenfrei, Staffelpreise a switch; Anzahl and Höchstmenge are
     plain number fields, empty = unbegrenzt. -->
<template>
  <div>
    <template v-if="part === 'price'">
      <div v-if="external" class="p343-note p343-note--warning">
        Preise kommen von einem externen Anbieter (ParkraumService). Die
        Einstellungen dazu stehen nicht in dieser Komponente.
      </div>

      <template v-else>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-select
              :value="bookable.priceType"
              :items="priceTypeOptions"
              item-text="label"
              item-value="value"
              :label="naming.priceType"
              background-color="accent"
              filled
              dense
              hide-details
              @change="setPriceType"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-if="mode !== 'tiers'"
              :value="first.priceEur"
              :label="naming.price"
              :error-messages="issues['price.0']"
              :hint="price > 0 ? '' : 'Bei 0 € ist die Buchung kostenfrei.'"
              persistent-hint
              type="number"
              min="0"
              step="0.01"
              suffix="€"
              background-color="accent"
              filled
              dense
              @input="setPrice"
            />
          </v-col>

          <v-col v-if="showsFixed && mode !== 'tiers'" cols="12" md="6">
            <v-switch
              :input-value="!!first.fixedPrice"
              dense
              hide-details
              class="mt-1"
              @change="setCategory({ fixedPrice: !!$event })"
            >
              <template #label>
                <div>
                  <div class="font-weight-medium">{{ fixedLabel[0] }}</div>
                  <div class="text-caption text--secondary">
                    {{ fixedLabel[1] }}
                  </div>
                </div>
              </template>
            </v-switch>
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              :value="bookable.priceValueAddedTax"
              :label="naming.vat"
              :error-messages="issues.vat"
              hint="0 % = Der Preis ist der Endpreis."
              persistent-hint
              type="number"
              min="0"
              max="100"
              suffix="%"
              background-color="accent"
              filled
              dense
              @input="setVat"
            />
          </v-col>
        </v-row>

        <div v-if="modeOptions.length > 2" class="p343-rule">
          <v-switch
            :input-value="mode === 'tiers'"
            dense
            hide-details
            class="mt-0"
            @change="setMode($event ? 'tiers' : 'simple')"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">{{ naming.modes.tiers }}</div>
                <div class="text-caption text--secondary">
                  Unterschiedliche Preise nach Menge, Wochentag oder Feiertag
                </div>
              </div>
            </template>
          </v-switch>
          <div v-if="mode === 'tiers'" class="mt-4">
            <BookableEditPrice
              :bookable="bookable"
              tiers-only
              @update:bookable="$emit('update:bookable', $event)"
            />
          </div>
        </div>

        <div v-if="showsCoupons" class="p343-rule">
          <v-switch
            :input-value="coupons"
            dense
            hide-details
            class="mt-0"
            @change="patch({ enableCoupons: !!$event })"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">{{ naming.coupons[0] }}</div>
                <div class="text-caption text--secondary">
                  {{ naming.coupons[1] }}
                </div>
              </div>
            </template>
          </v-switch>
        </div>
      </template>
    </template>

    <template v-else>
      <v-row dense>
        <v-col cols="12" md="6">
          <v-text-field
            :value="unlimited ? '' : bookable.amount"
            :label="naming.amount"
            :hint="unlimited ? naming.amountUnlimited : ''"
            :error-messages="issues.amount"
            :disabled="externalAmount"
            persistent-hint
            type="number"
            min="1"
            step="1"
            :suffix="unit"
            background-color="accent"
            filled
            dense
            @input="setAmount"
          />
          <div v-if="externalAmount" class="p343-hint">
            Die Anzahl kommt von einem externen Anbieter.
          </div>
          <div v-if="warns" class="p343-hint">
            <v-icon x-small color="warning">mdi-alert-outline</v-icon>
            Mehr als eine Einheit für einen Raum – sicher?
          </div>
        </v-col>
        <v-col v-if="showsMax" cols="12" md="6">
          <v-text-field
            :value="maxUnlimited ? '' : bookable.maxAmountPerBooking"
            :label="naming.max"
            :hint="maxUnlimited ? naming.maxUnlimited : ''"
            :error-messages="issues.max"
            persistent-hint
            type="number"
            min="1"
            step="1"
            :suffix="unit"
            background-color="accent"
            filled
            dense
            @input="setMax"
          />
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script>
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import priceVariant from "./priceVariant";

export default {
  name: "PriceVariantA",
  components: { BookableEditPrice },
  mixins: [priceVariant],
};
</script>
