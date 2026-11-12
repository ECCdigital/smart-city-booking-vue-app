<script>
/**
 * PROTOTYPE (tickets#1049) — rotate the scan code of one Fach, of all Fächer
 * of a Schließfachanlage, or of one Schließfachschrank. Throwaway.
 *
 * `guard` is how hard the dialog makes rotating many codes at once - it is
 * one of the things the variants disagree about:
 *   confirm   one button, like the door today
 *   checkbox  "Ich drucke alle Aufkleber neu" must be ticked first
 *   typed     the number of Fächer must be typed in
 */
import { compartmentName, fileName, stub } from "@/prototype/qr-je-fach/data";

export default {
  name: "RotateDialog",
  props: {
    open: { type: Boolean, default: false },
    anlage: { type: Object, default: null },
    // One Fach, or null for many.
    compartment: { type: Object, default: null },
    // Limit "many" to one Schrank, or null for the whole Anlage.
    lockerBank: { type: Object, default: null },
    guard: { type: String, default: "confirm" },
  },
  data() {
    return { rotated: false, acknowledged: false, typed: "" };
  },
  computed: {
    targets() {
      if (!this.anlage) return [];
      if (this.compartment) return [this.compartment];
      return this.anlage.compartments.filter(
        (c) => !this.lockerBank || c.lockerBank.id === this.lockerBank.id
      );
    },
    many() {
      return !this.compartment;
    },
    scopeLabel() {
      if (this.compartment) return compartmentName(this.compartment);
      if (this.lockerBank)
        return `alle Fächer von Schrank ${this.lockerBank.name}`;
      return `alle Fächer der Anlage „${this.anlage?.label}“`;
    },
    canConfirm() {
      if (!this.many || this.guard === "confirm") return true;
      if (this.guard === "checkbox") return this.acknowledged;
      return Number(this.typed) === this.targets.length;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.rotated = false;
        this.acknowledged = false;
        this.typed = "";
      }
    },
  },
  methods: {
    rotate() {
      this.targets.forEach((c) => (c.rotations += 1));
      this.rotated = true;
      stub(
        `Würde ${this.targets.length} Scan-Code${
          this.targets.length === 1 ? "" : "s"
        } rotieren (je Fach ein Aufruf, wie an der Tür).`
      );
    },
    download(format) {
      stub(
        `Würde laden: ${fileName(
          this.anlage,
          this.many ? null : this.compartment,
          format
        )}`
      );
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="580"
    persistent
    @input="!$event && $emit('close')"
  >
    <v-card v-if="anlage">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">
          {{ many ? "Alle Scan-Codes rotieren" : "Scan-Code rotieren" }}
        </span>
        <v-spacer />
        <v-btn icon @click="$emit('close')"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <template v-if="!rotated">
          <p>
            Soll der Scan-Code für <strong>{{ scopeLabel }}</strong> ersetzt
            werden?
            <span v-if="many">Das betrifft {{ targets.length }} Fächer.</span>
          </p>
          <v-alert color="warning" text dense>
            <v-icon left>mdi-alert</v-icon>
            <template v-if="many">
              Alle {{ targets.length }} gedruckten und angebrachten QR-Codes
              werden sofort ungültig. Drucken Sie das Sammel-PDF und bringen Sie
              jeden Aufkleber an seinem Fach an.
            </template>
            <template v-else>
              Der angebrachte QR-Code dieses Fachs wird sofort ungültig. Drucken
              Sie den neuen aus und bringen Sie ihn am Fach an.
            </template>
          </v-alert>
          <v-alert
            v-if="anlage.qrScanRequired"
            color="error"
            text
            dense
            class="mb-0"
          >
            <v-icon left>mdi-lock-alert</v-icon>
            Die Anlage verlangt den QR-Scan. Bis die neuen Aufkleber hängen,
            öffnet
            {{ many ? "keines dieser Fächer" : "dieses Fach" }} für Buchende.
          </v-alert>
          <v-alert v-else color="info" text dense class="mb-0">
            <v-icon left>mdi-information-outline</v-icon>
            Die Anlage verlangt keinen QR-Scan. Buchende öffnen weiter über die
            App, nur der alte Aufkleber führt ins Leere.
          </v-alert>

          <template v-if="many && guard === 'checkbox'">
            <v-checkbox
              v-model="acknowledged"
              class="mt-4"
              hide-details
              label="Ich drucke alle Aufkleber neu und bringe sie an."
            />
          </template>
          <template v-if="many && guard === 'typed'">
            <p class="mt-4 mb-2 text-body-2">
              Geben Sie zur Bestätigung die Zahl der Fächer ein:
              <strong>{{ targets.length }}</strong>
            </p>
            <v-text-field
              v-model="typed"
              filled
              dense
              hide-details
              background-color="accent"
              style="max-width: 160px"
            />
          </template>
        </template>

        <template v-else>
          <v-alert color="success" text dense>
            <v-icon left>mdi-check-circle</v-icon>
            {{
              many
                ? `${targets.length} Scan-Codes ersetzt. Die alten QR-Codes sind ab sofort ungültig.`
                : "Der Scan-Code wurde ersetzt. Der alte QR-Code ist ab sofort ungültig."
            }}
          </v-alert>
          <p class="mb-2">
            {{ many ? "Neue QR-Codes drucken:" : "Neuen QR-Code drucken:" }}
          </p>
          <div class="d-flex align-center flex-wrap" style="gap: 8px">
            <v-btn color="primary" @click="download('pdf')">
              <v-icon left>mdi-file-pdf-box</v-icon>
              {{ many ? "Sammel-PDF" : "QR-Code drucken (PDF, A4)" }}
            </v-btn>
            <template v-if="!many">
              <v-btn text small @click="download('svg')">SVG</v-btn>
              <v-btn text small @click="download('png')">PNG</v-btn>
            </template>
          </div>
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('close')">
          {{ rotated ? "Schließen" : "Abbrechen" }}
        </v-btn>
        <v-btn
          v-if="!rotated"
          color="error"
          :disabled="!canConfirm"
          @click="rotate"
        >
          <v-icon left small>mdi-autorenew</v-icon>
          {{ many ? `${targets.length} rotieren` : "Rotieren" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
