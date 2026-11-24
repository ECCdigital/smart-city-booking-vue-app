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
        <v-alert
          v-if="containsConfirmed"
          type="warning"
          text
          dense
          class="mb-4"
        >
          {{ $t("booking.delete.confirmed-hint.series") }}
        </v-alert>
        <v-alert
          v-if="containsPaymentDue"
          type="warning"
          text
          dense
          class="mb-4"
        >
          {{ $t("booking.delete.payment-due-hint.series") }}
        </v-alert>
        <v-alert v-if="containsPaid" type="warning" text dense class="mb-4">
          {{ $t("booking.delete.paid-hint.series") }}
          <template v-if="containsOpenRefund">
            {{ $t("booking.delete.paid-hint.series-refund-open") }}
          </template>
        </v-alert>
        <v-alert
          v-if="confirmationRequired"
          type="warning"
          text
          dense
          class="mb-4"
        >
          {{ $t("booking.delete.confirmation-required.message") }}
        </v-alert>
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
            <span>{{ $t("booking.delete.not-allowed.series") }}</span>
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
            <span>{{ $t("booking.delete.not-allowed.message") }}</span>
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
    /** Whether the series holds a confirmed booking - pointed out in the dialog. */
    containsConfirmed: {
      type: Boolean,
      default: false,
    },
    /** Whether the series holds a booking awaiting payment - pointed out in the dialog. */
    containsPaymentDue: {
      type: Boolean,
      default: false,
    },
    /** Whether the series holds a paid booking that is no longer confirmed. */
    containsPaid: {
      type: Boolean,
      default: false,
    },
    /** Whether a refund of the series is still to be paid out. */
    containsOpenRefund: {
      type: Boolean,
      default: false,
    },
    /** The backend asked for the confirmation (409 `confirmation_required`). */
    confirmationRequired: {
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
