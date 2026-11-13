<script>
/**
 * PROTOTYPE (tickets#1084) — stand-in for the connect form of one
 * Schließsystem. The real forms per Anbieter are still fog on the Karte
 * („Reiter Schließsysteme“), so this only flips the state.
 */
import { provider, connect } from "./data";

export default {
  name: "StubConnectDialog",
  props: {
    value: Boolean,
    providerId: { type: String, default: null },
  },
  computed: {
    p() {
      return provider(this.providerId) || {};
    },
  },
  methods: {
    close() {
      this.$emit("input", false);
    },
    submit() {
      connect(this.providerId);
      this.$emit("connected", this.providerId);
      this.close();
    },
  },
};
</script>

<template>
  <v-dialog :value="value" max-width="520" @input="$emit('input', $event)">
    <v-card>
      <v-card-title>{{ p.name }} verbinden</v-card-title>
      <v-card-text>
        <v-alert dense text type="warning" icon="mdi-flask-outline">
          Platzhalter. Wie das Formular je Anbieter aussieht, ist noch Nebel auf
          der Karte. Hier zählt nur: Was passiert danach auf der Seite?
        </v-alert>
        <v-text-field label="Zugangsdaten" value="••••••••" disabled />
        <div class="text-body-2">
          Verbinden prüft die Zugangsdaten und speichert sie. Danach ist
          {{ p.name }} aktiv.
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" depressed @click="submit">Verbinden</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
