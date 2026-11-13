<script>
/**
 * PROTOTYPE (tickets#1094) — Variante A: Rotieren as one small dialog for a
 * Tür, ein festes Fach, ein Fach einer Anlage or alle Fächer.
 *
 * The warning follows the QR-Scan: Verlangt der Zugangspunkt ihn, sperrt ein
 * alter Aufkleber Buchende aus, and the dialog says so in yellow. Sonst ist es
 * ein Satz in grau. The Häkchen bleibt nur für „alle Fächer mit QR-Scan“.
 * Danach: im selben Dialog direkt drucken, PDF zuerst.
 */
import FakeQr from "../FakeQr.vue";
import {
  code,
  faecher,
  fachLabel,
  opensNot,
  scanRequired,
  rotate,
  rotateAll,
  download,
  downloadSheet,
} from "../qr";

export default {
  name: "RotateDialogA",
  components: { FakeQr },
  props: {
    value: { type: Boolean, default: false },
    row: { type: Object, default: null },
    fach: { type: Object, default: null },
    all: { type: Boolean, default: false },
  },
  data() {
    return { done: false, acknowledged: false };
  },
  computed: {
    count() {
      return this.row ? faecher(this.row).length : 0;
    },
    target() {
      if (!this.row) return "";
      if (this.all) return `aller ${this.count} Fächer von „${this.row.label}“`;
      if (this.fach)
        return `von ${fachLabel(this.fach)} in „${this.row.label}“`;
      return `von „${this.row.label}“`;
    },
    locks() {
      return this.row && scanRequired(this.row);
    },
    needsAck() {
      return this.all && this.locks;
    },
    consequence() {
      if (!this.row) return "";
      const who = opensNot(this.row, this.fach, this.all);
      const sticker = this.all
        ? "die neuen Aufkleber hängen"
        : "der neue Aufkleber hängt";
      return this.locks
        ? `Bis ${sticker}, ${who} für Buchende.`
        : "Buchende öffnen weiter über die App, nur der alte Aufkleber führt ins Leere.";
    },
  },
  watch: {
    value(open) {
      if (open) {
        this.done = false;
        this.acknowledged = false;
      }
    },
  },
  methods: {
    code,
    close() {
      this.$emit("input", false);
    },
    confirm() {
      if (this.all) rotateAll(this.row);
      else rotate(this.row, this.fach);
      this.done = true;
    },
    print(format) {
      if (this.all) downloadSheet(this.row);
      else download(this.row, this.fach, format);
    },
  },
};
</script>

<template>
  <v-dialog :value="value" max-width="480" @input="close">
    <v-card v-if="row">
      <v-card-title class="text-h6 pb-2">
        {{ all ? "Alle Scan-Codes rotieren" : "Scan-Code rotieren" }}
      </v-card-title>

      <v-card-text v-if="!done">
        <p class="mb-3">
          Der Scan-Code {{ target }} wird ersetzt. Gedruckte Aufkleber gelten ab
          sofort nicht mehr.
        </p>
        <v-alert
          v-if="locks"
          dense
          text
          color="warning"
          icon="mdi-lock-alert-outline"
          class="mb-0"
        >
          {{ consequence }}
        </v-alert>
        <p v-else class="text-body-2 text--secondary mb-0">
          {{ consequence }}
        </p>
        <v-checkbox
          v-if="needsAck"
          v-model="acknowledged"
          hide-details
          class="mt-3"
          label="Ich drucke alle Aufkleber neu und bringe sie an."
        />
      </v-card-text>

      <v-card-text v-else>
        <div class="done">
          <FakeQr v-if="!all" :seed="code(row, fach)" :size="72" />
          <div>
            <div class="done__title">
              <v-icon small color="success" class="mr-1">mdi-check</v-icon>
              {{ all ? `${count} Scan-Codes ersetzt.` : "Scan-Code ersetzt." }}
            </div>
            <div class="text-body-2 text--secondary">
              {{
                all
                  ? "Jetzt das Sammel-PDF drucken und jeden Aufkleber an sein Fach bringen."
                  : "Jetzt den neuen QR-Code drucken und anbringen."
              }}
            </div>
          </div>
        </div>
        <div class="mt-4 d-flex align-center flex-wrap" style="gap: 8px">
          <v-btn color="primary" depressed @click="print('pdf')">
            <v-icon left>mdi-printer-outline</v-icon>
            {{ all ? "Sammel-PDF drucken" : "Neuen QR-Code drucken" }}
          </v-btn>
          <template v-if="!all">
            <v-btn text small @click="print('svg')">SVG</v-btn>
            <v-btn text small @click="print('png')">PNG</v-btn>
          </template>
        </div>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn text @click="close">{{
          done ? "Schließen" : "Abbrechen"
        }}</v-btn>
        <v-btn
          v-if="!done"
          color="error"
          depressed
          :disabled="needsAck && !acknowledged"
          @click="confirm"
        >
          {{ all ? `${count} rotieren` : "Rotieren" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.done {
  display: flex;
  align-items: center;
  gap: 16px;
}

.done__title {
  font-weight: var(--scb-font-weight-medium);
  margin-bottom: 2px;
}
</style>
