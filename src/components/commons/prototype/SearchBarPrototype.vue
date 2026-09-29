<template>
  <!--
    PROTOTYPE (ECCdigital/tickets#54), throwaway. Round 2: variant B
    (Suchband) won round 1 (A Werkzeugleiste and C Titelzeile are in commit
    227b072). The filter opens the card of the booking list everywhere; the
    two variants differ only in the trigger:

      B   Filter hinten  the magnifier in front, "Filter · n" at the end
      B2  Filter vorne   the funnel with its badge in front, as on Buchungen,
                         the magnifier at the end

    Both behave the same: filter while typing after 300 ms, a cross as soon
    as there is text, the cross empties the field at once.
  -->
  <div class="proto-search-b">
    <v-text-field
      :value="raw"
      :placeholder="placeholderFields"
      :prepend-inner-icon="variant === 'B' ? 'mdi-magnify' : undefined"
      :append-icon="variant === 'B2' ? 'mdi-magnify' : undefined"
      outlined
      clearable
      hide-details
      class="proto-search-b__field"
      @input="onInput"
      @click:clear="onClear"
    >
      <!-- B2: the funnel in front, as on Buchungen -->
      <template v-if="hasFilter && variant === 'B2'" #prepend-inner>
        <v-menu v-bind="menuProps">
          <template #activator="{ on, attrs }">
            <v-badge
              :value="filterCount > 0"
              :content="filterCount"
              color="primary"
              overlap
            >
              <v-btn
                icon
                small
                class="proto-search-b__funnel"
                :class="{ 'proto-search-b__funnel--active': filterCount > 0 }"
                v-bind="attrs"
                v-on="on"
                @click.stop
              >
                <v-icon>mdi-filter-variant</v-icon>
              </v-btn>
            </v-badge>
          </template>
          <slot name="filter" />
        </v-menu>
      </template>

      <!-- B: "Filter · n" at the end -->
      <template v-if="hasFilter && variant === 'B'" #append>
        <v-divider vertical class="proto-search-b__divider" />
        <v-menu v-bind="menuProps" left>
          <template #activator="{ on, attrs }">
            <v-btn
              text
              small
              class="proto-search-b__filter"
              :color="filterCount ? 'primary' : undefined"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon left small>mdi-filter-variant</v-icon>
              Filter<template v-if="filterCount"> · {{ filterCount }}</template>
            </v-btn>
          </template>
          <slot name="filter" />
        </v-menu>
      </template>
    </v-text-field>
    <div v-if="$scopedSlots.actions" class="proto-search-b__below">
      <slot name="actions" />
    </div>

    <PrototypeSwitcher
      :variants="variants"
      :current="variant"
      :state="{
        raw,
        committed: value || '',
        count: resultCount,
        total: totalCount,
      }"
    />
  </div>
</template>

<script>
import PrototypeSwitcher from "./PrototypeSwitcher.vue";

const DEBOUNCE_MS = 300;

const VARIANTS = {
  B: "Suchband, Filter hinten",
  B2: "Suchband, Filter vorne wie Buchungen",
};

export default {
  name: "SearchBarPrototype",
  components: { PrototypeSwitcher },
  props: {
    // The committed (debounced) query; v-model.
    value: { type: String, default: "" },
    // Fallback when there is no fieldsHint: "<Objekt> suchen…"
    placeholder: { type: String, default: "Suchen…" },
    // "Suchen nach <fields> …", e.g. "Titel oder ID"
    fieldsHint: { type: String, default: "" },
    filterCount: { type: Number, default: 0 },
    resultCount: { type: Number, default: null },
    totalCount: { type: Number, default: null },
    menuWidth: { type: Number, default: 340 },
    menuContentClass: { type: String, default: "proto-filter-menu" },
  },
  data() {
    return {
      raw: this.value || "",
      timer: null,
      variants: VARIANTS,
    };
  },
  computed: {
    variant() {
      const v = this.$route.query.variant;
      return VARIANTS[v] ? v : "B";
    },
    hasFilter() {
      return !!this.$scopedSlots.filter;
    },
    placeholderFields() {
      return this.fieldsHint
        ? `Suchen nach ${this.fieldsHint} …`
        : this.placeholder;
    },
    menuProps() {
      return {
        bottom: true,
        offsetY: true,
        nudgeBottom: 8,
        minWidth: this.menuWidth,
        maxWidth: this.menuWidth,
        contentClass: this.menuContentClass,
        closeOnContentClick: false,
      };
    },
  },
  watch: {
    value(v) {
      if (!this.timer) this.raw = v || "";
    },
  },
  beforeDestroy() {
    clearTimeout(this.timer);
  },
  methods: {
    onInput(v) {
      this.raw = v || "";
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.$emit("input", this.raw);
      }, DEBOUNCE_MS);
    },
    onClear() {
      clearTimeout(this.timer);
      this.timer = null;
      this.raw = "";
      this.$emit("input", "");
      this.$emit("clear");
    },
  },
};
</script>

<style lang="scss">
// Not scoped: the Vuetify internals and the menu (detached to the app root)
// need no ::v-deep. Every class is prototype-prefixed.

.proto-search-b {
  margin-bottom: var(--scb-space-5);
}

.v-text-field.proto-search-b__field {
  > .v-input__control > .v-input__slot {
    min-height: 48px !important;
    border-radius: var(--scb-radius-surface);
    background: var(--scb-surface);
  }

  fieldset {
    border-color: var(--scb-surface-border);
  }

  &:not(.v-input--is-focused):hover fieldset {
    border-color: var(--scb-text-muted);
  }

  input {
    font-size: var(--scb-font-size-md);
  }

  .v-input__prepend-inner,
  .v-input__append-inner {
    margin-top: 0 !important;
    align-self: center;
  }

  .v-input__prepend-inner {
    margin-right: var(--scb-space-2);
  }

  .v-input__icon .v-icon {
    color: var(--scb-text-caption);
  }
}

// B2: the funnel tinted primary while a filter restricts, as on Buchungen.
.proto-search-b__funnel--active {
  color: var(--v-primary-base) !important;

  &::before {
    opacity: 0.12;
  }
}

.proto-search-b__divider {
  align-self: stretch;
  margin: var(--scb-space-2) var(--scb-space-2) var(--scb-space-2)
    var(--scb-space-1);
}

.proto-search-b__filter {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-size: var(--scb-font-size-md) !important;
}

.proto-search-b__below {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
  margin-top: var(--scb-space-3);
}

// The menu around the card, as .booking-filter-menu on Buchungen.
.proto-filter-menu {
  border-radius: 14px !important;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14) !important;

  .v-card {
    border-radius: 14px !important;
  }
}
</style>
