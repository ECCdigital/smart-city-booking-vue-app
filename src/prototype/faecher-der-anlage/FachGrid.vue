<script>
/**
 * PROTOTYPE (ECCdigital/tickets#1159) — the Fächer of Open Locker as tiles,
 * by Schließfachschrank. Throwaway, never merged.
 *
 * A click on a tile takes the Fach into the Anlage or out again; the small
 * button on a chosen tile sets it außer Betrieb. Fächer of another Anlage
 * are greyed out. `v-model` is the chosen list, as the backend stores it.
 * With `want`, the tiles say which of the wanted ones a Fach is.
 */
import { LISTING, TAKEN } from "./data";

export default {
  name: "FachGrid",
  props: {
    value: { type: Array, default: () => [] },
    // How many Fächer are wanted; 0 for no target.
    want: { type: Number, default: 0 },
  },
  computed: {
    groups() {
      const map = new Map();
      LISTING.forEach((c) => {
        if (!map.has(c.lockerBank.id)) {
          map.set(c.lockerBank.id, { bank: c.lockerBank, items: [] });
        }
        map.get(c.lockerBank.id).items.push(c);
      });
      return [...map.values()];
    },
    chosen() {
      const map = {};
      this.value.forEach((c) => (map[c.id] = c));
      return map;
    },
  },
  methods: {
    takenBy(c) {
      return TAKEN[c.id] || "";
    },
    toggle(c) {
      if (this.takenBy(c)) return;
      if (this.chosen[c.id]) {
        this.$emit(
          "input",
          this.value.filter((v) => v.id !== c.id)
        );
      } else {
        this.$emit("input", [...this.value, { ...c, outOfService: false }]);
      }
    },
    toggleService(c) {
      this.$emit(
        "input",
        this.value.map((v) =>
          v.id === c.id ? { ...v, outOfService: !v.outOfService } : v
        )
      );
    },
    state(c) {
      if (this.takenBy(c)) return "taken";
      const chosen = this.chosen[c.id];
      if (!chosen) return "free";
      return chosen.outOfService ? "off" : "on";
    },
  },
};
</script>

<template>
  <div class="fach-grid">
    <div v-for="g in groups" :key="g.bank.id" class="mb-3">
      <div class="text-caption font-weight-medium mb-1">
        Schrank {{ g.bank.name }}
      </div>
      <div class="tiles">
        <div
          v-for="c in g.items"
          :key="c.id"
          class="tile"
          :class="`tile--${state(c)}`"
          :title="
            takenBy(c)
              ? `Steht schon in der Schließfachanlage „${takenBy(c)}“`
              : chosen[c.id]
              ? 'Klicken: aus der Anlage nehmen'
              : 'Klicken: in die Anlage nehmen'
          "
          @click="toggle(c)"
        >
          <span class="tile__no">{{ c.number }}</span>
          <v-icon v-if="state(c) === 'taken'" x-small class="tile__icon"
            >mdi-lock</v-icon
          >
          <button
            v-if="chosen[c.id]"
            class="tile__service"
            :title="
              chosen[c.id].outOfService
                ? 'Wieder in Betrieb nehmen'
                : 'Außer Betrieb setzen'
            "
            @click.stop="toggleService(c)"
          >
            <v-icon x-small :color="chosen[c.id].outOfService ? 'white' : ''">
              mdi-wrench
            </v-icon>
          </button>
        </div>
      </div>
    </div>
    <div class="legend text-caption text--secondary">
      <span class="tile tile--on tile--mini" /> in der Anlage
      <span class="tile tile--off tile--mini ml-3" /> außer Betrieb (<v-icon
        x-small
        >mdi-wrench</v-icon
      >) <span class="tile tile--taken tile--mini ml-3" /> in einer anderen
      Anlage
    </div>
  </div>
</template>

<style scoped>
.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tile {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid #b0b4ba;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
}

.tile--mini {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  vertical-align: middle;
  cursor: default;
  margin-right: 4px;
}

.tile--on {
  background: var(--v-primary-base);
  border-color: var(--v-primary-base);
  color: #fff;
  font-weight: 600;
}

.tile--off {
  background: repeating-linear-gradient(
    45deg,
    #c77700,
    #c77700 4px,
    #e09a2a 4px,
    #e09a2a 8px
  );
  border-color: #c77700;
  color: #fff;
  font-weight: 600;
}

.tile--taken {
  background: #eceff1;
  border-style: dashed;
  color: #9aa0a6;
  cursor: not-allowed;
}

.tile__icon {
  position: absolute;
  top: 2px;
  right: 2px;
}

.tile__service {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
}

.tile__service .v-icon {
  color: #fff;
}
</style>
