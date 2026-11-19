<!-- BookingConfirmStatusChangeDialog.vue -->
<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="600px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-alert-circle</v-icon>
        <span class="text-h5">Status-Änderung bestätigen</span>
        <v-spacer />
        <v-btn icon :disabled="inProgress" @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <p class="mb-3">
          Beim Verschieben wird die Buchung automatisch in folgenden Status
          gesetzt:
        </p>

        <v-chip
          v-for="statusText in translatedStatusList"
          :key="statusText"
          class="ma-1"
          color="primary"
          small
          text-color="white"
        >
          {{ statusText }}
        </v-chip>

        <v-divider class="my-4"></v-divider>
        <v-checkbox
          v-model="dontAskAgain"
          label="Für diese Art von Status-Änderung nicht mehr fragen"
          hide-details
          class="mt-2"
        ></v-checkbox>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog" :disabled="inProgress">
          Abbrechen
        </v-btn>
        <v-btn color="primary" @click="onConfirm" :loading="inProgress">
          <v-icon left small>mdi-check</v-icon>
          Bestätigen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "BookingConfirmStatusChangeDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    status: {
      type: Array,
      required: true,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    statusKey: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      dontAskAgain: false,
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },

    // The workflow actions the backend knows (`workflow-action.js`):
    // `commit`, `paid`, `reject`. `pending` and `cancelled` were offered
    // once and ignored.
    statusMap() {
      return {
        commit: this.$t("booking.action.confirm"),
        paid: this.$t("booking.action.pay"),
        reject: this.$t("booking.action.cancel"),
      };
    },

    translatedStatusList() {
      return this.status.map((s) => this.statusMap[s] || s);
    },
  },
  methods: {
    ...mapActions("userPreferences", ["setSkipStatusConfirmation"]),

    closeDialog() {
      this.dontAskAgain = false;
      this.$emit("reject");
    },

    async onConfirm() {
      if (this.dontAskAgain) {
        await this.setSkipStatusConfirmation({
          statusKey: this.statusKey,
          skip: true,
        });
      }

      this.dontAskAgain = false;
      this.$emit("confirm");
    },
  },

  watch: {
    open(newVal) {
      if (!newVal) {
        this.dontAskAgain = false;
      }
    },
  },
};
</script>
