<template>
  <!-- The search band of a list (toolbar.scss), with the row for the view
       switch, sorting and actions beneath it. Attributes such as data-test
       go to the input. -->
  <div class="scb-search-bar">
    <v-text-field
      :value="typed"
      :placeholder="$t('search.placeholder', { fields })"
      outlined
      hide-details
      class="scb-search"
      v-bind="$attrs"
      @input="onInput"
    >
      <!-- The funnel in front, on a page with filters only: the number of
           active restrictions on it, tinted primary while one applies. -->
      <template v-if="hasFilters" #prepend-inner>
        <v-menu
          bottom
          right
          offset-y
          nudge-bottom="8"
          min-width="340"
          max-width="420"
          :close-on-content-click="false"
          content-class="scb-filter-menu"
        >
          <template #activator="{ on, attrs }">
            <v-badge
              :value="filterCount > 0"
              :content="filterCount"
              color="primary"
              overlap
              data-test="search-filter-badge"
            >
              <v-btn
                icon
                small
                class="scb-search__filter"
                :class="{ 'scb-search__filter--active': filterCount > 0 }"
                :aria-label="$t('filter.title')"
                v-bind="attrs"
                data-test="search-filter"
                v-on="on"
                @click.stop
              >
                <v-icon>mdi-filter-variant</v-icon>
              </v-btn>
            </v-badge>
          </template>
          <FilterCard
            :sections="filters"
            @change="(key, selection) => $emit('filter', key, selection)"
          />
        </v-menu>
      </template>

      <template #append>
        <v-btn
          v-if="typed"
          icon
          small
          class="scb-search__clear"
          :aria-label="$t('search.clear')"
          data-test="search-clear"
          @click="clear"
        >
          <v-icon small>mdi-close</v-icon>
        </v-btn>
        <v-icon class="scb-search__magnifier">mdi-magnify</v-icon>
      </template>
    </v-text-field>
    <div v-if="$slots.actions" class="scb-toolbar">
      <slot name="actions" />
    </div>
  </div>
</template>

<script>
import FilterCard from "@/components/commons/FilterCard.vue";
import { totalRestrictionCount } from "@/utils/filterSections";

/** How long the bar waits after the last keystroke before it searches. */
const DEBOUNCE_MS = 300;

export default {
  name: "SearchBar",
  components: { FilterCard },
  inheritAttrs: false,
  props: {
    /** The query the list searches for; v-model, handed on after a pause. */
    value: { type: String, default: "" },
    /** What the page searches, as the placeholder names it: "Titel oder ID". */
    fields: { type: String, required: true },
    /**
     * The filters behind the funnel, as sections of the filter card (see
     * `@/utils/filterSections`); none, no funnel. A change comes back as
     * `filter(key, selection)`.
     */
    filters: { type: Array, default: null },
  },
  data() {
    return {
      typed: this.value || "",
      timer: null,
    };
  },
  computed: {
    hasFilters() {
      return !!this.filters && this.filters.length > 0;
    },
    filterCount() {
      return this.hasFilters ? totalRestrictionCount(this.filters) : 0;
    },
  },
  watch: {
    // A query the page sets itself (a stored one, a reset) wins over a
    // pending keystroke.
    value(value) {
      if ((value || "") === this.typed) return;
      clearTimeout(this.timer);
      this.timer = null;
      this.typed = value || "";
    },
  },
  beforeDestroy() {
    clearTimeout(this.timer);
  },
  methods: {
    // An emptied field searches at once, like the cross.
    onInput(value) {
      if (!value) {
        this.clear();
        return;
      }
      this.typed = value;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.$emit("input", this.typed);
      }, DEBOUNCE_MS);
    },
    clear() {
      clearTimeout(this.timer);
      this.timer = null;
      this.typed = "";
      this.$emit("input", "");
    },
  },
};
</script>
