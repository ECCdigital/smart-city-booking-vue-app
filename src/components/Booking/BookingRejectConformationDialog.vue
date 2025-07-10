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
          <v-btn color="primary" :loading="loading" @click="onReject">Ja</v-btn>
        </v-col>
        <v-col class="shrink">
          <v-btn outlined @click="closeDialog">Nein</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
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
    loading: {
      type: Boolean,
      default: false,
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
    async onReject() {
      this.$emit("reject-booking", this.toReject.id, this.rejectReason);
    },
  },
};
</script>

<style scoped></style>
