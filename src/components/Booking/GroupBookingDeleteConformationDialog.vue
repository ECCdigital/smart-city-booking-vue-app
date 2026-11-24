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
      <v-card-text class="pa-6 delete-dialog-text">
        <!--
          One warning, the most urgent: paid members and their refund; else
          confirmed members; else members awaiting payment.
        -->
        <v-alert v-if="paidCount > 0" type="warning" text dense class="mb-4">
          {{ $tc("booking.delete.paid-hint.series", paidCount) }}
          {{ $t("booking.delete.paid-hint.series-refund-open") }}
        </v-alert>
        <v-alert
          v-else-if="containsConfirmed"
          type="warning"
          text
          dense
          class="mb-4"
        >
          {{ $t("booking.delete.confirmed-hint.series") }}
        </v-alert>
        <v-alert
          v-else-if="containsPaymentDue"
          type="warning"
          text
          dense
          class="mb-4"
        >
          {{ $t("booking.delete.payment-due-hint.series") }}
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
        <v-checkbox
          v-if="seriesRequiresConfirmation"
          v-model="acknowledged"
          class="mt-4"
          hide-details
          :label="$t('booking.delete.acknowledge.series')"
        />
        <div class="d-flex justify-center flex-wrap mt-4">
          <v-tooltip :disabled="!groupDeleteDisabled" top>
            <template v-slot:activator="{ on }">
              <div v-on="on" class="ma-2">
                <v-btn
                  large
                  color="error"
                  :loading="inProgress"
                  :disabled="
                    groupDeleteDisabled ||
                    (seriesRequiresConfirmation && !acknowledged)
                  "
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
    /** How many members are paid with a price - confirmed, cancelled or withdrawn. */
    paidCount: {
      type: Number,
      default: 0,
    },
    /** A member is confirmed or paid: the series goes only after the checkbox. */
    requiresConfirmation: {
      type: Boolean,
      default: false,
    },
    /** The backend asked for the confirmation (409 `confirmation_required`). */
    confirmationRequired: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return { acknowledged: false };
  },
  watch: {
    // A new dialog, or a new booking in it, asks again.
    open() {
      this.acknowledged = false;
    },
    bookingId() {
      this.acknowledged = false;
    },
  },
  computed: {
    /** Confirmed or paid members, or the backend asked about the series. */
    seriesRequiresConfirmation() {
      return this.requiresConfirmation || this.confirmationRequired;
    },
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
      this.$emit("delete-group-booking", this.bookingId, {
        confirmed: this.seriesRequiresConfirmation && this.acknowledged,
      });
    },
    onDeleteSingle() {
      this.$emit("delete-single-booking", this.bookingId);
    },
  },
};
</script>

<style scoped>
/*
 * The warnings and the checkbox read in the size of the question; Vuetify
 * sets 16px on `.v-input` itself, so the checkbox root inherits too.
 */
.delete-dialog-text .v-alert,
.delete-dialog-text ::v-deep .v-input--checkbox,
.delete-dialog-text ::v-deep .v-input--checkbox .v-label {
  font-size: inherit;
}
</style>
