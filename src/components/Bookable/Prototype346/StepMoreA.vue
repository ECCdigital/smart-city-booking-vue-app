<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     Variant A: one optional step „Weitere Einstellungen“ before the
     publication. Every area is a row that opens to the editor's section,
     embedded. Used areas say what they hold and start open. -->
<template>
  <div>
    <v-expansion-panels v-model="open" multiple flat accordion class="proto-a">
      <v-expansion-panel
        v-for="area in areas"
        :key="area.key"
        class="proto-a__row"
      >
        <v-expansion-panel-header>
          <div class="proto-a__head">
            <div class="proto-a__title">
              {{ area.title }}
              <v-chip
                v-if="area.expertOnly"
                x-small
                label
                class="ml-2"
                color="grey lighten-3"
              >
                Experten
              </v-chip>
            </div>
            <div class="proto-a__hint">{{ area.hint }}</div>
          </div>
          <span
            class="proto-a__state"
            :class="{ 'proto-a__state--used': area.used(bookable) }"
          >
            {{ area.used(bookable) ? area.summary(bookable) : "Nicht genutzt" }}
          </span>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <SectionSlice
            :area="area"
            :bookable="bookable"
            @update:bookable="$emit('update:bookable', $event)"
          />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <p class="flow-field__hint mt-4">
      Ohne Expertenmodus fehlen ungenutzte Expertenbereiche (#339). Nichts hier
      ist Pflicht: „Weiter“ überspringt den Schritt.
    </p>
  </div>
</template>

<script>
import bookableExpertMode from "@/mixins/bookableExpertMode";
import SectionSlice from "./SectionSlice.vue";
import { shownAreas } from "./areas346";

export default {
  name: "StepMoreA",
  components: { SectionSlice },
  mixins: [bookableExpertMode],
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
  },
  data() {
    return { open: [] };
  },
  computed: {
    areas() {
      return shownAreas(this.bookable, this.expertMode);
    },
  },
  created() {
    this.open = this.areas
      .map((area, idx) => (area.used(this.bookable) ? idx : -1))
      .filter((idx) => idx >= 0);
  },
};
</script>

<style scoped>
.proto-a__row {
  border-bottom: 1px solid var(--scb-rule);
}

.proto-a__row::before {
  box-shadow: none !important;
}

.proto-a__head {
  flex: 1 1 auto;
  min-width: 0;
}

.proto-a__title {
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.proto-a__hint {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.proto-a__state {
  flex: 0 0 auto !important;
  margin: 0 var(--scb-space-3);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-caption);
}

.proto-a__state--used {
  color: var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
}
</style>
