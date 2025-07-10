<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="error">mdi-alert</v-icon>
        <span class="text-h5">Buchung stornieren</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Die Buchung
          <strong>{{ toReject.id }}</strong> ist Teil einer Serienbuchung.
          Möchten Sie die gesamte Serie stornieren?
        </span>
      </v-card-text>
      <v-card-text v-if="error" class="text-center">
        <v-alert type="error" border="left" elevation="2">
          {{ error }}
        </v-alert>
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
      <v-card-text class="d-flex justify-center">
        <v-col cols="auto">
          <v-btn large color="primary" :loading="inProgress" @click="onRejectGroup"
            >Serie stornieren</v-btn
          >
        </v-col>
        <v-col cols="auto">
          <v-btn
            large
            color="primary"
            @click="onRejectSingle"
            :loading="inProgress"
            >Nur diese Buchung stornieren</v-btn
          >
        </v-col>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-col class="shrink">
          <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "GroupBookingRejectConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toReject: {
      type: Object,
      required: true,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },

  data() {
    return {
      rejectReason: null,
    };
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
    async onRejectSingle() {
      this.$emit("reject-single-booking", this.toReject.id, this.rejectReason);
    },
    async onRejectGroup() {
      this.$emit("reject-group-booking", this.toReject.id, this.rejectReason);
    },
  },
};
</script>

<style scoped></style>
