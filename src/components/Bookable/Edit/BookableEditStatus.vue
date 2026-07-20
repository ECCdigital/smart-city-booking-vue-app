<script>
export default {
  name: "BookableEditStatus",
  props: {
    bookable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
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
    class="mb-4 px-4 py-2 d-flex flex-wrap align-center status-indicator"
    rounded
  >
    <v-switch
      v-model="model.isBookable"
      label="Buchbar"
      hide-details
      dense
      class="mt-0 mr-6"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon color="primary" v-if="model.isBookable">
          mdi-calendar-check
        </v-icon>
        <v-icon color="grey" v-else>mdi-calendar-remove</v-icon>
      </template>
    </v-switch>

    <v-switch
      v-model="model.isPublic"
      label="Öffentlich"
      hide-details
      dense
      class="mt-0 mr-6"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon color="primary" v-if="bookable.isPublic"> mdi-eye </v-icon>
        <v-icon color="grey" v-else>mdi-eye-off</v-icon>
      </template>
    </v-switch>

    <v-switch
      v-model="manualApproval"
      label="Manuelle Freigabe"
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
  </v-sheet>
</template>

<style scoped>

.status-indicator {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-indicator {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
