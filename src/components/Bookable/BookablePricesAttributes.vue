<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";

export default {
  name: "BookablePricesAttributes",
  components: { BaseSection },
  props: {
    bookable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localBookable: { ...this.bookable },
      selectedState: null,
      availableHolidays: [],
      priceTypes: [
        {
          id: "per-item",
          name: "pro Stück",
        },
        {
          id: "per-hour",
          name: "pro Stunde",
        },
        {
          id: "per-day",
          name: "pro Tag",
        },
        {
          id: "per-square-meter",
          name: "pro m²",
        },
      ],
      useGraduatedPrices: false,
      weekdays: [
        {
          id: 1,
          name: "Montag",
        },
        {
          id: 2,
          name: "Dienstag",
        },
        {
          id: 3,
          name: "Mittwoch",
        },
        {
          id: 4,
          name: "Donnerstag",
        },
        {
          id: 5,
          name: "Freitag",
        },
        {
          id: 6,
          name: "Samstag",
        },
        {
          id: 0,
          name: "Sonntag",
        },
      ],
      states: [
        { text: "Bundesweit", value: null },
        { text: "Brandenburg", value: "BB" },
        { text: "Berlin", value: "BE" },
        { text: "Baden-Württemberg", value: "BW" },
        { text: "Bayern", value: "BY" },
        { text: "Hansestadt Bremen", value: "HB" },
        { text: "Hessen", value: "HE" },
        { text: "Hansestadt Hamburg", value: "HH" },
        { text: "Mecklenburg Vorpommern", value: "MV" },
        { text: "Niedersachsen", value: "NI" },
        { text: "Nordrhein-Westfalen", value: "NW" },
        { text: "Rheinland-Pfalz", value: "RP" },
        { text: "Schleswig-Holstein", value: "SH" },
        { text: "Saarland", value: "SL" },
        { text: "Sachsen", value: "SN" },
        { text: "Sachsen-Anhalt", value: "ST" },
        { text: "Thüringen", value: "TH" },
      ],
    };
  },
  watch: {
    bookable: {
      handler(v) {
        this.localBookable = { ...v };
      },
    },
    "localBookable.priceCategories": {
      handler: function () {
        if (!this.useGraduatedPrices) {
          this.setUseGraduatedPrices();
        }
      },
      deep: true,
    },
  },
  computed: {
    intervalSuffix: {
      get() {
        if (this.localBookable.priceType === "per-hour") {
          return "Std.";
        } else if (this.localBookable.priceType === "per-day") {
          return "Tage";
        } else if (this.localBookable.priceType === "per-square-meter") {
          return "m²";
        } else {
          return "Stück";
        }
      },
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:bookable", this.localBookable);
    },
    setUseGraduatedPrices() {
      this.useGraduatedPrices = !!(
        this.localBookable.priceCategories.length > 1 ||
        this.localBookable.priceCategories.some(
          (pC) => pC.interval.start !== null
        ) ||
        this.localBookable.priceCategories.some(
          (pC) => pC.interval.end !== null
        )
      );
    },
    checkNull(field) {
      if (this[field] === "") {
        this[field] = null;
      }
    },
    removePriceCategory(index) {
      this.localBookable.priceCategories.splice(index, 1);
    },
    addPriceCategory() {
      const lastCategory =
        this.localBookable.priceCategories[this.localBookable.priceCategories.length - 1];
      this.localBookable.priceCategories.push({
        priceEur: 0,
        priceValueAddedTax: 0,
        interval: {
          start: lastCategory ? lastCategory.interval.end : null,
          end: null,
        },
        fixedPrice: false,
      });
    },
    async fetchHolidays() {
      const response = await ApiHolidaysService.getHolidays(
        "DE",
        this.selectedState
      );
      this.availableHolidays = response.data
        .map((holiday) =>
          holiday.type === "public"
            ? {
              name: holiday.name,
              countryCode: "DE",
              stateCode: this.selectedState,
            }
            : null
        )
        .filter(Boolean);
    },
  },
  mounted() {
    this.fetchHolidays();
  },
};
</script>

