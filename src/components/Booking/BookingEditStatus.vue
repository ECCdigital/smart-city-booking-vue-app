<template>
  <v-sheet
    class="mb-4 px-4 py-2 d-flex flex-wrap align-center status-indicator"
    rounded
  >
    <v-switch
      v-model="booking.isCommitted"
      label="Freigegeben"
      hide-details
      dense
      class="status-switch mt-0 mr-6"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon :color="booking.isCommitted ? 'primary' : 'grey'">
          {{ booking.isCommitted ? "mdi-check-circle" : "mdi-circle-outline" }}
        </v-icon>
      </template>
    </v-switch>

    <v-switch
      v-model="booking.isPayed"
      label="Bezahlt"
      hide-details
      dense
      class="status-switch mt-0 mr-6"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon :color="booking.isPayed ? 'primary' : 'grey'">
          {{ booking.isPayed ? "mdi-cash-check" : "mdi-cash" }}
        </v-icon>
      </template>
    </v-switch>

    <v-switch
      v-model="booking.isRejected"
      label="Storniert"
      hide-details
      dense
      class="status-switch mt-0"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon :color="booking.isRejected ? 'error' : 'grey'">
          {{
            booking.isRejected ? "mdi-cancel" : "mdi-close-circle-outline"
          }}
        </v-icon>
      </template>
    </v-switch>
  </v-sheet>
</template>

<script>
export default {
  name: "BookingEditStatus",
  props: {
    booking: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style scoped>
.status-indicator {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-indicator {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.status-switch >>> .v-input--selection-controls__input {
  margin-right: 4px;
}
</style>
