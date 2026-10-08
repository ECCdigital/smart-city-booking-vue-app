<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     Renders an editor tab component and hides every section but one, so a
     single editor section can stand embedded in the flow. Today's tab
     components know no slices; the real ones would take a prop. -->
<template>
  <div class="proto-slice" :class="{ 'proto-slice--bare': bare }">
    <component
      :is="area.comp"
      :bookable="bookable"
      :valid-root="true"
      @update:bookable="$emit('update:bookable', $event)"
    />
  </div>
</template>

<script>
import BookableEditAccessLocks from "@/components/Bookable/Edit/BookableEditAccessLocks.vue";
import BookableEditRelatedBookables from "@/components/Bookable/Edit/BookableEditRelatedBookables.vue";
import BookableEditPermissions from "@/components/Bookable/Edit/BookableEditPermissions.vue";
import BookableEditAdditional from "@/components/Bookable/Edit/BookableEditAdditional.vue";
import BookableEditAttachments from "@/components/Bookable/Edit/BookableEditAttachments.vue";
import BookableEditCustomFields from "@/components/Bookable/Edit/BookableEditCustomFields.vue";

export default {
  name: "SectionSlice",
  components: {
    BookableEditAccessLocks,
    BookableEditRelatedBookables,
    BookableEditPermissions,
    BookableEditAdditional,
    BookableEditAttachments,
    BookableEditCustomFields,
  },
  props: {
    area: { type: Object, required: true },
    bookable: { type: Object, required: true },
    /** Without the editor card's header and border: the frame titles it. */
    bare: { type: Boolean, default: true },
  },
  mounted() {
    this.slice();
    this.observer = new MutationObserver(() => this.slice());
    this.observer.observe(this.$el, { childList: true, subtree: true });
  },
  beforeDestroy() {
    this.observer?.disconnect();
  },
  methods: {
    slice() {
      if (!this.area.sectionId) return;
      this.$el.querySelectorAll('[id^="be-section-"]').forEach((el) => {
        const keep = el.id === this.area.sectionId;
        if (el.style.display !== (keep ? "" : "none")) {
          el.style.display = keep ? "" : "none";
        }
      });
    },
  },
};
</script>

<style scoped>
.proto-slice--bare ::v-deep .section-card {
  margin-bottom: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}

.proto-slice--bare ::v-deep .base-section,
.proto-slice--bare ::v-deep .section-card > .section-header {
  display: none;
}

.proto-slice--bare ::v-deep .section-card > .v-card__text {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>
