<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="error">mdi-alert</v-icon>
        <span class="text-h5">Buchung löschen</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Die Buchung
          <strong>{{ bookingId }}</strong> ist Teil einer Serienbuchung. Möchten
          Sie die gesamte Serie löschen?
        </span>
      </v-card-text>
      <v-card-text class="d-flex justify-center">
        <v-col cols="auto">
          <v-btn
            large
            color="primary"
            :loading="inProgress"
            @click="onDeleteGroup"
            >Serie löschen</v-btn
          >
        </v-col>
        <v-col cols="auto">
          <v-btn
            large
            color="primary"
            @click="onDeleteSingle"
            :loading="inProgress"
            >Nur diese Buchung löschen</v-btn
          >
        </v-col>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-col class="shrink">
          <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "GroupBookingDeleteConformationDialog",
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
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    onDeleteGroup() {
      this.$emit("delete-group-booking", this.bookingId);
    },
    onDeleteSingle() {
      this.$emit("delete-single-booking", this.bookingId);
    },
  },
};
</script>

<style scoped></style>
