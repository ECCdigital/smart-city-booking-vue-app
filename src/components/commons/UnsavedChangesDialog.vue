<template>
  <v-dialog :value="value" max-width="480" persistent @input="$emit('input', $event)">
    <v-card>
      <v-card-title class="text-h6">
        {{ $t("unsavedChangesLeave.title") }}
      </v-card-title>
      <v-card-text>
        {{ $t("unsavedChangesLeave.message") }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="$emit('stay')">
          {{ $t("unsavedChangesLeave.stay") }}
        </v-btn>
        <v-btn color="warning" text @click="$emit('discard')">
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
