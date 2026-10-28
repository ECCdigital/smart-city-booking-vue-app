<template>
  <v-dialog
    :value="value"
    max-width="480"
    persistent
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">{{ $t("unsavedChangesLeave.title") }}</span>
        <v-spacer />
        <v-btn icon @click="$emit('stay')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        {{ $t("unsavedChangesLeave.message") }}
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('stay')">
          {{ $t("unsavedChangesLeave.stay") }}
        </v-btn>
        <v-btn color="error" @click="$emit('discard')">
          <v-icon left small>mdi-delete-outline</v-icon>
          {{ $t("unsavedChangesLeave.discard") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "UnsavedChangesDialog",
  props: {
    value: { type: Boolean, default: false },
  },
};
</script>
