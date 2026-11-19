<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-information</v-icon>
        <span class="text-h5">{{ title }}</span>
        <v-spacer />
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        Die Buchung
        <strong>{{ bookingId }}</strong>
        ist Teil einer Serienbuchung. {{ question }}
        <v-alert v-if="error" type="error" border="left" class="mt-4 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end flex-wrap px-6 py-4">
        <v-btn outlined @click="$emit('close')">Abbrechen</v-btn>
        <v-btn
          color="primary"
          :loading="inProgress"
          @click="$emit('choose-primary')"
        >
          {{ primaryLabel }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="inProgress"
          @click="$emit('choose-secondary')"
        >
          {{ secondaryLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "GroupBookingAggregatedChoiceDialog",
  props: {
    bookingId: {
      type: String,
      required: true,
    },
    open: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    primaryLabel: {
      type: String,
      required: true,
    },
    secondaryLabel: {
      type: String,
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
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
};
</script>
