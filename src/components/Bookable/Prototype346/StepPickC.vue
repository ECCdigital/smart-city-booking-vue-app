<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     Variant C: one step asks what else the bookable needs, as tiles. Every
     chosen area becomes a step of its own in the progress, before the
     publication. Used areas are chosen from the start and cannot be
     unchosen while they hold something. -->
<template>
  <div>
    <div class="proto-c">
      <button
        v-for="area in areas"
        :key="area.key"
        type="button"
        class="proto-c__tile"
        :class="{ 'proto-c__tile--on': picked.includes(area.key) }"
        :disabled="area.used(bookable)"
        @click="$emit('toggle', area.key)"
      >
        <v-icon small class="proto-c__check">
          {{
            picked.includes(area.key)
              ? "mdi-checkbox-marked"
              : "mdi-checkbox-blank-outline"
          }}
        </v-icon>
        <span class="proto-c__title">{{ area.title }}</span>
        <span class="proto-c__hint">
          {{
            area.used(bookable)
              ? `Genutzt: ${area.summary(bookable)}`
              : area.hint
          }}
        </span>
      </button>
    </div>
    <p class="flow-field__hint mt-4">
      {{ picked.length }} zusätzliche(r) Schritt(e). Nichts gewählt: weiter zur
      Veröffentlichung.
    </p>
  </div>
</template>

<script>
import bookableExpertMode from "@/mixins/bookableExpertMode";
import { shownAreas } from "./areas346";

export default {
  name: "StepPickC",
  mixins: [bookableExpertMode],
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
    picked: { type: Array, required: true },
  },
  computed: {
    areas() {
      return shownAreas(this.bookable, this.expertMode);
    },
  },
};
</script>

<style scoped>
.proto-c {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--scb-space-3);
}

.proto-c__tile {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px var(--scb-space-2);
  padding: var(--scb-space-3);
  text-align: left;
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  cursor: pointer;
}

.proto-c__tile:disabled {
  cursor: default;
}

.proto-c__tile--on {
  border-color: var(--v-primary-base);
  background: var(--scb-selected-tint-faint);
}

.proto-c__check {
  grid-row: span 2;
  align-self: start;
}

.proto-c__tile--on .proto-c__check {
  color: var(--v-primary-base);
}

.proto-c__title {
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.proto-c__hint {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>
