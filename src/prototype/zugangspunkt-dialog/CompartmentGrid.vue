<script>
/**
 * PROTOTYPE (tickets#1085) — the Fächer of Open Locker, by Schließfachschrank,
 * to tick. Shared by all variants: only the frame around it differs.
 */
import { compartmentBanks } from "./listing";

export default {
  name: "CompartmentGrid",
  props: {
    value: { type: Array, default: () => [] },
    // false: one Fach (a festes Fach), true: several (a Schließfachanlage)
    multiple: { type: Boolean, default: true },
    // Fächer this Zugangspunkt already has count as free for it.
    own: { type: Array, default: () => [] },
  },
  computed: {
    banks() {
      return compartmentBanks().map((b) => ({
        ...b,
        compartments: b.compartments.map((c) => ({
          ...c,
          taken: c.taken && !this.own.includes(c.id),
        })),
      }));
    },
  },
  methods: {
    toggle(c) {
      if (c.taken || c.outOfService) return;
      if (!this.multiple) {
        this.$emit("input", [c.id]);
        return;
      }
      const set = new Set(this.value);
      set.has(c.id) ? set.delete(c.id) : set.add(c.id);
      this.$emit("input", [...set]);
    },
    pickBank(b) {
      const free = b.compartments
        .filter((c) => !c.taken && !c.outOfService)
        .map((c) => c.id);
      this.$emit("input", [...new Set([...this.value, ...free])]);
    },
  },
};
</script>

<template>
  <div>
    <div v-for="b in banks" :key="b.bank" class="bank">
      <div class="bank__head">
        <span class="font-weight-medium">Schrank {{ b.bank }}</span>
        <span class="text-caption text--secondary ml-2">{{ b.place }}</span>
        <v-spacer />
        <v-btn
          v-if="multiple"
          x-small
          text
          color="primary"
          @click="pickBank(b)"
        >
          Alle freien
        </v-btn>
      </div>
      <div class="bank__grid">
        <button
          v-for="c in b.compartments"
          :key="c.id"
          type="button"
          class="cell"
          :class="{
            'cell--on': value.includes(c.id),
            'cell--off': c.taken || c.outOfService,
          }"
          :title="
            c.taken
              ? 'Schon in einem anderen Zugangspunkt'
              : c.outOfService
              ? 'Außer Betrieb'
              : ''
          "
          @click="toggle(c)"
        >
          <div class="cell__num">{{ c.id }}</div>
          <div class="cell__state">
            {{ c.taken ? "vergeben" : c.outOfService ? "defekt" : "" }}
          </div>
        </button>
      </div>
    </div>
    <div class="text-caption text--secondary">
      {{ multiple ? `${value.length} Fächer gewählt` : "Ein Fach wählen" }}
    </div>
  </div>
</template>

<style scoped>
.bank {
  margin-bottom: 10px;
}
.bank__head {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.bank__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
}
.cell {
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 6px;
  padding: 6px 4px;
  text-align: center;
  background: #fff;
  cursor: pointer;
}
.cell--on {
  border-color: var(--v-primary-base);
  background: var(--v-primary-base);
  color: #fff;
}
.cell--off {
  background: #f2f2f2;
  color: #9e9e9e;
  cursor: not-allowed;
}
.cell__num {
  font-weight: 600;
  font-size: 13px;
}
.cell__state {
  font-size: 10px;
  min-height: 12px;
}
</style>
