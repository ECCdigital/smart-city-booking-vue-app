<template>
  <div style="position: relative; width: 100%">
    <v-text-field
      v-model="searchQuery"
      :label="placeholder"
      solo
      clearable
      class="search-field"
      append-icon="mdi-magnify"
      hide-details
      @click:clear="clearAll"
    >
      <template v-slot:prepend-inner>
        <v-menu bottom left v-if="showFilters">
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on">
              <v-icon>mdi-filter-variant</v-icon>
            </v-btn>
          </template>

          <v-list v-if="filterOptions.length" dense >
            <v-list-item
              dense
              v-for="(opt, i) in filterOptions"
              :key="i"
              @click="toggleFilter(opt)"
            >
              <v-list-item-action>
                <v-checkbox
                  :input-value="selectedFilters.includes(opt)"
                  @change.prevent
                />
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{ opt }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-list v-else dense>
            <v-list-item disabled>Keine Filter verfügbar</v-list-item>
          </v-list>
        </v-menu>
      </template>

      <template v-slot:append>
        <v-chip-group
          v-if="selectedFilters.length"
          column
          class="filter-field mr-2"
        >
          <v-chip
            v-for="(f, idx) in selectedFilters"
            :key="idx"
            close
            @click:close="removeFilter(f)"
            color="primary"
            small
            class="ma-1"
          >
            {{ f }}
          </v-chip>
        </v-chip-group>

        <v-icon>mdi-magnify</v-icon>
      </template>
    </v-text-field>
  </div>
</template>

<script>
import Fuse from "fuse.js";

export default {
  name: "Search",
  props: {
    items:       { type: Array,   required: true },
    keys:        { type: Array,   default: () => [] },
    placeholder: { type: String,  default: "Suche…" },
    fuseOptions: { type: Object,  default: () => ({}) },
    value:       { type: Array,   default: () => [] },
    filterKey:   { type: String,  default: "" },
    filterOptions:{ type: Array,  default: () => [] },
    showFilters: { type: Boolean, default: true },
  },
  data() {
    return {
      searchQuery:     "",
      selectedFilters: [],
      fuse:            null,
      searchResults:   [],
    };
  },
  watch: {
    items:           { handler: "_initFuse", immediate: true },
    keys:            { handler: "_initFuse", deep: true },
    searchQuery:     "performSearch",
    selectedFilters: "performSearch",
  },
  methods: {
    clearAll() {
      this.searchQuery     = "";
      this.selectedFilters = [];
      this.performSearch();
    },
    toggleFilter(opt) {
      const idx = this.selectedFilters.indexOf(opt);
      idx >= 0
        ? this.selectedFilters.splice(idx, 1)
        : this.selectedFilters.push(opt);
    },
    // Hilfsfunktion für Punktnotation
    getNestedValue(obj, path) {
      return path
        .split(".")
        .reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
    },
    _initFuse() {
      if (!this.items.length) {
        this.fuse = null;
        this.searchResults = [];
        return;
      }
      const opts = {
        includeScore: true,
        threshold:    0.3,
        ...this.fuseOptions,
      };
      if (this.keys.length) {
        opts.keys = this.keys;
      } else if (typeof this.items[0] === "object") {
        opts.keys = Object.keys(this.items[0]);
      }
      this.fuse = new Fuse(this.items, opts);
      this.performSearch();
    },
    performSearch() {
      let result;
      if (!this.fuse || !this.searchQuery) {
        result = [...this.items];
      } else {
        result = this.fuse.search(this.searchQuery).map(r => r.item);
      }

      if (this.selectedFilters.length && this.filterKey) {
        result = result.filter(item => {
          const field = this.getNestedValue(item, this.filterKey);
          if (Array.isArray(field)) {
            return this.selectedFilters.every(f => field.includes(f));
          }
          return this.selectedFilters.includes(field);
        });
      }

      this.searchResults = result;
      this.$emit("input", result);
    },
    removeFilter(filter) {
      const idx = this.selectedFilters.indexOf(filter);
      if (idx >= 0) {
        this.selectedFilters.splice(idx, 1);
      }
    },
  },
};
</script>

<style scoped>
.search-field {
  border-radius: 15px;
}

.filter-field {
  padding: 0 5px;
  border-radius: 15px;
  border: 1px solid #ccc;
}
</style>
