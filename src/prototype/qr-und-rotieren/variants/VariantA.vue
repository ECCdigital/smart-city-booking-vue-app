<script>
/**
 * PROTOTYPE (tickets#1094) — Variante A: Direkt drucken, Seltenes im Menü.
 *
 * Der Knopf QR-Code lädt bei Tür und festem Fach sofort das PDF (A4), ohne
 * Dialog. Bei einer Anlage öffnet er „QR-Codes der Fächer“, verschlankt:
 * oben „Alle drucken (Sammel-PDF)“, je Fach ein Drucker-Icon und ein Menü
 * „…“ mit SVG, PNG und Rotieren. „Alle rotieren …“ steht leise im Fuß.
 * SVG, PNG und Rotieren der Tür bleiben im Menü der Zeile (tickets#1093).
 *
 * Warnung: abgestuft nach QR-Scan, siehe RotateDialogA.
 */
import QrRows from "../QrRows.vue";
import RotateDialogA from "./RotateDialogA.vue";
import { stub } from "../../zugangspunkte-fuehrung/data";
import { moreActions } from "../../zeilen-je-anbieter/rows";
import {
  isAnlage,
  isFixed,
  faecher,
  schraenke,
  scanRequired,
  download,
  downloadSheet,
} from "../qr";

export default {
  name: "VariantA",
  components: { QrRows, RotateDialogA },
  data() {
    return {
      listOpen: false,
      listRow: null,
      rotateOpen: false,
      rotateRow: null,
      rotateFach: null,
      rotateAll: false,
    };
  },
  computed: {
    groups() {
      return this.listRow ? schraenke(this.listRow) : [];
    },
    count() {
      return this.listRow ? faecher(this.listRow).length : 0;
    },
  },
  methods: {
    menuFor: moreActions,
    qrTitle(row) {
      if (isAnlage(row)) return "QR-Codes der Fächer";
      return isFixed(row)
        ? "QR-Code des Fachs drucken (PDF, A4)"
        : "QR-Code drucken (PDF, A4)";
    },
    onQr(row) {
      if (isAnlage(row)) {
        this.listRow = row;
        this.listOpen = true;
      } else {
        download(row, null, "pdf");
      }
    },
    onMore(row, action) {
      if (action.key === "svg" || action.key === "png")
        return download(row, null, action.key);
      if (action.key === "rotate") return this.openRotate(row, null, false);
      if (action.key === "rotate-all") return this.openRotate(row, null, true);
      stub(`Stub: „${action.text.replace(" …", "")}“ für „${row.label}“.`);
    },
    openRotate(row, fach, all) {
      this.rotateRow = row;
      this.rotateFach = fach;
      this.rotateAll = all;
      this.rotateOpen = true;
    },
    scanRequired,
    download,
    downloadSheet,
  },
};
</script>

<template>
  <div>
    <QrRows :menu-for="menuFor" :qr-title="qrTitle" @qr="onQr" @more="onMore" />

    <v-dialog v-model="listOpen" max-width="560" scrollable>
      <v-card v-if="listRow">
        <v-card-title class="d-block pb-1">
          <div class="text-h6">QR-Codes der Fächer</div>
          <div class="text-caption text--secondary">
            {{ listRow.label }} · {{ count }} Fächer ·
            {{ scanRequired(listRow) ? "mit QR-Scan" : "ohne QR-Scan" }}
          </div>
        </v-card-title>

        <v-card-text class="pt-3">
          <v-btn color="primary" depressed @click="downloadSheet(listRow)">
            <v-icon left>mdi-printer-outline</v-icon>
            Alle drucken (Sammel-PDF)
          </v-btn>
          <div class="text-caption text--secondary mt-1 mb-4">
            Etikettenbogen 2×4 auf A4, jeder Schrank auf einer neuen Seite.
          </div>

          <section v-for="g in groups" :key="g.schrank" class="schrank">
            <h4 class="schrank__title">Schrank {{ g.schrank }}</h4>
            <div v-for="f in g.faecher" :key="f.id" class="fach">
              <span class="fach__name">Fach {{ f.number }}</span>
              <span v-if="f.outOfService" class="fach__out">außer Betrieb</span>
              <v-spacer />
              <v-btn
                icon
                small
                title="QR-Code drucken (PDF, A4)"
                @click="download(listRow, f, 'pdf')"
              >
                <v-icon small>mdi-printer-outline</v-icon>
              </v-btn>
              <v-menu offset-y left>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn icon small v-bind="attrs" v-on="on">
                    <v-icon small>mdi-dots-horizontal</v-icon>
                  </v-btn>
                </template>
                <v-list dense>
                  <v-list-item link @click="download(listRow, f, 'svg')">
                    <v-list-item-title>QR-Code als SVG</v-list-item-title>
                  </v-list-item>
                  <v-list-item link @click="download(listRow, f, 'png')">
                    <v-list-item-title>QR-Code als PNG</v-list-item-title>
                  </v-list-item>
                  <v-divider />
                  <v-list-item link @click="openRotate(listRow, f, false)">
                    <v-list-item-title>Scan-Code rotieren …</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </section>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-6 py-3">
          <v-btn
            text
            small
            color="error"
            @click="openRotate(listRow, null, true)"
          >
            Alle rotieren …
          </v-btn>
          <v-spacer />
          <v-btn text @click="listOpen = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <RotateDialogA
      v-model="rotateOpen"
      :row="rotateRow"
      :fach="rotateFach"
      :all="rotateAll"
    />
  </div>
</template>

<style scoped>
.schrank + .schrank {
  margin-top: 16px;
}

.schrank__title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  margin-bottom: 4px;
}

.fach {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0 2px 4px;
  border-top: 1px solid var(--scb-rule);
}

.fach__name {
  font-size: var(--scb-font-size-sm);
}

.fach__out {
  font-size: var(--scb-font-size-caption);
  color: var(--v-warning-darken2);
  background: var(--scb-warning-tint);
  border-radius: var(--scb-radius-badge);
  padding: 0 6px;
}
</style>
