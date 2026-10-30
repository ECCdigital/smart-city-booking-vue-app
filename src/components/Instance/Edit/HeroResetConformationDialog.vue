<template>
  <v-dialog
    :value="value"
    persistent
    scrollable
    max-width="480"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">Auf Standard zurücksetzen</span>
        <v-spacer />
        <v-btn icon @click="$emit('cancel')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        Der Kopfbereich zeigt danach wieder das Standard-Layout und folgt
        Portalname und Logo. Ihre Blöcke und Höhen gehen dabei verloren. Der
        Hintergrund bleibt unverändert.
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('cancel')">Abbrechen</v-btn>
        <v-btn color="error" :loading="inProgress" @click="$emit('confirm')">
          <v-icon left small>mdi-restore</v-icon>
          Zurücksetzen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * Asks before „Auf Standard zurücksetzen“ drops the layout. The Hero Editor
 * owns the call that follows; this dialog only asks.
 */
export default {
  name: "HeroResetConformationDialog",
  props: {
    value: { type: Boolean, default: false },
    inProgress: { type: Boolean, default: false },
  },
};
</script>
