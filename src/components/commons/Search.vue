<template>
  <!-- PROTOTYPE (ECCdigital/tickets#54): the field renders through
       SearchBarPrototype; search, filter and sort logic unchanged. -->
  <SearchBarPrototype
    v-model="searchQuery"
    :placeholder="placeholder"
    :fields-hint="fieldsHint"
    :filter-count="selectedFilters.length"
    :result-count="searchResults.length"
    :total-count="items.length"
    @clear="clearAll"
  >
    <template v-if="showFilters" #filter>
      <v-list v-if="filterOptions.length" dense>
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
    </template>

    <template v-if="sortable || selectedFilters.length" #actions>
      <div class="d-flex align-center flex-wrap">
        <v-chip
          v-for="(f, idx) in selectedFilters"
          :key="`f-${idx}`"
          close
          @click:close="removeFilter(f)"
          color="primary"
          small
          class="mr-1"
        >
          {{ f }}
        </v-chip>
        <template v-if="sortable">
          <v-chip-group
            v-model="sortBy"
            :mandatory="false"
            active-class="secondary--text"
            class="sort-chips"
          >
            <v-chip
              v-for="opt in sortOptions"
              :key="opt.value"
              :value="opt.value"
              small
              outlined
              class="mr-1 mb-1"
            >
              {{ opt.text }}
            </v-chip>
          </v-chip-group>
          <v-btn-toggle
            v-model="sortDir"
            class="ml-2 sort-buttons"
            active-class="secondary--text"
            mandatory
            dense
          >
            <v-btn small value="asc">
              <v-icon small>mdi-arrow-up</v-icon>
            </v-btn>
            <v-btn small value="desc">
              <v-icon small>mdi-arrow-down</v-icon>
            </v-btn>
          </v-btn-toggle>
          <v-btn v-if="sortBy" small text class="ml-2" @click="sortBy = null">
            Zurücksetzen
          </v-btn>
        </template>
      </div>
    </template>
  </SearchBarPrototype>
</template>

<script>
import Fuse from "fuse.js";
import SearchBarPrototype from "./prototype/SearchBarPrototype.vue";

// PROTOTYPE (#54): the searched keys as the placeholder of variant B names them.
const KEY_LABELS = {
  id: "ID",
  title: "Titel",
  location: "Ort",
  description: "Beschreibung",
  "information.name": "Name",
  "eventOrganizer.name": "Veranstalter",
};

export default {
  name: "Search",
  components: { SearchBarPrototype },
  props: {
    items: { type: Array, required: true },
    keys: { type: Array, default: () => [] },
    placeholder: { type: String, default: "Suche…" },
    fuseOptions: { type: Object, default: () => ({}) },
    value: { type: Array, default: () => [] },
    filterKey: { type: String, default: "" },
    filterOptions: { type: Array, default: () => [] },
    showFilters: { type: Boolean, default: true },
    sortable: { type: Boolean, default: false },
    sortOptions: {
      type: Array,
      default: () => [
        { text: "Titel", value: "title" },
        { text: "Erstellt am", value: "timeCreated" },
        { text: "Aktualisiert am", value: "timeUpdated" },
      ],
    },
  },
  data() {
    return {
      searchQuery: "",
      selectedFilters: [],
      fuse: null,
      searchResults: [],
      sortBy: null,
      sortDir: "asc",
    };
  },
  computed: {
    fieldsHint() {
      const labels = this.keys.map((k) => KEY_LABELS[k] || k);
      if (labels.length < 2) return labels.join("");
      return `${labels.slice(0, -1).join(", ")} oder ${labels.at(-1)}`;
    },
  },
  watch: {
    items: { handler: "_initFuse", immediate: true },
    keys: { handler: "_initFuse", deep: true },
    searchQuery: "performSearch",
    selectedFilters: "performSearch",
    sortBy: "performSearch",
    sortDir: "performSearch",
  },
  methods: {
    clearAll() {
      this.searchQuery = "";
      this.selectedFilters = [];
      this.performSearch();
    },
    toggleFilter(opt) {
      const idx = this.selectedFilters.indexOf(opt);
      idx >= 0
        ? this.selectedFilters.splice(idx, 1)
        : this.selectedFilters.push(opt);
    },
    getNestedValue(obj, path) {
      return path.split(".").reduce((acc, key) => acc?.[key], obj);
    },
    _initFuse() {
      if (!this.items.length) {
        this.fuse = null;
        this.searchResults = [];
        this.$emit("input", this.searchResults);
        return;
      }
      const opts = {
        includeScore: true,
        threshold: 0.3,
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
        result = this.fuse.search(this.searchQuery).map((r) => r.item);
      }

      if (this.selectedFilters.length && this.filterKey) {
        result = result.filter((item) => {
          const field = this.getNestedValue(item, this.filterKey);
          if (Array.isArray(field)) {
            return this.selectedFilters.every((f) => field.includes(f));
          }
          return this.selectedFilters.includes(field);
        });
      }

      if (this.sortable && this.sortBy) {
        result.sort((a, b) => {
          const valA = this.getNestedValue(a, this.sortBy);
          const valB = this.getNestedValue(b, this.sortBy);

          if (typeof valA === "string" && typeof valB === "string") {
            return this.sortDir === "asc"
              ? valA.localeCompare(valB)
              : valB.localeCompare(valA);
          }
          if (typeof valA === "number" && typeof valB === "number") {
            return this.sortDir === "asc" ? valA - valB : valB - valA;
          }
          if (typeof valA === "boolean" && typeof valB === "boolean") {
            return this.sortDir === "asc"
              ? valA === valB
                ? 0
                : valA
                ? 1
                : -1
              : valA === valB
              ? 0
              : valA
              ? -1
              : 1;
          }
          const dateA =
            valA instanceof Date
              ? valA
              : typeof valA === "string" && !isNaN(Date.parse(valA))
              ? new Date(valA)
              : null;
          const dateB =
            valB instanceof Date
              ? valB
              : typeof valB === "string" && !isNaN(Date.parse(valB))
              ? new Date(valB)
              : null;
          if (dateA && dateB) {
            return this.sortDir === "asc" ? dateA - dateB : dateB - dateA;
          }
          const strA = valA !== undefined && valA !== null ? String(valA) : "";
          const strB = valB !== undefined && valB !== null ? String(valB) : "";
          return this.sortDir === "asc"
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
        });
      }

      this.searchResults = result;
      this.$emit("input", result);
    },
    removeFilter(filter) {
      const idx = this.selectedFilters.indexOf(filter);
      if (idx >= 0) this.selectedFilters.splice(idx, 1);
    },
  },
};
</script>

<style scoped>
.sort-buttons {
  border-radius: 8px;
}

.sort-chips {
  min-height: 32px;
}
</style>
