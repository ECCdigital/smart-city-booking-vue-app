<script>
import BookableEditPublication from "@/components/Bookable/Edit/BookableEditPublication.vue";

/**
 * The status band of the editing page: the „Veröffentlichung“ - the same
 * component as the flow's last step - and, until it moves to the tab
 * „Berechtigungen“, the switch of the Bestätigung.
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
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    manualApproval: {
      get() {
        return !this.model.autoCommitBooking;
      },
      set(value) {
        this.model.autoCommitBooking = !value;
      },
    },
  },
};
</script>

<template>
  <v-sheet
    class="mb-4 px-4 py-3 d-flex flex-wrap align-center status-indicator"
    rounded
  >
    <BookableEditPublication
      class="status-publication"
      :bookable="bookable"
      :level="level"
      @update:bookable="$emit('update:bookable', $event)"
    />

    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap mt-2">
          <v-switch
            v-model="manualApproval"
            :label="$t('bookable.edit.status.manualApproval.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="manualApproval">
                mdi-account-check
              </v-icon>
              <v-icon color="grey" v-else>mdi-check-circle-outline</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.manualApproval.tooltip") }}</span>
    </v-tooltip>
  </v-sheet>
</template>

<style scoped>
.status-indicator {
  transition: transform var(--scb-motion-base),
    box-shadow var(--scb-motion-base);
  background-color: var(--scb-surface-raised) !important;
}

.status-switch-wrap {
  display: inline-flex;
}

/* The publication fills the band; what else the band holds wraps below. */
.status-publication {
  flex-basis: 100%;
}
</style>
