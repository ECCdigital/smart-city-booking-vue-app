<template>
  <!--
    PROTOTYPE (ECCdigital/tickets#54), throwaway. Three variants of the one
    search bar of the admin UI, switchable via ?variant= on the real list
    pages (the six pages of Search.vue, Buchungen, Mitglieder):

      A Werkzeugleiste  compact field in a toolbar row under the title
      B Suchband        full-width band above the list, actions beneath
      C Titelzeile      small field in the title row, right-aligned

    All three behave the same: filter while typing after 300 ms, a cross as
    soon as there is text, the cross empties the field at once.
  -->
  <div class="proto-search">
    <!-- A: Werkzeugleiste --------------------------------------------- -->
    <div v-if="variant === 'A'" class="scb-toolbar proto-search-a">
      <v-text-field
        :value="raw"
        :placeholder="placeholder"
        append-icon="mdi-magnify"
        dense
        outlined
        clearable
        hide-details
        class="scb-search"
        @input="onInput"
        @click:clear="onClear"
      >
        <template v-if="hasFilter" #prepend-inner>
          <v-menu v-bind="menuProps">
            <template #activator="{ on, attrs }">
              <v-badge
                :value="filterCount > 0"
                :content="filterCount"
                color="primary"
                overlap
              >
                <v-btn icon small v-bind="attrs" v-on="on">
                  <v-icon>mdi-filter-variant</v-icon>
                </v-btn>
              </v-badge>
            </template>
            <slot name="filter" />
          </v-menu>
        </template>
      </v-text-field>
      <v-spacer />
      <slot name="actions" />
    </div>

    <!-- B: Suchband ---------------------------------------------------- -->
    <div v-else-if="variant === 'B'" class="proto-search-b">
      <v-text-field
        :value="raw"
        :placeholder="placeholderFields"
        prepend-inner-icon="mdi-magnify"
        outlined
        clearable
        hide-details
        class="proto-search-b__field"
        @input="onInput"
        @click:clear="onClear"
      >
        <template v-if="hasFilter" #append>
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
                Filter<template v-if="filterCount">
                  · {{ filterCount }}</template
                >
              </v-btn>
            </template>
            <slot name="filter" />
          </v-menu>
        </template>
      </v-text-field>
      <div v-if="$scopedSlots.actions" class="proto-search-b__below">
        <slot name="actions" />
      </div>
    </div>

    <!-- C: Titelzeile -------------------------------------------------- -->
    <template v-else>
      <!-- The anchor stays put; its one child moves into the page's title
           row (see mountInTitle) and is taken out again on leaving C. -->
      <div class="proto-search-c__anchor">
        <div ref="titleBar" class="proto-search-c">
          <v-menu v-if="hasFilter" v-bind="menuProps" left>
            <template #activator="{ on, attrs }">
              <v-badge
                :value="filterCount > 0"
                :content="filterCount"
                color="primary"
                overlap
              >
                <v-btn icon v-bind="attrs" v-on="on">
                  <v-icon>mdi-filter-variant</v-icon>
                </v-btn>
              </v-badge>
            </template>
            <slot name="filter" />
          </v-menu>
          <v-text-field
            :value="raw"
            placeholder="Suchen"
            prepend-inner-icon="mdi-magnify"
            solo
            flat
            dense
            clearable
            hide-details
            class="proto-search-c__field"
            @input="onInput"
            @click:clear="onClear"
          />
        </div>
      </div>
      <div v-if="$scopedSlots.actions" class="scb-toolbar proto-search-c__row">
        <v-spacer />
        <slot name="actions" />
      </div>
    </template>

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
  A: "Werkzeugleiste",
  B: "Suchband",
  C: "Titelzeile",
};

export default {
  name: "SearchBarPrototype",
  components: { PrototypeSwitcher },
  props: {
    // The committed (debounced) query; v-model.
    value: { type: String, default: "" },
    // A: "<Objekt> suchen…"
    placeholder: { type: String, default: "Suchen…" },
    // B: "Suchen nach <fields> …", e.g. "Titel oder ID"
    fieldsHint: { type: String, default: "" },
    filterCount: { type: Number, default: 0 },
    resultCount: { type: Number, default: null },
    totalCount: { type: Number, default: null },
    menuWidth: { type: Number, default: 300 },
    menuContentClass: { type: String, default: "" },
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
      return VARIANTS[v] ? v : "A";
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
    variant: {
      handler(v) {
        this.unmountFromTitle();
        if (v === "C") this.$nextTick(this.mountInTitle);
      },
    },
  },
  mounted() {
    if (this.variant === "C") this.mountInTitle();
  },
  beforeDestroy() {
    clearTimeout(this.timer);
    this.unmountFromTitle();
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
    // Variant C: wrap the page's <h1> and the bar in one flex row.
    mountInTitle() {
      const page = this.$el.closest(".admin-page");
      const h1 = page && page.querySelector("h1");
      const bar = this.$refs.titleBar;
      if (!h1 || !bar || this._titleRow) return;
      const row = document.createElement("div");
      row.className = "proto-title-row";
      h1.parentNode.insertBefore(row, h1);
      row.appendChild(h1);
      row.appendChild(bar);
      this._titleRow = { row, h1 };
    },
    unmountFromTitle() {
      if (!this._titleRow) return;
      const { row, h1 } = this._titleRow;
      row.parentNode.insertBefore(h1, row);
      row.remove();
      this._titleRow = null;
    },
  },
};
</script>

<style lang="scss">
// Not scoped: variant C lives outside this component's element, and the
// Vuetify internals need no ::v-deep. Every class is prototype-prefixed.

// --- B: Suchband -------------------------------------------------------------

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

// --- C: Titelzeile -----------------------------------------------------------

.proto-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
  margin-bottom: var(--scb-space-4);

  > h1 {
    flex: 1 1 auto;
    margin-bottom: 0 !important;
  }
}

.proto-search-c {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
  flex: 0 1 300px;
}

.v-text-field.proto-search-c__field {
  > .v-input__control > .v-input__slot {
    border-radius: var(--scb-radius-pill) !important;
    background: var(--scb-surface-tint) !important;
    transition: background var(--scb-motion-fast);
  }

  &:hover > .v-input__control > .v-input__slot {
    background: var(--scb-hover-tint-strong) !important;
  }

  &.v-input--is-focused > .v-input__control > .v-input__slot {
    background: var(--scb-surface) !important;
    box-shadow: 0 0 0 1px var(--v-primary-base) !important;
  }

  .v-input__icon .v-icon {
    color: var(--scb-text-caption);
  }
}

// $scb-bp-xs: the title row stacks, the field takes the width.
@media (max-width: 599px) {
  .proto-search-c {
    flex-basis: 100%;
  }
}
</style>
