<template>
  <v-autocomplete
    v-model="selectedAddress"
    :items="displayItems"
    :loading="loading"
    :search-input.sync="searchQuery"
    item-text="display_address"
    item-value="display_address"
    :label="label"
    :placeholder="placeholder"
    return-object
    clearable
    no-filter
    background-color="accent"
    filled
    hide-no-data
    @change="onSelect"
    @click:clear="onClear"
  >
    <template #item="{ item }">
      <v-list-item-content>
        <!-- Manuelle Eingabe Option -->
        <template v-if="item.isManualEntry">
          <v-list-item-title class="font-italic">
            <v-icon small left>mdi-pencil</v-icon>
            "{{ item.display_address }}" übernehmen
          </v-list-item-title>
          <v-list-item-subtitle class="text--secondary">
            Adresse ohne Koordinaten speichern
          </v-list-item-subtitle>
        </template>

        <!-- Normale Suchergebnisse -->
        <template v-else>
          <v-list-item-title>{{ item.display_address }}</v-list-item-title>
        </template>
      </v-list-item-content>
    </template>
  </v-autocomplete>
</template>

<script>
export default {
  name: "AddressLookup",

  props: {
    value: {
      type: [Object, String],
      default: null,
    },
    label: {
      type: String,
      default: "Adresse",
    },
    placeholder: {
      type: String,
      default: "Adresse eingeben...",
    },
    allowManualEntry: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {
      searchQuery: "",
      suggestions: [],
      loading: false,
      selectedAddress: null,
      debounceTimer: null,
      isInitialized: false,
      originalDisplayAddress: "",
    };
  },

  computed: {
    /**
     * Prüft ob manuelle Option angezeigt werden soll
     */
    canShowManualOption() {
      return (
        this.allowManualEntry &&
        this.searchQuery &&
        this.searchQuery.length >= 3 &&
        !this.loading &&
        // Nicht anzeigen wenn Query exakt einem Ergebnis entspricht
        !this.suggestions.some(
          (s) => s.display_address === this.searchQuery
        )
      );
    },

    /**
     * Items für die Anzeige - fügt manuelle Option am Ende hinzu
     */
    displayItems() {
      if (!this.canShowManualOption) {
        return this.suggestions;
      }

      return [...this.suggestions, this.createManualEntry(this.searchQuery)];
    },
  },

  watch: {
    searchQuery(val) {
      if (!this.isInitialized) return;

      if (
        this.selectedAddress &&
        val === this.selectedAddress.display_address
      ) {
        return;
      }

      if (!val || val.length < 3) {
        if (!this.selectedAddress) {
          this.suggestions = [];
        }
        return;
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.searchAddress(val);
      }, 300);
    },

    value: {
      immediate: true,
      handler(val) {
        if (val) {
          const addressObj = this.parseIncomingValue(val);

          if (addressObj) {
            this.selectedAddress = addressObj;
            this.suggestions = [addressObj];
            this.originalDisplayAddress = addressObj.display_address;
          }
        }

        this.$nextTick(() => {
          this.isInitialized = true;
        });
      },
    },
  },

  methods: {
    /**
     * Erstellt einen manuellen Eintrag
     */
    createManualEntry(text) {
      return {
        display_address: text,
        coordinates: null,
        address: null,
        meta: {
          source: "manual",
          fetched_at: new Date().toISOString(),
        },
        isManualEntry: true,
      };
    },

    parseIncomingValue(val) {
      if (typeof val === "string") {
        return {
          display_address: val,
          isLegacy: true,
        };
      }

      if (typeof val !== "object") return null;

      if (val.coordinates?.points) {
        return {
          display_address: val.display_address,
          coordinates: val.coordinates,
          address: val.address,
          meta: val.meta,
          isLegacy: false,
        };
      }

      const displayAddr = val.display_address || val.display_name;
      if (displayAddr) {
        return {
          display_address: displayAddr,
          coordinates: this.buildGeoLocation(val.lat, val.lon || val.lng),
          address: val.address || null,
          isLegacy: true,
        };
      }

      return null;
    },

    buildGeoLocation(lat, lon) {
      if (!lat || !lon) return null;

      return {
        type: "Point",
        points: [parseFloat(lon), parseFloat(lat)],
      };
    },

    buildDisplayAddress(item) {
      if (!item.address) {
        return item.display_name;
      }

      const addr = item.address;
      const street = [addr.road, addr.house_number].filter(Boolean).join(" ");
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county;
      const plzCity = [addr.postcode, city].filter(Boolean).join(" ");
      const country = addr.country;

      return [street, plzCity, country].filter(Boolean).join(", ");
    },

    transformToDbFormat(item) {
      const addr = item.address || {};

      return {
        coordinates: this.buildGeoLocation(item.lat, item.lon),
        display_address: this.buildDisplayAddress(item),
        address: {
          street: addr.road || null,
          house_number: addr.house_number || null,
          postcode: addr.postcode || null,
          city: addr.city || addr.town || addr.village || null,
          suburb: addr.suburb || addr.neighbourhood || null,
          state: addr.state || null,
          country: addr.country || null,
          country_code: addr.country_code || null,
        },
        meta: {
          source: "nominatim",
          place_id: item.place_id,
          fetched_at: new Date().toISOString(),
        },
      };
    },

    async searchAddress(query) {
      this.loading = true;

      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "5",
          countrycodes: "de",
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              "Accept-Language": "de",
            },
          }
        );

        const data = await response.json();
        this.suggestions = data.map((item) => this.transformToDbFormat(item));
      } catch (error) {
        console.error("Adress-Lookup fehlgeschlagen:", error);
        this.suggestions = [];
      } finally {
        this.loading = false;
      }
    },

    onSelect(item) {
      if (!item) return;

      // Manuelle Eingabe
      if (item.isManualEntry) {
        const locationData = {
          coordinates: null,
          display_address: item.display_address,
          address: null,
          meta: {
            source: "manual",
            fetched_at: new Date().toISOString(),
          },
        };

        this.originalDisplayAddress = item.display_address;
        this.$emit("input", locationData);
        this.$emit("change", locationData);
        return;
      }

      // Normale Auswahl
      const locationData = item.isLegacy
        ? {
          coordinates: item.coordinates,
          display_address: item.display_address,
          address: item.address || null,
          meta: {
            source: "legacy",
            fetched_at: new Date().toISOString(),
          },
        }
        : {
          coordinates: item.coordinates,
          display_address: item.display_address,
          address: item.address,
          meta: item.meta,
        };

      this.originalDisplayAddress = item.display_address;
      this.$emit("input", locationData);
      this.$emit("change", locationData);
    },

    onClear() {
      this.selectedAddress = null;
      this.suggestions = [];
      this.originalDisplayAddress = "";
      this.$emit("input", null);
      this.$emit("change", null);
    },
  },

  beforeDestroy() {
    clearTimeout(this.debounceTimer);
  },
};
</script>
