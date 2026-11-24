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
        <!-- A confirmed booking says its payment in the same block. -->
        <v-alert v-if="isConfirmed" type="warning" text dense class="mb-4">
          <template v-if="isPaidWithPrice">
            {{
              $t("booking.delete.confirmed-hint.paid", { amount: paidAmount })
            }}
            {{ $t("booking.delete.paid-hint.refund-open") }}
          </template>
          <template v-else>
            {{ $t("booking.delete.confirmed-hint.message") }}
          </template>
        </v-alert>
        <v-alert v-if="isPaymentDue" type="warning" text dense class="mb-4">
          {{ $t("booking.delete.payment-due-hint.message") }}
        </v-alert>
        <v-alert
          v-if="isPaidWithPrice && !isConfirmed"
          type="warning"
          text
          dense
          class="mb-4"
        >
          {{ $t("booking.delete.paid-hint.message", { amount: paidAmount }) }}
          <template v-if="isRefundOpen">
            {{ $t("booking.delete.paid-hint.refund-open") }}
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
        Sind Sie sicher, dass Sie die Buchung
        <strong>{{ toDelete.id }}</strong> löschen wollen?
        <v-checkbox
          v-if="requiresConfirmation"
          v-model="acknowledged"
          class="mt-4"
          hide-details
          :label="$t('booking.delete.acknowledge.message')"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn
          class="ml-2"
          color="error"
          :loading="inProgress"
          :disabled="requiresConfirmation && !acknowledged"
          @click="onDelete"
        >
          <v-icon left small>mdi-delete</v-icon>
          Löschen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  BOOKING_STATUS,
  deletionRequiresConfirmation,
  isPaid,
} from "@/utils/bookingStatus";
import { REFUND_STATE, refundStateOf } from "@/utils/cancellationRefund";
import FormatService from "@/services/FormatService";

export default {
  name: "BookingDeleteConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toDelete: {
      type: Object,
      required: true,
    },
    inProgress: {
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
    toDelete() {
      this.acknowledged = false;
    },
  },
  computed: {
    /**
     * A confirmed or paid booking, or one the backend asked about, is
     * deleted only after the checkbox: then the request carries the
     * confirmation.
     */
    requiresConfirmation() {
      return (
        deletionRequiresConfirmation(this.toDelete) || this.confirmationRequired
      );
    },
    openDialog: {
      get() {
        return this.open;
      },
    },
    /** A confirmed booking that was neither cancelled nor withdrawn is pointed out. */
    isConfirmed() {
      return this.toDelete?.status === BOOKING_STATUS.CONFIRMED;
    },
    /** A booking awaiting payment was already confirmed to the booker - pointed out too. */
    isPaymentDue() {
      return this.toDelete?.status === BOOKING_STATUS.PAYMENT_DUE;
    },
    /**
     * A paid booking with a price - confirmed, or cancelled or withdrawn after
     * it was (the backend's `isPayed`, read off `cancelledFrom`).
     */
    isPaidWithPrice() {
      return isPaid(this.toDelete) && Number(this.toDelete?.priceEur) > 0;
    },
    paidAmount() {
      return FormatService.currency(Number(this.toDelete?.priceEur));
    },
    /** The refund of the cancellation is still to be paid out. */
    isRefundOpen() {
      return refundStateOf(this.toDelete) === REFUND_STATE.OPEN;
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    async onDelete() {
      this.$emit("delete-booking", this.toDelete.id, {
        confirmed: this.requiresConfirmation && this.acknowledged,
      });
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