<template>
  <BaseSection title="Preise" icon="mdi-currency-eur">
    <div class="d-flex align-center mb-4">
      <v-tooltip bottom max-width="300" open-delay="200">
        <template v-slot:activator="{ on, attrs }">
          <div v-on="on" v-bind="attrs">
            <v-switch
              dense
              label="Gutscheine aktivieren"
              hide-details
              v-model="localBookable.enableCoupons"
              @change="emitUpdate"
            ></v-switch>
          </div>
        </template>
        <span>
          Aktivieren Sie diese Option, um Gutscheine für dieses Buchungsobjekt
          zu ermöglichen. Gutscheine können dann beim Checkout eingelöst werden.
        </span>
      </v-tooltip>
    </div>

    <v-row>
      <v-col class="col-12 col-md-3">
        <v-select
          background-color="accent"
          filled
          label="Preisart"
          hide-details
          v-model="localBookable.priceType"
          :items="priceTypes"
          item-text="name"
          item-value="id"
          @change="emitUpdate"
        ></v-select>
      </v-col>
      <v-col class="col-12 col-md-2">
        <v-text-field
          background-color="accent"
          filled
          label="Verfügbare Anzahl"
          :hint="!localBookable.amount ? 'Anzahl ist unbegrenzt!' : ''"
          :persistent-hint="!localBookable.amount"
          v-model="localBookable.amount"
          :suffix="
            localBookable.priceType === 'per-square-meter' ? 'm²' : 'Stück'
          "
          @input="emitUpdate"
        ></v-text-field>
      </v-col>
      <v-col v-if="!useGraduatedPrices" class="col-12 col-md-3">
        <v-text-field
          v-if="localBookable.priceCategories[0]"
          background-color="accent"
          filled
          label="Preis (netto)"
          hide-details
          v-model="localBookable.priceCategories[0].priceEur"
          suffix="Euro"
        ></v-text-field>
      </v-col>
      <v-col class="col-12 col-md-2">
        <v-text-field
          background-color="accent"
          filled
          label="MwSt."
          hide-details
          v-model="localBookable.priceValueAddedTax"
          suffix="%"
        ></v-text-field>
      </v-col>

      <v-col v-if="!useGraduatedPrices" class="col-12 col-md-1">
        <v-tooltip top max-width="300" open-delay="400">
          <template v-slot:activator="{ on, attrs }">
            <div v-bind="attrs" v-on="on">
              <v-checkbox
                v-if="localBookable.priceCategories[0]"
                v-model="localBookable.priceCategories[0].fixedPrice"
                label="Pauschalpreis"
              >
              </v-checkbox>
            </div>
          </template>
          <span> Bei Aktivierung wird immer der Grundpreis berechnet. </span>
        </v-tooltip>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-if="!useGraduatedPrices">
        <v-btn dense outlined hide-details @click="useGraduatedPrices = true">
          Staffelpreise
        </v-btn>
      </v-col>
    </v-row>

    <v-card v-if="useGraduatedPrices" flat outlined rounded class="mt-3">
      <v-card-subtitle
        class="d-flex justify-space-between mb-4"
        style="background-color: var(--v-accent-base)"
      >
        <span class="text-h6">Preis-Kategorien</span>
      </v-card-subtitle>
      <v-card-text>
        <div
          v-for="(priceCategory, idx) in localBookable.priceCategories"
          :key="idx"
        >
          <div>
            <v-row>
              <v-col class="col-12 col-md-3">
                <v-text-field
                  background-color="accent"
                  filled
                  label="Preis (netto)"
                  hide-details
                  v-model="priceCategory.priceEur"
                  suffix="Euro"
                ></v-text-field>
              </v-col>
              <v-col class="col-6 col-md-2">
                <v-text-field
                  v-model="priceCategory.interval.start"
                  background-color="accent"
                  filled
                  label="Gültig ab"
                  type="number"
                  :suffix="intervalSuffix"
                  @blur="checkNull('priceCategories.interval.start')"
                ></v-text-field>
              </v-col>
              <v-col class="col-6 col-md-2">
                <v-text-field
                  v-model="priceCategory.interval.end"
                  background-color="accent"
                  filled
                  label="Gültig bis"
                  type="number"
                  :suffix="intervalSuffix"
                  @blur="checkNull('priceCategories.interval.start')"
                ></v-text-field>
              </v-col>
              <v-col class="col-12 col-md-2">
                <v-tooltip top max-width="300" open-delay="400">
                  <template v-slot:activator="{ on, attrs }">
                    <div v-bind="attrs" v-on="on">
                      <v-checkbox
                        v-model="priceCategory.fixedPrice"
                        label="Pauschalpreis"
                      >
                      </v-checkbox>
                    </div>
                  </template>
                  <span>
                    Bei Aktivierung wird immer der Grundpreis berechnet.
                  </span>
                </v-tooltip>
              </v-col>
              <v-col class="" style="text-align: right">
                <v-btn
                  :disabled="idx === 0"
                  icon
                  @click="removePriceCategory(idx)"
                  class="mt-4"
                  color="error"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-select
                  background-color="accent"
                  filled
                  label="Wochentage"
                  hide-details
                  v-model="priceCategory.weekdays"
                  multiple
                  chips
                  :items="weekdays"
                  item-text="name"
                  item-value="id"
                ></v-select>
              </v-col>
              <v-col>
                <v-combobox
                  background-color="accent"
                  filled
                  multiple
                  chips
                  clearable
                  label="Feiertage"
                  :items="availableHolidays"
                  item-text="name"
                  item-value="date"
                  v-model="priceCategory.holidays"
                >
                  <template v-slot:prepend-item>
                    <v-list-item ripple>
                      <v-select
                        v-model="selectedState"
                        :items="states"
                        item-text="text"
                        item-value="value"
                        dense
                        hide-details
                        outlined
                        label="Bundesland"
                        prepend-icon="mdi-filter"
                        @change="fetchHolidays"
                      />
                    </v-list-item>
                    <v-divider class="mx-2" />
                  </template>
                </v-combobox>
              </v-col>
            </v-row>
          </div>
          <v-divider
            v-if="
              localBookable.priceCategories.length > 1 && idx !== localBookable.priceCategories.length - 1
            "
            class="mb-5"
          ></v-divider>
        </div>
        <div>
          <v-btn outlined class="mt-2" @click="addPriceCategory"
          >Neue Preis-Kategorie</v-btn
          >
        </div>
      </v-card-text>
    </v-card>
  </BaseSection>
</template>

<style scoped></style>
