<!-- BookingConfirmStatusChangeDialog.vue -->
<template>
  <v-dialog v-model="openDialog" persistent max-width="600px">
    <v-card color="accent">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-3" color="warning">mdi-alert-circle</v-icon>
        <span class="text-h6">Status-Änderung bestätigen</span>
      </v-card-title>

      <v-card-text class="pt-4">
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

      <v-card-actions class="px-6 pb-4">
        <v-spacer></v-spacer>
        <v-btn outlined @click="closeDialog" :disabled="inProgress">
          Abbrechen
        </v-btn>
        <v-btn color="primary" @click="onConfirm" :loading="inProgress">
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

    statusMap() {
      return {
        commit: "Freigegeben",
        paid: "Bezahlt",
        reject: "Abgelehnt",
        pending: "Ausstehend",
        cancelled: "Storniert",
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
