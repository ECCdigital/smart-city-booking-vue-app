<script>
/**
 * PROTOTYPE (tickets#1084) — stand-in for „Zugangspunkt anlegen“. How that
 * dialog is split up is the next Klärung (tickets#1085); here only the way
 * in and the way out matter.
 */
import { provider, activeProviders, createAccessPoint } from "./data";

export default {
  name: "StubCreateDialog",
  props: {
    value: Boolean,
    providerId: { type: String, default: null },
  },
  data() {
    return { chosen: null, label: "" };
  },
  computed: {
    options() {
      return activeProviders().map((p) => ({ text: p.name, value: p.id }));
    },
    p() {
      return provider(this.chosen) || {};
    },
  },
  watch: {
    value(open) {
      if (!open) return;
      this.chosen = this.providerId || this.options[0]?.value || null;
      this.label = "";
    },
  },
  methods: {
    close() {
      this.$emit("input", false);
    },
    submit() {
      if (!this.chosen) return;
      const ap = createAccessPoint(this.chosen, this.label.trim());
      this.$emit("created", ap);
      this.close();
    },
  },
};
</script>

<template>
  <v-dialog :value="value" max-width="520" @input="$emit('input', $event)">
    <v-card>
      <v-card-title>
        {{ p.noun ? `${p.noun} anlegen` : "Zugangspunkt anlegen" }}
      </v-card-title>
      <v-card-text>
        <v-alert dense text type="warning" icon="mdi-flask-outline">
          Platzhalter. Den Dialog selbst klärt der nächste Prototyp (#1085).
        </v-alert>
        <v-select
          v-if="!providerId"
          v-model="chosen"
          :items="options"
          label="Schließsystem"
          outlined
          dense
        />
        <v-text-field
          v-model="label"
          label="Bezeichnung"
          :placeholder="`Neue ${p.noun || 'Tür'}`"
          outlined
          dense
          autofocus
          @keydown.enter="submit"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" depressed :disabled="!chosen" @click="submit">
          Anlegen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
