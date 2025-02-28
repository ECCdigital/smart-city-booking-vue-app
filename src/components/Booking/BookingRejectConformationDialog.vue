<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="error">mdi-alert</v-icon>
        <span class="text-h5">Buchung stornieren</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Sind Sie sicher, dass Sie die Buchung
          <strong>{{ toReject.id }}</strong> stornieren wollen?
        </span>
      </v-card-text>
      <v-card-text>
        <v-textarea
          outlined
          v-model="rejectReason"
          label="Begründung der Stornierung"
          placeholder="Aus welchem Grund wird die Stornierung durchgeführt?"
          rows="2"
        ></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-col class="shrink">
          <v-btn color="primary" :loading="inProgress" @click="onReject"
            >Ja</v-btn
          >
        </v-col>
        <v-col class="shrink">
          <v-btn outlined @click="closeDialog">Nein</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import { mapGetters } from "vuex";

export default {
  name: "BookingDeleteConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toReject: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      inProgress: false,
      rejectReason: null,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
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
    async onReject() {
      this.inProgress = true;
      try {
        await ApiBookingService.rejectBooking(
          this.toReject.id,
          this.tenantId,
          this.rejectReason
        );
        this.closeDialog();
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>

<style scoped></style>
