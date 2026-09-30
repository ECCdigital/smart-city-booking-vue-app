<template>
  <!-- The search band (SearchBar) over a list of bookables or coupons: the
       tags behind the funnel, sorting in the row beneath. Searching, the tag
       filter and sorting stay here; the bar only draws them. -->
  <SearchBar
    v-model="searchQuery"
    :fields="fields"
    :filters="filterSections"
    @filter="(key, tags) => (selectedFilters = tags)"
  >
    <!-- PROTOTYPE (#57): the row in variant A, B or C; none when it would
         be empty (C on a list without sorting). -->
    <template v-if="rowVariant && (sortable || primaryInRow)" #actions>
      <ToolbarRowPrototype
        :variant="rowVariant"
        :sort="
          sortable ? { options: sortOptions, by: sortBy, dir: sortDir } : null
        "
        :primary="primary"
        @sort-by="sortBy = $event"
        @sort-dir="sortDir = $event"
      />
    </template>
    <template v-else-if="sortable" #actions>
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
        class="sort-buttons"
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
      <v-btn v-if="sortBy" small text @click="sortBy = null">
        Zurücksetzen
      </v-btn>
    </template>
  </SearchBar>
</template>

<script>
import Fuse from "fuse.js";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRowPrototype from "@/components/commons/prototype-57/ToolbarRowPrototype.vue";
import { rowVariantMixin } from "@/components/commons/prototype-57/variant";

export default {
  name: "Search",
  mixins: [rowVariantMixin],
  components: { SearchBar, ToolbarRowPrototype },
  props: {
    /** PROTOTYPE (#57): the page's primary action for the row. */
    primary: { type: Object, default: null },
    items: { type: Array, required: true },
    keys: { type: Array, default: () => [] },
    /** What `keys` search, as the placeholder names it: "Titel oder ID". */
    fields: { type: String, required: true },
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
    /** The tags behind the funnel; no funnel with `showFilters` off. */
    filterSections() {
      if (!this.showFilters) return null;
      return [
        {
          key: "tags",
          label: this.$t("filter.tags"),
          selected: this.selectedFilters,
          options: this.filterOptions.map((tag) => ({
            value: tag,
            label: tag,
            icon: "mdi-tag-outline",
          })),
        },
      ];
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
