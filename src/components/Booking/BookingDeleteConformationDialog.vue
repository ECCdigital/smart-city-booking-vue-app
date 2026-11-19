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
        Sind Sie sicher, dass Sie die Buchung
        <strong>{{ toDelete.id }}</strong> löschen wollen?
        <v-alert v-if="isConfirmed" type="warning" text dense class="mt-4 mb-0">
          {{ $t("booking.delete.confirmed-hint.message") }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-tooltip :disabled="!deleteDisabled" top>
          <template v-slot:activator="{ on }">
            <div v-on="on" class="ml-2">
              <v-btn
                color="error"
                :disabled="deleteDisabled"
                :loading="inProgress"
                @click="onDelete"
              >
                <v-icon left small>mdi-delete</v-icon>
                Löschen
              </v-btn>
            </div>
          </template>
          <span>{{ $t("booking.delete.requires-rejection.message") }}</span>
        </v-tooltip>
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
    /** The host's answer to `BookingPermissionService.allowHardDelete`, negated. */
    deleteDisabled: {
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
