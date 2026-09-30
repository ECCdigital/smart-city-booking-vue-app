<template>
  <!-- PROTOTYPE (#57) B „Ruhig“: no outlines; the row steps back behind the
       content. Views on a tinted track, only the active one names itself;
       sorting as one quiet text button with everything in its menu; every
       secondary action behind one „⋯“; the primary action as a pill, the
       shape of today's floating button, now in the row. -->
  <div class="row-b">
    <div class="row-b__start">
      <div v-if="views" class="row-b__track" role="group">
        <button
          v-for="v in views"
          :key="v.value"
          type="button"
          class="row-b__view"
          :class="{ 'row-b__view--active': v.value === view }"
          :title="v.label"
          @click="$emit('view', v.value)"
        >
          <v-icon small>{{ v.icon }}</v-icon>
          <span v-if="v.value === view">{{ v.label }}</span>
        </button>
      </div>
    </div>

    <div class="row-b__end">
      <v-menu v-if="sort" offset-y left nudge-bottom="4">
        <template #activator="{ on, attrs }">
          <button type="button" class="row-b__ghost" v-bind="attrs" v-on="on">
            <v-icon small>
              {{
                sort.dir === "asc"
                  ? "mdi-sort-ascending"
                  : "mdi-sort-descending"
              }}
            </v-icon>
            {{ sortLabel }}
          </button>
        </template>
        <v-list dense>
          <v-subheader>Sortieren nach</v-subheader>
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
          <v-divider />
          <v-subheader>Richtung</v-subheader>
          <v-list-item
            v-for="d in directions"
            :key="d.value"
            @click="$emit('sort-dir', d.value)"
          >
            <v-list-item-icon>
              <v-icon v-if="d.value === sort.dir" small color="primary">
                mdi-check
              </v-icon>
            </v-list-item-icon>
            <v-list-item-title>{{ d.text }}</v-list-item-title>
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

      <v-menu v-if="actions && actions.length" offset-y left nudge-bottom="4">
        <template #activator="{ on, attrs }">
          <button
            type="button"
            class="row-b__ghost row-b__more"
            :class="{ 'row-b__more--active': anyActive }"
            title="Weitere Aktionen"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>mdi-dots-horizontal</v-icon>
          </button>
        </template>
        <v-list dense>
          <template v-for="a in actions">
            <template v-if="a.menu">
              <v-list-item
                v-for="item in a.menu"
                :key="`${a.key}-${item.label}`"
                :disabled="a.disabled || item.disabled"
                @click="item.onClick"
              >
                <v-list-item-icon>
                  <v-icon small>{{ item.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>{{ item.label }}</v-list-item-title>
              </v-list-item>
            </template>
            <v-list-item
              v-else
              :key="a.key"
              :disabled="a.disabled"
              @click="run(a)"
            >
              <v-list-item-icon>
                <v-icon small :color="a.active ? 'primary' : undefined">
                  {{ a.icon }}
                </v-icon>
              </v-list-item-icon>
              <v-list-item-title>{{ a.label }}</v-list-item-title>
              <v-list-item-action v-if="a.active !== undefined">
                <v-icon small :color="a.active ? 'primary' : undefined">
                  {{
                    a.active
                      ? "mdi-checkbox-marked"
                      : "mdi-checkbox-blank-outline"
                  }}
                </v-icon>
              </v-list-item-action>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>

      <v-btn
        v-if="primary"
        depressed
        rounded
        color="primary"
        class="row-b__primary"
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
  name: "ToolbarRowB",
  props: {
    views: { type: Array, default: null },
    view: { type: String, default: null },
    sort: { type: Object, default: null },
    actions: { type: Array, default: () => [] },
    primary: { type: Object, default: null },
  },
  data() {
    return {
      directions: [
        { value: "asc", text: "Aufsteigend" },
        { value: "desc", text: "Absteigend" },
      ],
    };
  },
  computed: {
    sortLabel() {
      const opt = this.sort.options.find((o) => o.value === this.sort.by);
      return opt ? opt.text : "Sortierung";
    },
    anyActive() {
      return this.actions.some((a) => a.active);
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
.row-b {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
}

.row-b__start {
  display: flex;
  align-items: center;
  min-height: 36px;
}

.row-b__end {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-left: auto;
}

/* The track: a tinted groove, the active view a raised chip on it. */
.row-b__track {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--scb-radius-surface);
  background: var(--scb-surface-tint);
}

.row-b__view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  min-width: 34px;
  justify-content: center;
  padding: 0 var(--scb-space-2);
  border-radius: 6px;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text-muted);
  transition: background var(--scb-motion-fast), color var(--scb-motion-fast);
}

.row-b__view .v-icon {
  color: inherit;
}

.row-b__view:hover {
  color: var(--scb-text-hover);
}

.row-b__view--active {
  padding: 0 var(--scb-space-3) 0 var(--scb-space-2);
  background: var(--scb-surface);
  color: var(--v-primary-base);
  box-shadow: var(--scb-shadow-card);
}

.row-b__ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 var(--scb-space-2);
  border-radius: var(--scb-radius-control);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
  transition: background var(--scb-motion-fast), color var(--scb-motion-fast);
}

.row-b__ghost .v-icon {
  color: inherit;
}

.row-b__ghost:hover {
  background: var(--scb-hover-tint);
  color: var(--scb-text-hover);
}

.row-b__more {
  width: 36px;
  justify-content: center;
  padding: 0;
}

/* A toggle behind the „⋯“ is on: the dots say so. */
.row-b__more--active {
  color: var(--v-primary-base);
  background: var(--scb-selected-tint);
}

.row-b__primary {
  margin-left: var(--scb-space-2);
  text-transform: none;
  letter-spacing: normal;
  font-size: var(--scb-font-size-md);
}
</style>
