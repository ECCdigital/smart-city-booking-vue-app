<template>
  <v-dialog :value="value" max-width="480" @input="$emit('input', $event)">
    <v-card>
      <v-card-title class="text-h6">Auf Standard zurücksetzen</v-card-title>
      <v-card-text>
        Der Kopfbereich zeigt danach wieder das Standard-Layout und folgt
        Portalname und Logo. Ihre Blöcke und Höhen gehen dabei verloren. Der
        Hintergrund bleibt unverändert.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="$emit('cancel')">Abbrechen</v-btn>
        <v-btn
          color="warning"
          text
          :loading="inProgress"
          @click="$emit('confirm')"
        >
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
