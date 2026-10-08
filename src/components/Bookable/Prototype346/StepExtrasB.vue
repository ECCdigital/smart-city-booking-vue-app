<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     Variant B: no new step. Each area sits in the step it belongs to by
     topic, below the step's own question, as a line that opens the editor's
     section in place. Used areas stand open. -->
<template>
  <div v-if="areas.length" class="proto-b">
    <div class="proto-b__label">Mehr zu „{{ stepTitle }}“ · optional</div>
    <div v-for="area in areas" :key="area.key" class="proto-b__area">
      <button
        type="button"
        class="proto-b__toggle"
        :aria-expanded="isOpen(area) ? 'true' : 'false'"
        @click="toggle(area)"
      >
        <v-icon small class="mr-2">
          {{ isOpen(area) ? "mdi-chevron-down" : "mdi-chevron-right" }}
        </v-icon>
        <span class="proto-b__title">{{ area.title }}</span>
        <span class="proto-b__hint">
          {{ area.used(bookable) ? area.summary(bookable) : area.hint }}
        </span>
      </button>
      <div v-if="isOpen(area)" class="proto-b__body">
        <SectionSlice
          :area="area"
          :bookable="bookable"
          @update:bookable="$emit('update:bookable', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import bookableExpertMode from "@/mixins/bookableExpertMode";
import SectionSlice from "./SectionSlice.vue";
import { shownAreas } from "./areas346";

export default {
  name: "StepExtrasB",
  components: { SectionSlice },
  mixins: [bookableExpertMode],
  props: {
    step: { type: String, required: true },
    stepTitle: { type: String, required: true },
    bookable: { type: Object, required: true },
  },
  data() {
    return { opened: {} };
  },
  computed: {
    areas() {
      return shownAreas(this.bookable, this.expertMode).filter(
        (area) => area.stepB === this.step
      );
    },
  },
  methods: {
    isOpen(area) {
      return area.key in this.opened
        ? this.opened[area.key]
        : area.used(this.bookable);
    },
    toggle(area) {
      this.$set(this.opened, area.key, !this.isOpen(area));
    },
  },
};
</script>

<style scoped>
.proto-b {
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-4);
  border-top: 1px dashed var(--scb-rule);
}

.proto-b__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--scb-text-caption);
}

.proto-b__toggle {
  display: flex;
  align-items: baseline;
  gap: var(--scb-space-2);
  width: 100%;
  padding: var(--scb-space-2) 0;
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
}

.proto-b__title {
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  white-space: nowrap;
}

.proto-b__hint {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.proto-b__body {
  margin: 0 0 var(--scb-space-3) 26px;
}
</style>
