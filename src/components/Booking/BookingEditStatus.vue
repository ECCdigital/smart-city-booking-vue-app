<template>
  <div>
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
        :input-value="booking.isRejected"
        label="Storniert"
        hide-details
        dense
        class="status-switch mt-0"
        color="primary"
        @change="onRejectedChange"
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

    <v-expand-transition>
      <v-sheet
        v-if="booking.isRejected"
        class="mb-4 px-4 py-3 status-reason"
        rounded
      >
        <v-textarea
          v-model="booking.rejectionReason"
          :label="rejectionReasonLabel"
          filled
          dense
          background-color="accent"
          rows="2"
          hide-details="auto"
          :rules="rejectionReasonRules"
        />
      </v-sheet>
    </v-expand-transition>

    <v-dialog v-model="rejectDialog" persistent max-width="520px">
      <v-card color="">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-alert</v-icon>
          <span class="text-h6">{{ rejectDialogTitle }}</span>
        </v-card-title>
        <v-card-text>
          <p class="mb-4 text-body-2">
            {{ rejectDialogHint }}
          </p>
          <v-textarea
            v-model="rejectReasonDraft"
            :label="rejectionReasonLabel"
            :placeholder="rejectReasonPlaceholder"
            filled
            dense
            background-color="accent"
            rows="3"
            autofocus
            :rules="rejectionReasonRules"
            @keydown.enter.prevent
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn text @click="cancelReject">Abbrechen</v-btn>
          <v-btn
            color="error"
            :disabled="!rejectReasonDraft || !rejectReasonDraft.trim()"
            @click="confirmReject"
          >
            Bestätigen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
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
  data() {
    return {
      rejectDialog: false,
      rejectReasonDraft: "",
    };
  },
  computed: {
    isCancellation() {
      return !!this.booking.isCommitted;
    },
    rejectionReasonLabel() {
      return this.isCancellation ? "Stornierungsgrund" : "Ablehnungsgrund";
    },
    rejectDialogTitle() {
      return this.isCancellation ? "Buchung stornieren" : "Buchung ablehnen";
    },
    rejectDialogHint() {
      return this.isCancellation
        ? "Bitte geben Sie einen Grund für die Stornierung an."
        : "Bitte geben Sie einen Grund für die Ablehnung an.";
    },
    rejectReasonPlaceholder() {
      return this.isCancellation
        ? "Aus welchem Grund wird die Stornierung durchgeführt?"
        : "Aus welchem Grund wird die Buchung abgelehnt?";
    },
    rejectionReasonRules() {
      return [(v) => !!v?.trim() || "Begründung ist erforderlich"];
    },
  },
  methods: {
    onRejectedChange(value) {
      if (value) {
        this.rejectReasonDraft = this.booking.rejectionReason || "";
        this.rejectDialog = true;
        return;
      }

      this.$set(this.booking, "isRejected", false);
      this.$set(this.booking, "rejectionReason", null);
    },
    cancelReject() {
      this.$set(this.booking, "isRejected", true);
      const draft = (this.rejectReasonDraft || "").trim();
      if (draft) {
        this.$set(this.booking, "rejectionReason", draft);
      }
      this.rejectDialog = false;
      this.rejectReasonDraft = "";
    },
    confirmReject() {
      const reason = (this.rejectReasonDraft || "").trim();
      if (!reason) return;

      this.$set(this.booking, "isRejected", true);
      this.$set(this.booking, "rejectionReason", reason);
      this.rejectDialog = false;
      this.rejectReasonDraft = "";
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

.status-reason {
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-reason {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.status-switch >>> .v-input--selection-controls__input {
  margin-right: 4px;
}
</style>
