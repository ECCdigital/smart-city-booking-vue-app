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
        <v-alert v-if="isConfirmed" type="warning" text dense class="mb-4">
          {{ $t("booking.delete.confirmed-hint.message") }}
        </v-alert>
        <v-alert v-if="isPaymentDue" type="warning" text dense class="mb-4">
          {{ $t("booking.delete.payment-due-hint.message") }}
        </v-alert>
        Sind Sie sicher, dass Sie die Buchung
        <strong>{{ toDelete.id }}</strong> löschen wollen?
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn
          class="ml-2"
          color="error"
          :loading="inProgress"
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
import { BOOKING_STATUS } from "@/utils/bookingStatus";

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
  },
  computed: {
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
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    async onDelete() {
      this.$emit("delete-booking", this.toDelete.id);
    },
  },
};
</script>

<style scoped></style>
