<template>
  <div data-test="price-tiers">
    <div class="d-flex justify-space-between align-center mb-3">
      <v-subheader class="pl-0">
        <v-icon small class="mr-2"> mdi-format-list-numbered </v-icon>
        Preis-Kategorien
      </v-subheader>
      <v-btn
        small
        color="primary"
        data-test="price-category-add"
        @click="addPriceCategory"
      >
        <v-icon left small>mdi-plus</v-icon>
        Kategorie hinzufügen
      </v-btn>
    </div>

    <v-alert v-if="hasPriceCategories" color="info" dense text class="mb-4">
      <div class="d-flex align-center">
        <v-icon class="mr-3" color="info"> mdi-information-outline </v-icon>
        <div>
          <strong>Tipp:</strong> Die Kategorien werden in der angegebenen
          Reihenfolge geprüft. Die erste passende Kategorie wird angewendet.
        </div>
      </div>
    </v-alert>

    <div v-if="hasPriceCategories">
      <v-list two-line class="py-0">
        <template v-for="(priceCategory, idx) in priceCategories">
          <v-list-item
            :key="`price-${idx}`"
            class="price-category-item elevation-1 mb-3 rounded"
            @click="toggleExpand(idx)"
          >
            <v-list-item-avatar>
              <v-avatar color="green" size="40">
                <span class="white--text font-weight-bold">
                  {{ idx + 1 }}
                </span>
              </v-avatar>
            </v-list-item-avatar>

            <v-list-item-content>
              <v-list-item-title class="d-flex align-center mb-1">
                <span class="text-h6 font-weight-bold mr-2">
                  {{ formatPrice(priceCategory.priceEur) }} €
                </span>
                <v-chip
                  v-if="priceCategory.fixedPrice"
                  x-small
                  color="orange"
                  text-color="white"
                >
                  {{ fixedLabel }}
                </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="d-flex align-center flex-wrap">
                <v-chip x-small class="mr-2" color="blue-grey lighten-4">
                  <v-icon left x-small>mdi-ruler</v-icon>
                  {{ formatPriceRange(priceCategory) }}
                </v-chip>

                <v-chip
                  v-if="
                    priceCategory.weekdays && priceCategory.weekdays.length > 0
                  "
                  x-small
                  class="mr-2"
                  color="primary"
                >
                  <v-icon left x-small>mdi-calendar-week</v-icon>
                  {{ priceCategory.weekdays.length }} Wochentag(e)
                </v-chip>

                <v-chip
                  v-if="
                    priceCategory.holidays && priceCategory.holidays.length > 0
                  "
                  x-small
                  class="mr-2"
                  color="red"
                >
                  <v-icon left x-small>mdi-calendar-star</v-icon>
                  {{ priceCategory.holidays.length }} Feiertag(e)
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action>
              <div class="d-flex align-center">
                <v-btn
                  icon
                  small
                  @click.stop="removePriceCategory(idx)"
                  color="error"
                  :disabled="priceCategories.length <= 1"
                >
                  <v-icon small>mdi-delete-outline</v-icon>
                </v-btn>
                <v-btn icon small>
                  <v-icon>
                    {{
                      isExpanded(idx) ? "mdi-chevron-up" : "mdi-chevron-down"
                    }}
                  </v-icon>
                </v-btn>
              </div>
            </v-list-item-action>
          </v-list-item>

          <v-expand-transition :key="`expand-${idx}`">
            <v-card
              v-show="isExpanded(idx)"
              flat
              class="mx-3 mb-3 pa-4 price-card"
              color="grey lighten-5"
            >
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    :label="amountLabel"
                    hide-details="auto"
                    data-test="price-category-amount"
                    :value="priceCategory.priceEur"
                    @input="updateCategory(idx, { priceEur: $event })"
                    prefix="€"
                    type="number"
                    step="0.01"
                    :rules="fieldRules.price"
                  />
                </v-col>

                <v-col cols="12" md="8">
                  <v-switch
                    :input-value="!!priceCategory.fixedPrice"
                    @change="updateCategory(idx, { fixedPrice: !!$event })"
                    dense
                    hide-details
                    color="primary"
                    data-test="price-category-fixed"
                  >
                    <template v-slot:label>
                      <div>
                        <div class="font-weight-medium">{{ fixedLabel }}</div>
                        <div class="text-caption text--secondary">
                          {{ fixedHint }}
                        </div>
                      </div>
                    </template>
                  </v-switch>
                </v-col>
              </v-row>

              <v-divider class="my-3" />

              <v-subheader class="pl-0">
                <v-icon small class="mr-2">mdi-ruler</v-icon>
                Gültigkeitsbereich
              </v-subheader>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    data-test="price-category-start"
                    :value="priceCategory.interval?.start"
                    @input="
                      updateCategory(idx, {
                        interval: {
                          ...priceCategory.interval,
                          start: $event,
                        },
                      })
                    "
                    background-color="accent"
                    filled
                    dense
                    label="Gültig ab"
                    type="number"
                    hide-details
                    :suffix="intervalSuffix"
                    clearable
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    data-test="price-category-end"
                    :value="priceCategory.interval?.end"
                    @input="
                      updateCategory(idx, {
                        interval: {
                          ...priceCategory.interval,
                          end: $event,
                        },
                      })
                    "
                    background-color="accent"
                    filled
                    dense
                    label="Gültig bis"
                    type="number"
                    hide-details
                    :suffix="intervalSuffix"
                    clearable
                  />
                </v-col>
              </v-row>

              <v-divider class="my-3" />

              <v-subheader class="pl-0">
                <v-icon small class="mr-2"> mdi-calendar-clock </v-icon>
                Zeitliche Einschränkungen
              </v-subheader>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    background-color="accent"
                    filled
                    dense
                    label="Wochentage"
                    hide-details
                    :value="priceCategory.weekdays"
                    @change="updateCategory(idx, { weekdays: $event })"
                    multiple
                    chips
                    small-chips
                    :items="weekdays"
                    item-text="name"
                    item-value="id"
                  >
                    <template v-slot:selection="{ item, index }">
                      <v-chip
                        v-if="index < 3"
                        small
                        color="primary"
                        class="mr-1"
                      >
                        {{ getWeekdayName(item.id) }}
                      </v-chip>
                      <span
                        v-if="index === 3 && priceCategory.weekdays.length > 3"
                        class="grey--text text-caption"
                      >
                        (+{{ priceCategory.weekdays.length - 3 }}
                        weitere)
                      </span>
                    </template>
                  </v-select>
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
                    :value="priceCategory.holidays"
                    @change="updateCategory(idx, { holidays: $event })"
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
                    <template v-slot:selection="{ item, index }">
                      <v-chip
                        v-if="index < 2"
                        small
                        color="red"
                        text-color="white"
                        class="mr-1"
                      >
                        {{ item.name }}
                      </v-chip>
                      <span
                        v-if="index === 2 && priceCategory.holidays.length > 2"
                        class="grey--text text-caption"
                      >
                        (+{{ priceCategory.holidays.length - 2 }}
                        weitere)
                      </span>
                    </template>
                  </v-combobox>
                </v-col>
              </v-row>
            </v-card>
          </v-expand-transition>

          <v-divider
            v-if="idx < priceCategories.length - 1"
            :key="`divider-${idx}`"
            class="my-2"
          />
        </template>
      </v-list>
    </div>

    <div v-else class="text-center py-8">
      <v-icon large color="grey lighten-1" class="mb-2">
        mdi-cash-remove
      </v-icon>
      <div class="text-h6 grey--text mb-2">
        Noch keine Preis-Kategorien definiert
      </div>
      <div class="text-body-2 grey--text text--darken-1 mb-4">
        Fügen Sie Kategorien hinzu, um unterschiedliche Preise zu definieren
      </div>
      <v-btn small text color="primary" @click="addPriceCategory">
        <v-icon left small>mdi-plus</v-icon>
        Erste Kategorie hinzufügen
      </v-btn>
    </div>
  </div>
