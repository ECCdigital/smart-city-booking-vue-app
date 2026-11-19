<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="600px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">Regel löschen</span>
        <v-spacer />
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        Sind Sie sicher, dass Sie die Regel
        <strong>{{ toDelete.name }}</strong> löschen wollen? Diese Aktion kann
        nicht rückgängig gemacht werden.
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('close')">Abbrechen</v-btn>
        <v-btn color="error" :loading="inProgress" @click="$emit('confirm')">
          <v-icon left small>mdi-delete</v-icon>
          Löschen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "RuleDeleteDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toDelete: {
      type: Object,
      default: () => ({}),
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
      set(value) {
        if (!value) this.$emit("close");
      },
    },
  },
};
</script>
