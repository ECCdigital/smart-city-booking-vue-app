<script>
/**
 * PROTOTYPE (tickets#1049) — the Sammel-PDF of a Schließfachanlage, one
 * layout per variant. Preview at reduced size; "Probedruck" opens the same
 * HTML in a window to print on a real Etikettenbogen.
 */
import { sheetHtml } from "@/prototype/qr-je-fach/sheets";

const MM = 96 / 25.4;

export default {
  name: "SheetView",
  props: {
    anlage: { type: Object, required: true },
    layoutKey: { type: String, required: true },
  },
  data() {
    return {
      newPagePerBank: true,
      includeOutOfService: true,
      instruction: true,
      cutLines: true,
      scale: 0.55,
    };
  },
  computed: {
    sheet() {
      return sheetHtml(this.layoutKey, this.anlage, {
        newPagePerBank: this.newPagePerBank,
        includeOutOfService: this.includeOutOfService,
        instruction: this.instruction,
        cutLines: this.cutLines,
      });
    },
    frameStyle() {
      const w = 210 * MM;
      const h = this.sheet.pages * (297 + 6) * MM;
      return {
        width: `${w}px`,
        height: `${h}px`,
        transform: `scale(${this.scale})`,
        transformOrigin: "top left",
        border: 0,
      };
    },
    wrapStyle() {
      return {
        width: `${210 * MM * this.scale}px`,
        height: `${this.sheet.pages * (297 + 6) * MM * this.scale}px`,
        overflow: "hidden",
      };
    },
  },
  methods: {
    print() {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.open();
      w.document.write(this.sheet.html);
      w.document.close();
      setTimeout(() => w.print(), 300);
    },
  },
};
</script>

<template>
  <v-row>
    <v-col cols="12" md="4">
      <v-card outlined class="pa-4" style="position: sticky; top: 80px">
        <div class="text-h6 mb-1">{{ sheet.layout.name }}</div>
        <div class="text-body-2 text--secondary mb-4">
          {{ sheet.layout.note }}
        </div>
        <div class="text-body-2 mb-4">
          <strong>{{ anlage.label }}</strong> · {{ sheet.count }} Etiketten auf
          {{ sheet.pages }} Seite{{ sheet.pages === 1 ? "" : "n" }}
        </div>

        <div class="text-overline">Mit zu entscheiden</div>
        <v-switch
          v-model="newPagePerBank"
          dense
          hide-details
          label="Jeder Schrank beginnt eine neue Seite"
        />
        <v-switch
          v-model="includeOutOfService"
          dense
          hide-details
          label="Fächer außer Betrieb mitdrucken"
        />
        <v-switch
          v-model="instruction"
          dense
          hide-details
          label="Hinweis „Scannen, um … zu öffnen“"
          :disabled="layoutKey === 'C'"
        />
        <v-switch
          v-model="cutLines"
          dense
          hide-details
          label="Schnittlinien (Normalpapier)"
        />

        <v-slider
          v-model="scale"
          class="mt-6"
          min="0.3"
          max="1"
          step="0.05"
          label="Zoom"
          hide-details
        />

        <v-btn color="primary" class="mt-4" block @click="print">
          <v-icon left>mdi-printer</v-icon>
          Probedruck
        </v-btn>
        <div class="text-caption text--secondary mt-2">
          Der QR-Code ist ein Platzhalter und kodiert nichts. Im Druckdialog
          „Ränder: keine“ und „Skalierung 100 %“ wählen.
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="8">
      <div :style="wrapStyle">
        <iframe
          :key="sheet.html.length + layoutKey"
          :srcdoc="sheet.html"
          :style="frameStyle"
          title="Vorschau Sammel-PDF"
        />
      </div>
    </v-col>
  </v-row>
</template>
