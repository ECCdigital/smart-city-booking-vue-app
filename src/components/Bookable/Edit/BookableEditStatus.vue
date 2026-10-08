<script>
import BookableEditPublication from "@/components/Bookable/Edit/BookableEditPublication.vue";

/**
 * The status band of the editing page: the „Veröffentlichung“ - the same
 * component as the flow's last step.
 */
export default {
  name: "BookableEditStatus",
  components: { BookableEditPublication },
  props: {
    bookable: {
      type: Object,
      required: true,
    },
    /** The tenant's Aufsichtsstufe, as `BookableEdit` reads it. */
    level: { type: String, default: null },
  },
};
</script>

<template>
  <v-sheet class="mb-4 px-4 py-3 status-indicator" rounded>
    <BookableEditPublication
      :bookable="bookable"
      :level="level"
      @update:bookable="$emit('update:bookable', $event)"
    />
  </v-sheet>
</template>

<style scoped>
.status-indicator {
  transition: transform var(--scb-motion-base),
    box-shadow var(--scb-motion-base);
  background-color: var(--scb-surface-raised) !important;
}
</style>
