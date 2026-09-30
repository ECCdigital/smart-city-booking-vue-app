<template>
  <!-- PROTOTYPE (#57) C „Register“: the row stands on a hairline and heads
       the content beneath it. Views as tabs underlined in primary; sorting
       spelled out as a line of fields, the active one with its direction
       (click it again to turn it); secondary actions as text buttons with
       their label. The creation stays the floating button bottom right, as
       today; the page draws it. -->
  <div class="row-c">
    <div class="row-c__start">
      <div v-if="views" class="row-c__tabs" role="tablist">
        <button
          v-for="v in views"
          :key="v.value"
          type="button"
          role="tab"
          class="row-c__tab"
          :class="{ 'row-c__tab--active': v.value === view }"
          :aria-selected="v.value === view"
          @click="$emit('view', v.value)"
        >
          <v-icon small>{{ v.icon }}</v-icon>
          {{ v.label }}
        </button>
      </div>
    </div>

    <div class="row-c__end">
      <div v-if="sort" class="row-c__sort">
        <span class="row-c__caption">Sortieren</span>
        <button
          v-for="opt in sort.options"
          :key="opt.value"
          type="button"
          class="row-c__field"
          :class="{ 'row-c__field--active': opt.value === sort.by }"
          :title="
            opt.value === sort.by ? 'Richtung umkehren' : `Nach ${opt.text}`
          "
          @click="onField(opt.value)"
        >
          {{ opt.text }}
          <v-icon v-if="opt.value === sort.by" x-small>
            {{ sort.dir === "asc" ? "mdi-arrow-up" : "mdi-arrow-down" }}
          </v-icon>
        </button>
        <button
          v-if="sort.by"
          type="button"
          class="row-c__reset"
          title="Sortierung zurücksetzen"
          @click="$emit('sort-by', null)"
        >
          <v-icon x-small>mdi-close</v-icon>
        </button>
      </div>

      <div v-if="actions && actions.length" class="row-c__actions">
        <template v-for="a in actions">
          <v-menu v-if="a.menu" :key="a.key" offset-y left nudge-bottom="4">
            <template #activator="{ on, attrs }">
              <button
                type="button"
                class="row-c__action"
                :disabled="a.disabled"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon small>{{ a.icon }}</v-icon>
                {{ a.label }}
                <v-icon x-small>mdi-chevron-down</v-icon>
              </button>
            </template>
            <v-list dense>
              <v-list-item
                v-for="item in a.menu"
                :key="item.label"
                :disabled="item.disabled"
                @click="item.onClick"
              >
                <v-list-item-icon>
                  <v-icon small>{{ item.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>{{ item.label }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <button
            v-else
            :key="a.key"
            type="button"
            class="row-c__action"
            :class="{ 'row-c__action--active': a.active }"
            :disabled="a.disabled"
            @click="run(a)"
          >
            <v-icon small>{{ a.icon }}</v-icon>
            {{ a.label }}
          </button>
        </template>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: "ToolbarRowC",
  props: {
    views: { type: Array, default: null },
    view: { type: String, default: null },
    sort: { type: Object, default: null },
    actions: { type: Array, default: () => [] },
    primary: { type: Object, default: null },
  },
  methods: {
    onField(value) {
      if (value === this.sort.by) {
        this.$emit("sort-dir", this.sort.dir === "asc" ? "desc" : "asc");
      } else {
        this.$emit("sort-by", value);
      }
    },
    run(action) {
      if (action.to) this.$router.push(action.to);
      else if (action.onClick) action.onClick();
    },
  },
};
</script>

<style scoped>
.row-c {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 0 var(--scb-space-4);
  min-height: var(--scb-row-height);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.row-c__start {
  display: flex;
  align-items: stretch;
}

.row-c__tabs {
  display: flex;
  align-items: stretch;
}

.row-c__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--scb-space-3);
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text-muted);
  transition: color var(--scb-motion-fast), border-color var(--scb-motion-fast);
}

.row-c__tab .v-icon {
  color: inherit;
}

.row-c__tab:hover {
  color: var(--scb-text-hover);
}

.row-c__tab--active {
  color: var(--v-primary-base);
  border-bottom-color: var(--v-primary-base);
}

.row-c__end {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-5);
  margin-left: auto;
  padding: var(--scb-space-1) 0;
}

.row-c__sort {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
}

.row-c__caption {
  margin-right: var(--scb-space-1);
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
}

.row-c__field {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 var(--scb-space-2);
  border-radius: var(--scb-radius-control);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.row-c__field:hover {
  background: var(--scb-hover-tint);
  color: var(--scb-text-hover);
}

.row-c__field--active {
  color: var(--scb-text);
  font-weight: var(--scb-font-weight-semibold);
  background: var(--scb-surface-tint);
}

.row-c__field--active .v-icon {
  color: var(--v-primary-base);
}

.row-c__reset {
  width: 22px;
  height: 22px;
  border-radius: 50%;
}

.row-c__reset:hover {
  background: var(--scb-hover-tint);
}

.row-c__actions {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
}

.row-c__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 var(--scb-space-2);
  border-radius: var(--scb-radius-control);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text-muted);
}

.row-c__action .v-icon {
  color: inherit;
}

.row-c__action:hover:not(:disabled) {
  background: var(--scb-hover-tint);
  color: var(--scb-text-hover);
}

.row-c__action:disabled {
  opacity: 0.4;
}

.row-c__action--active {
  color: var(--v-primary-base);
  background: var(--scb-selected-tint);
}

.row-c__primary {
  height: 32px !important;
  border-radius: var(--scb-radius-control);
  text-transform: none;
  letter-spacing: normal;
  font-size: var(--scb-font-size-sm);
}
</style>