</template>

<script>
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import bookableEditing from "@/mixins/bookableEditing";
import { isTierCategory } from "@/utils/bookableFlow";

const WEEKDAYS = [
  { id: 1, name: "Montag", short: "Mo" },
  { id: 2, name: "Dienstag", short: "Di" },
  { id: 3, name: "Mittwoch", short: "Mi" },
  { id: 4, name: "Donnerstag", short: "Do" },
  { id: 5, name: "Freitag", short: "Fr" },
  { id: 6, name: "Samstag", short: "Sa" },
  { id: 0, name: "Sonntag", short: "So" },
];

const STATES = [
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
];

/**
 * Tarife: the Staffel of price categories, each with its amount, its fixed
 * price, a range of the Preisart's unit, weekdays and holidays. The
 * backend checks them in order and takes the first that fits. Part of the
 * Preis component, shown while the price form is Tarife; it names the fixed
 * price as the Preis component does, by the Preisart.
 */
export default {
  name: "BookableEditPriceTiers",
  mixins: [bookableEditing],
  data() {
    return {
      // Which categories are open; the first while the bookable has tiers.
      expandedCategories: (this.bookable.priceCategories || []).some(
        isTierCategory
      )
        ? [0]
        : [],
      weekdays: WEEKDAYS,
      states: STATES,
      availableHolidays: [],
      selectedState: null,
    };
  },
  computed: {
    priceCategories() {
      return this.bookable.priceCategories || [];
    },
    hasPriceCategories() {
      return this.priceCategories.length > 0;
    },
    priceType() {
      return this.bookable.priceType || "per-item";
    },
    fixedLabel() {
      return this.$t(`bookable.flow.price.fixed.${this.priceType}.label`);
    },
    fixedHint() {
      return this.$t(`bookable.flow.price.fixed.${this.priceType}.hint`);
    },
    amountLabel() {
      return Number(this.bookable.priceValueAddedTax) > 0
        ? this.$t("bookable.flow.price.amount-net")
        : this.$t("bookable.flow.price.amount");
    },
    intervalSuffix() {
      const map = {
        "per-hour": "Std.",
        "per-day": "Tage",
        "per-square-meter": "m²",
      };
      return map[this.bookable.priceType] || "Stück";
    },
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
    updateCategory(index, changes) {
      this.patch({
        priceCategories: this.priceCategories.map((category, i) =>
          i === index ? { ...category, ...changes } : category
        ),
      });
    },
    addPriceCategory() {
      const last = this.priceCategories[this.priceCategories.length - 1];
      this.patch({
        priceCategories: [
          ...this.priceCategories,
          {
            priceEur: 0,
            interval: {
              start: last ? last.interval?.end ?? null : null,
              end: null,
            },
            fixedPrice: false,
            holidays: [],
            weekdays: [],
          },
        ],
      });
      this.expandedCategories.push(this.priceCategories.length);
    },
    removePriceCategory(index) {
      this.patch({
        priceCategories: this.priceCategories.filter((_, i) => i !== index),
      });
      this.expandedCategories = this.expandedCategories
        .filter((open) => open !== index)
        .map((open) => (open > index ? open - 1 : open));
    },
    async fetchHolidays() {
      const response = await ApiHolidaysService.getHolidays(
        "DE",
        this.selectedState
      );
      this.availableHolidays = (response?.data || [])
        .filter((h) => h.type === "public")
        .map((h) => ({
          name: h.name,
          countryCode: "DE",
          stateCode: this.selectedState,
        }));
    },
    toggleExpand(index) {
      const idx = this.expandedCategories.indexOf(index);
      if (idx > -1) {
        this.expandedCategories.splice(idx, 1);
      } else {
        this.expandedCategories.push(index);
      }
    },
    isExpanded(index) {
      return this.expandedCategories.includes(index);
    },
    getWeekdayName(id) {
      const day = this.weekdays.find((d) => d.id === id);
      return day ? day.short : "";
    },
    formatPriceRange(category) {
      const start = category.interval?.start ?? null;
      const end = category.interval?.end ?? null;

      if (start !== null && end !== null) {
        return `${start} - ${end} ${this.intervalSuffix}`;
      } else if (start !== null) {
        return `ab ${start} ${this.intervalSuffix}`;
      } else if (end !== null) {
        return `bis ${end} ${this.intervalSuffix}`;
      }
      return "Keine Begrenzung";
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2);
    },
  },
};
</script>

<style scoped>
.price-category-item {
  cursor: pointer;
  transition: all var(--scb-motion-base);
}

.theme--dark .price-category-item {
  background-color: var(--scb-surface-tint);
}

.price-card {
  border-radius: var(--scb-radius-surface) !important;
}
</style>
