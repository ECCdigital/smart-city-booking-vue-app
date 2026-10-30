<template>
  <!-- The search band (SearchBar) over a list of bookables or coupons: the
       tags and the page's field filters behind the funnel, sorting in the
       row beneath (ToolbarRow). Searching, filtering and sorting stay here;
       bar and row only draw them. -->
  <SearchBar
    v-model="searchQuery"
    :fields="fields"
    :filters="filterSections"
    @filter="changeFilter"
  >
    <template v-if="sortable || $slots.actions" #actions>
      <ToolbarRow
        :sort-options="sortable ? sortOptions : null"
        :sort-by.sync="sortBy"
        :sort-dir.sync="sortDir"
      >
        <!-- The page's further actions, right of the sorting. -->
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
      </ToolbarRow>
    </template>
  </SearchBar>
</template>

<script>
import Fuse from "fuse.js";
import { emptySelection, restrictionCount } from "@/utils/filterSections";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRow from "@/components/commons/ToolbarRow.vue";

export default {
  name: "Search",
  components: { SearchBar, ToolbarRow },
  props: {
    items: { type: Array, required: true },
    keys: { type: Array, default: () => [] },
    /** What `keys` search, as the placeholder names it: "Titel oder ID". */
    fields: { type: String, required: true },
    fuseOptions: { type: Object, default: () => ({}) },
    value: { type: Array, default: () => [] },
    filterKey: { type: String, default: "" },
    filterOptions: { type: Array, default: () => [] },
    showFilters: { type: Boolean, default: true },
    /**
     * Further filters behind the funnel, before the tags: sections of the
     * filter card without `selected` (see `@/utils/filterSections`), each
     * with `matches(item, selection)`. Set filters apply together.
     */
    fieldFilters: { type: Array, default: () => [] },
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
      fieldSelections: Object.fromEntries(
        this.fieldFilters.map((filter) => [filter.key, emptySelection(filter)])
      ),
      fuse: null,
      searchResults: [],
      sortBy: null,
      sortDir: "asc",
    };
  },
  computed: {
    /**
     * The tags and the field filters behind the funnel; no funnel with
     * `showFilters` off.
     */
    filterSections() {
      if (!this.showFilters) return null;
      return [
        ...this.fieldSectionsInUse,
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
    /** The field filters with their selections. */
    fieldSectionsInUse() {
      return this.fieldFilters.map((filter) => ({
        ...filter,
        selected: this.fieldSelections[filter.key],
      }));
    },
  },
  watch: {
    items: { handler: "_initFuse", immediate: true },
    keys: { handler: "_initFuse", deep: true },
    searchQuery: "performSearch",
    selectedFilters: "performSearch",
    fieldSelections: { handler: "performSearch", deep: true },
    sortBy: "performSearch",
    sortDir: "performSearch",
  },
  methods: {
    changeFilter(key, selection) {
      if (key === "tags") {
        this.selectedFilters = selection;
        return;
      }
      this.fieldSelections = { ...this.fieldSelections, [key]: selection };
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

      this.fieldSectionsInUse
        .filter((section) => restrictionCount(section) > 0)
        .forEach((section) => {
          result = result.filter((item) =>
            section.matches(item, section.selected)
          );
        });

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
