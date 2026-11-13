<script>
/**
 * PROTOTYPE (tickets#1095) — the Fächer of a Schließfachanlage by Schrank, to
 * tick, as in the dialog of tickets#1085. Shared by all variants: a dot per
 * booking at the Fach; what the dialog says about them is the question.
 */
import { bookingsAt, isRunning } from "./folgen";

export default {
  name: "FachGrid",
  props: {
    faecher: { type: Array, default: () => [] },
    value: { type: Array, default: () => [] },
    // fach → { tone: "warning"|"info"|"neutral", text } or null
    markFor: { type: Function, default: () => null },
    // fach → true while a variant holds the click (popover open)
    activeFor: { type: Function, default: () => false },
  },
  computed: {
    groups() {
      const groups = [];
      this.faecher.forEach((f) => {
        let g = groups.find((x) => x.schrank === f.schrank);
        if (!g) groups.push((g = { schrank: f.schrank, faecher: [] }));
        g.faecher.push(f);
      });
      return groups;
    },
  },
  methods: {
    on(f) {
      return this.value.includes(f.id);
    },
    dots(f) {
      return bookingsAt(f.id).map((b) => (isRunning(b) ? "run" : "future"));
    },
    click(f, e) {
      this.$emit("toggle", f, e);
    },
  },
};
</script>

<template>
  <div>
    <div v-for="g in groups" :key="g.schrank" class="bank">
      <div class="bank__head">Schrank {{ g.schrank }}</div>
      <div class="bank__grid">
        <div v-for="f in g.faecher" :key="f.id" class="cell">
          <slot name="cell" :fach="f">
            <button
              type="button"
              class="tile"
              :class="{
                'tile--on': on(f),
                'tile--out': f.outOfService,
                'tile--active': activeFor(f),
              }"
              @click="click(f, $event)"
            >
              <v-icon x-small class="tile__check">
                {{
                  on(f) ? "mdi-checkbox-marked" : "mdi-checkbox-blank-outline"
                }}
              </v-icon>
              <span class="tile__no">{{ g.schrank }}{{ f.number }}</span>
              <span class="tile__dots">
                <i
                  v-for="(d, i) in dots(f)"
                  :key="i"
                  class="dot"
                  :class="`dot--${d}`"
                />
              </span>
              <span v-if="f.outOfService" class="tile__out">außer Betrieb</span>
            </button>
          </slot>
          <div
            v-if="markFor(f)"
            class="tile-mark"
            :class="`tile-mark--${markFor(f).tone}`"
          >
            {{ markFor(f).text }}
          </div>
        </div>
      </div>
    </div>
    <div class="legend">
      <i class="dot dot--run" /> laufende Buchung
      <i class="dot dot--future ml-3" /> künftige Buchung
    </div>
  </div>
</template>

<style scoped>
.bank + .bank {
  margin-top: 12px;
}

.bank__head {
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text-muted);
  margin-bottom: 6px;
}

.bank__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}

.tile {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 8px;
  min-height: 56px;
  border: 1px dashed var(--scb-surface-border);
  border-radius: 6px;
  text-align: left;
  color: var(--scb-text-muted);
}

.tile--on {
  border-style: solid;
  border-color: var(--v-primary-base);
  background: var(--scb-selected-tint-faint);
  color: inherit;
}

.tile--out {
  opacity: 0.7;
}

.tile--active {
  box-shadow: 0 0 0 2px var(--v-warning-base);
}

.tile__check {
  position: absolute;
  top: 6px;
  right: 6px;
}

.tile__no {
  font-weight: var(--scb-font-weight-medium);
  font-size: var(--scb-font-size-sm);
}

.tile__dots {
  display: flex;
  gap: 3px;
  min-height: 8px;
}

.tile__out {
  font-size: 10px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--run {
  background: var(--v-success-base);
}

.dot--future {
  border: 2px solid var(--v-primary-base);
}

.tile-mark {
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.3;
}

.tile-mark--warning {
  color: var(--v-warning-darken2);
}

.tile-mark--info {
  color: var(--v-primary-base);
}

.tile-mark--neutral {
  color: var(--scb-text-muted);
}

.legend {
  margin-top: 10px;
  font-size: 11px;
  color: var(--scb-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
