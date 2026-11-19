<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">Buchung löschen</span>
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        Die Buchung
        <strong>{{ bookingId }}</strong> ist Teil einer Serienbuchung. Möchten
        Sie die gesamte Serie löschen?
        <div class="d-flex justify-center flex-wrap mt-4">
          <v-tooltip :disabled="!groupDeleteDisabled" top>
            <template v-slot:activator="{ on }">
              <div v-on="on" class="ma-2">
                <v-btn
                  large
                  color="error"
                  :loading="inProgress"
                  :disabled="groupDeleteDisabled"
                  @click="onDeleteGroup"
                >
                  <v-icon left small>mdi-delete</v-icon>
                  Serie löschen
                </v-btn>
              </div>
            </template>
            <span>
              Bestätigte oder bezahlte Buchungen müssen storniert werden.
            </span>
          </v-tooltip>
          <v-tooltip :disabled="!singleDeleteDisabled" top>
            <template v-slot:activator="{ on }">
              <div v-on="on" class="ma-2">
                <v-btn
                  large
                  color="error"
                  :disabled="singleDeleteDisabled"
                  @click="onDeleteSingle"
                  :loading="inProgress"
                >
                  <v-icon left small>mdi-delete</v-icon>
                  Nur diese Buchung löschen
                </v-btn>
              </div>
            </template>
            <span>
              Bestätigte oder bezahlte Buchungen müssen storniert werden.
            </span>
          </v-tooltip>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
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
    singleDeleteDisabled: {
      type: Boolean,
      default: false,
    },
    groupDeleteDisabled: {
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
