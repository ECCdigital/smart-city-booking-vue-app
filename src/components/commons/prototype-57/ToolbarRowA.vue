<template>
  <!-- PROTOTYPE (#57) A „Einheitliche Leiste“: every control 38px high with
       the same hairline and radius, so the row reads as one strip of
       controls. Views as a segment switch with labels; sorting as a split
       button (field menu | direction); secondary actions as square icon
       buttons in one group; the primary action filled at the far right. -->
  <div class="row-a">
    <div class="row-a__start">
      <div v-if="views" class="row-a__views" role="group">
        <button
          v-for="v in views"
          :key="v.value"
          type="button"
          class="row-a__view"
          :class="{ 'row-a__view--active': v.value === view }"
          @click="$emit('view', v.value)"
        >
          <v-icon small>{{ v.icon }}</v-icon>
          {{ v.label }}
        </button>
      </div>
    </div>

    <div class="row-a__end">
      <div v-if="sort" class="row-a__group">
        <v-menu offset-y left nudge-bottom="4">
          <template #activator="{ on, attrs }">
            <button
              type="button"
              class="row-a__control"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon small>mdi-sort</v-icon>
              <span class="row-a__muted">Sortieren:</span>
              <span class="row-a__value">{{ sortLabel }}</span>
              <v-icon small>mdi-chevron-down</v-icon>
            </button>
          </template>
          <v-list dense>
            <v-list-item
              v-for="opt in sort.options"
              :key="opt.value"
              @click="$emit('sort-by', opt.value)"
            >
              <v-list-item-icon>
                <v-icon v-if="opt.value === sort.by" small color="primary">
                  mdi-check
                </v-icon>
              </v-list-item-icon>
              <v-list-item-title>{{ opt.text }}</v-list-item-title>
            </v-list-item>
            <template v-if="sort.by">
              <v-divider />
              <v-list-item @click="$emit('sort-by', null)">
                <v-list-item-icon>
                  <v-icon small>mdi-close</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Zurücksetzen</v-list-item-title>
              </v-list-item>
            </template>
          </v-list>
        </v-menu>
        <button
          type="button"
          class="row-a__control row-a__square"
          :title="sort.dir === 'asc' ? 'Aufsteigend' : 'Absteigend'"
          @click="$emit('sort-dir', sort.dir === 'asc' ? 'desc' : 'asc')"
        >
          <v-icon small>
            {{ sort.dir === "asc" ? "mdi-arrow-up" : "mdi-arrow-down" }}
          </v-icon>
        </button>
      </div>

      <div v-if="actions && actions.length" class="row-a__group">
        <template v-for="a in actions">
          <v-menu v-if="a.menu" :key="a.key" offset-y left nudge-bottom="4">
            <template #activator="{ on, attrs }">
              <button
                type="button"
                class="row-a__control row-a__square"
                :title="a.label"
                :disabled="a.disabled"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon small>{{ a.icon }}</v-icon>
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
            class="row-a__control row-a__square"
            :class="{ 'row-a__control--active': a.active }"
            :title="a.label"
            :disabled="a.disabled"
            @click="run(a)"
          >
            <v-icon small>{{ a.icon }}</v-icon>
          </button>
        </template>
      </div>

      <v-btn
        v-if="primary"
        depressed
        color="primary"
        class="row-a__primary"
        :to="primary.to"
        :disabled="primary.disabled"
        @click="primary.onClick && primary.onClick()"
      >
        <v-icon left small>{{ primary.icon || "mdi-plus" }}</v-icon>
        {{ primary.label }}
      </v-btn>
    </div>
  </div>
</template>

<script>
export default {
  name: "ToolbarRowA",
  props: {
    views: { type: Array, default: null },
    view: { type: String, default: null },
    sort: { type: Object, default: null },
    actions: { type: Array, default: () => [] },
    primary: { type: Object, default: null },
  },
  computed: {
    sortLabel() {
      const opt = this.sort.options.find((o) => o.value === this.sort.by);
      return opt ? opt.text : "Standard";
    },
  },
  methods: {
    run(action) {
      if (action.to) this.$router.push(action.to);
      else if (action.onClick) action.onClick();
    },
  },
};
</script>

<style scoped>
.row-a {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
}

.row-a__start {
  display: flex;
  align-items: center;
  min-height: 38px;
}

.row-a__end {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-3);
  margin-left: auto;
}

/* Segment switch and groups share the one outline. */
.row-a__views,
.row-a__group {
  display: inline-flex;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  background: var(--scb-surface);
  overflow: hidden;
}

.row-a__view,
.row-a__control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 var(--scb-space-3);
  font-size: var(--scb-font-size-md);
  color: var(--scb-text);
  transition: background var(--scb-motion-fast);
}

.row-a__view + .row-a__view,
.row-a__control + .row-a__control,
.row-a__group > * + * {
  border-left: 1px solid var(--scb-surface-border);
}

.row-a__view .v-icon,
.row-a__control .v-icon {
  color: var(--scb-text-muted);
}

.row-a__view:hover,
.row-a__control:hover:not(:disabled) {
  background: var(--scb-hover-tint);
}

.row-a__view--active,
.row-a__control--active {
  background: var(--scb-selected-tint) !important;
  color: var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
}

.row-a__view--active .v-icon,
.row-a__control--active .v-icon {
  color: var(--v-primary-base);
}

.row-a__control:disabled {
  opacity: 0.4;
}

.row-a__square {
  width: 38px;
  justify-content: center;
  padding: 0;
}

.row-a__muted {
  color: var(--scb-text-muted);
}

.row-a__value {
  font-weight: var(--scb-font-weight-medium);
}

.row-a__primary {
  height: 38px !important;
  border-radius: var(--scb-radius-control);
  text-transform: none;
  letter-spacing: normal;
  font-size: var(--scb-font-size-md);
}
</style>
