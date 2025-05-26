<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="info">mdi-information</v-icon>
        <span class="text-h5">Buchung freigeben</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Die Buchung
          <strong>{{ bookingId }}</strong> ist Teil einer Serienbuchung. Möchten
          Sie die gesamte Serie freigeben?
        </span>
      </v-card-text>
      <v-card-text v-if="error" class="text-center">
        <v-alert type="error" border="left" elevation="2">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-text class="d-flex justify-center">
        <v-col cols="auto">
          <v-btn
            large
            color="primary"
            :loading="inProgress"
            @click="commitGroupBooking"
            >Serie freigeben</v-btn
          >
        </v-col>
        <v-col cols="auto">
          <v-btn large color="primary" @click="commitSingleBooking" :loading="inProgress"
            >Nur diese Buchung freigeben</v-btn
          >
        </v-col>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "GroupBookingCommitDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    commitGroupBooking() {
      this.$emit("commit-group-booking");
    },
    commitSingleBooking() {
      this.$emit("commit-single-booking");
    },
    closeDialog() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped></style>
