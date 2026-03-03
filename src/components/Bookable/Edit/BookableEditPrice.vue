<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import debounce from "lodash/debounce";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";

export default {
  name: "BookableEditPrice",
  components: { BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      valid: false,
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
      availableHolidays: [],
      selectedState: null,
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
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this._emitDebounced(val);
      },
    },
    intervalSuffix: {
      get() {
        if (this.model.priceType === "per-hour") {
          return "Std.";
        } else if (this.model.priceType === "per-day") {
          return "Tage";
        } else if (this.model.priceType === "per-square-meter") {
          return "m²";
        } else {
          return "Stück";
        }
      },
    },
  },
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:bookable", { ...val });
    }, 200);
  },
  watch: {
    "bookable.id": {
      immediate: true,
      handler() {
        this.fetchHolidays();
      },
    },
  },
  methods: {
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    checkNull(path) {
      const value = this.model;
      const keys = path.split(".");

      let obj = value;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      if (obj[lastKey] === "") {
        obj[lastKey] = null;
      }
    },
    removePriceCategory(index) {
      this.model.priceCategories.splice(index, 1);
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
    addPriceCategory() {
      const lastCategory =
        this.model.priceCategories[this.model.priceCategories.length - 1];
      this.model.priceCategories.push({
        priceEur: 0,
        priceValueAddedTax: 0,
        interval: {
          start: lastCategory ? lastCategory.interval.end : null,
          end: null,
        },
        fixedPrice: false,
      });
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Preise" icon="mdi-cash-multiple">
      <div class="d-flex align-center mb-4">
        <v-tooltip bottom max-width="300" open-delay="200">
          <template v-slot:activator="{ on, attrs }">
            <div v-on="on" v-bind="attrs">
              <v-switch
                dense
                label="Gutscheine aktivieren"
                hide-details
                v-model="model.enableCoupons"
              ></v-switch>
            </div>
          </template>
          <span>
            Aktivieren Sie diese Option, um Gutscheine für dieses Buchungsobjekt
            zu ermöglichen. Gutscheine können dann beim Checkout eingelöst
            werden.
          </span>
        </v-tooltip>
      </div>

      <v-row no-gutters>
        <v-col cols="12" md="3">
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Verfügbare Anzahl"
            :hint="!model.amount ? 'Anzahl ist unbegrenzt!' : ''"
            :persistent-hint="!model.amount"
            v-model="model.amount"
            :suffix="model.priceType === 'per-square-meter' ? 'm²' : 'Stück'"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="3">
          <v-select
            background-color="accent"
            filled
            dense
            label="Preisart"
            hide-details
            v-model="model.priceType"
            :items="priceTypes"
            item-text="name"
            item-value="id"
          ></v-select>
        </v-col>
        <v-col v-if="!model.useGraduatedPrices" cols="12" md="3">
          <v-text-field
            v-if="model.priceCategories[0]"
            background-color="accent"
            filled
            dense
            label="Preis (netto)"
            hide-details
            v-model="model.priceCategories[0].priceEur"
            suffix="Euro"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            background-color="accent"
            filled
            dense
            label="MwSt."
            hide-details
            v-model="model.priceValueAddedTax"
            suffix="%"
          ></v-text-field>
        </v-col>
        <v-col v-if="!model.useGraduatedPrices" cols="12" md="1">
          <v-tooltip top max-width="300" open-delay="400">
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-checkbox
                  v-if="model.priceCategories[0]"
                  v-model="model.priceCategories[0].fixedPrice"
                  label="Pauschal"
                  dense
                >
                </v-checkbox>
              </div>
            </template>
            <span> Bei Aktivierung wird immer der Grundpreis berechnet. </span>
          </v-tooltip>
        </v-col>
      </v-row>

      <v-row v-if="!model.useGraduatedPrices" class="mt-2">
        <v-col>
          <v-btn dense outlined @click="model.useGraduatedPrices = true">
            <v-icon left small>mdi-chart-line-variant</v-icon>
            Staffelpreise aktivieren
          </v-btn>
        </v-col>
      </v-row>

      <v-card
        v-if="model.useGraduatedPrices"
        flat
        outlined
        rounded
        class="mt-4"
      >
        <v-card-subtitle
          class="d-flex justify-space-between align-center pa-3"
          style="background-color: var(--v-accent-base)"
        >
          <span class="font-weight-bold">Preis-Kategorien</span>
        </v-card-subtitle>
        <v-divider></v-divider>
        <v-card-text class="pa-3">
          <div v-for="(priceCategory, idx) in model.priceCategories" :key="idx">
            <v-row>
              <v-col cols="12" md="3">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Preis (netto)"
                  hide-details
                  v-model="priceCategory.priceEur"
                  suffix="Euro"
                ></v-text-field>
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field
                  v-model="priceCategory.interval.start"
                  background-color="accent"
                  filled
                  dense
                  label="Gültig ab"
                  type="number"
                  hide-details
                  :suffix="intervalSuffix"
                  @blur="checkNull('priceCategories.interval.start')"
                ></v-text-field>
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field
                  v-model="priceCategory.interval.end"
                  background-color="accent"
                  filled
                  dense
                  label="Gültig bis"
                  type="number"
                  hide-details
                  :suffix="intervalSuffix"
                  @blur="checkNull('priceCategories.interval.start')"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-tooltip top max-width="300" open-delay="400">
                  <template v-slot:activator="{ on, attrs }">
                    <div v-bind="attrs" v-on="on">
                      <v-checkbox
                        v-model="priceCategory.fixedPrice"
                        label="Pauschalpreis"
                        dense
                        hide-details
                      >
                      </v-checkbox>
                    </div>
                  </template>
                  <span>
                    Bei Aktivierung wird immer der Grundpreis berechnet.
                  </span>
                </v-tooltip>
              </v-col>
              <v-col cols="12" md="3" class="d-flex align-center justify-end">
                <v-btn
                  :disabled="idx === 0"
                  icon
                  small
                  @click="removePriceCategory(idx)"
                  color="error"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
            <v-row class="mt-2">
              <v-col cols="12" md="6">
                <v-select
                  background-color="accent"
                  filled
                  dense
                  label="Wochentage"
                  hide-details
                  v-model="priceCategory.weekdays"
                  multiple
                  chips
                  small-chips
                  :items="weekdays"
                  item-text="name"
                  item-value="id"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  background-color="accent"
                  filled
                  dense
                  multiple
                  chips
                  small-chips
                  clearable
                  label="Feiertage"
                  hide-details
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
            <v-divider
              v-if="
                model.priceCategories.length > 1 &&
                idx !== model.priceCategories.length - 1
              "
              class="my-4"
            ></v-divider>
          </div>
          <div class="mt-3">
            <v-btn outlined small @click="addPriceCategory">
              <v-icon left small>mdi-plus</v-icon>
              Neue Preis-Kategorie
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </BaseSection>
  </v-form>
</template>

<style scoped></style>
