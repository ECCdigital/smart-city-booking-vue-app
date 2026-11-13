<script>
/**
 * PROTOTYPE (tickets#1094) — Variante B: Ein QR-Dialog für alles.
 *
 * Der Knopf QR-Code öffnet bei Tür, festem Fach und Anlage denselben Dialog.
 * Links der Code (bei der Anlage: die Fächer nach Schrank, oben „Alle
 * Fächer“), rechts drucken: PDF als großer Knopf, SVG und PNG als leise
 * Links. Ganz unten „Scan-Code ersetzen …“, das im selben Dialog nachfragt,
 * ohne zweiten Dialog und ohne Häkchen. Danach zeigt die Vorschau den neuen
 * Code, und der große Knopf heißt „Neuen QR-Code drucken“.
 *
 * Das Menü „…“ der Zeile hat nur noch Löschen: SVG, PNG und Rotieren leben
 * im Dialog. Weicht von tickets#1093 ab, das ist hier die Frage.
 */
import QrRows from "../QrRows.vue";
import FakeQr from "../FakeQr.vue";
import { stub } from "../../zugangspunkte-fuehrung/data";
import {
  isAnlage,
  isFixed,
  faecher,
  schraenke,
  code,
  key,
  fachLabel,
  opensNot,
  scanRequired,
  rotate,
  rotateAll,
  download,
  downloadSheet,
} from "../qr";

export default {
  name: "VariantB",
  components: { QrRows, FakeQr },
  data() {
    return {
      open: false,
      row: null,
      selected: "all", // „all“ or a Fach id, only for an Anlage
      confirming: false,
      rotated: {}, // keys rotated while this dialog is open
    };
  },
  computed: {
    anlage() {
      return this.row && isAnlage(this.row);
    },
    groups() {
      return this.anlage ? schraenke(this.row) : [];
    },
    count() {
      return this.anlage ? faecher(this.row).length : 0;
    },
    fach() {
      if (!this.anlage || this.selected === "all") return null;
      return faecher(this.row).find((f) => f.id === this.selected) || null;
    },
    all() {
      return this.anlage && this.selected === "all";
    },
    title() {
      if (!this.row) return "";
      if (this.all) return "Alle Fächer";
      if (this.fach) return fachLabel(this.fach);
      return isFixed(this.row) ? "QR-Code des Fachs" : "QR-Code der Tür";
    },
    isNew() {
      if (!this.row) return false;
      if (this.all)
        return faecher(this.row).some((f) => this.rotated[key(this.row, f)]);
      return !!this.rotated[key(this.row, this.fach)];
    },
    sheetPreview() {
      return this.anlage ? faecher(this.row).slice(0, 8) : [];
    },
    warning() {
      if (!this.row) return "";
      const who = opensNot(this.row, this.fach, this.all);
      return scanRequired(this.row)
        ? `Gedruckte Aufkleber gelten sofort nicht mehr, bis ${
            this.all ? "die neuen hängen" : "der neue hängt"
          }, ${who} für Buchende.`
        : "Gedruckte Aufkleber gelten sofort nicht mehr. Buchende öffnen weiter über die App.";
    },
  },
  methods: {
    code,
    key,
    scanRequired,
    menuFor() {
      return [
        {
          key: "delete",
          icon: "mdi-delete-outline",
          text: "Löschen …",
          danger: true,
        },
      ];
    },
    qrTitle(row) {
      return isAnlage(row) ? "QR-Codes der Fächer" : "QR-Code";
    },
    show(row, { selected = "all", confirming = false } = {}) {
      this.row = row;
      this.selected = selected;
      this.confirming = confirming;
      this.rotated = {};
      this.open = true;
    },
    onQr(row) {
      this.show(row);
    },
    onMore(row, action) {
      if (action.key === "rotate" || action.key === "rotate-all")
        return this.show(row, { confirming: true });
      stub(`Stub: „${action.text.replace(" …", "")}“ für „${row.label}“.`);
    },
    select(id) {
      this.selected = id;
      this.confirming = false;
    },
    confirm() {
      const r = { ...this.rotated };
      if (this.all) {
        rotateAll(this.row);
        faecher(this.row).forEach((f) => (r[key(this.row, f)] = true));
      } else {
        rotate(this.row, this.fach);
        r[key(this.row, this.fach)] = true;
      }
      this.rotated = r;
      this.confirming = false;
    },
    print(format) {
      if (this.all) downloadSheet(this.row);
      else download(this.row, this.fach, format);
    },
  },
};
</script>

<template>
  <div>
    <QrRows :menu-for="menuFor" :qr-title="qrTitle" @qr="onQr" @more="onMore" />

    <v-dialog v-model="open" :max-width="anlage ? 720 : 520" scrollable>
      <v-card v-if="row">
        <v-card-title class="d-block pb-2">
          <div class="text-h6">{{ row.label }}</div>
          <div class="text-caption text--secondary">
            {{ anlage ? `Schließfachanlage · ${count} Fächer · ` : ""
            }}{{ scanRequired(row) ? "mit QR-Scan" : "ohne QR-Scan" }}
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-0">
          <div class="qrb-body" :class="{ 'qrb-body--split': anlage }">
            <nav v-if="anlage" class="faecher">
              <button
                class="faecher__item faecher__item--all"
                :class="{ 'is-active': selected === 'all' }"
                @click="select('all')"
              >
                Alle Fächer
                <span class="faecher__count">{{ count }}</span>
              </button>
              <template v-for="g in groups">
                <div :key="`h-${g.schrank}`" class="faecher__head">
                  Schrank {{ g.schrank }}
                </div>
                <button
                  v-for="f in g.faecher"
                  :key="f.id"
                  class="faecher__item"
                  :class="{ 'is-active': selected === f.id }"
                  @click="select(f.id)"
                >
                  Fach {{ f.number }}
                  <span v-if="f.outOfService" class="faecher__out"
                    >außer Betrieb</span
                  >
                  <span v-if="rotated[key(row, f)]" class="faecher__new"
                    >neu</span
                  >
                </button>
              </template>
            </nav>

            <div class="detail">
              <div class="detail__title">{{ title }}</div>

              <div class="detail__preview">
                <div v-if="all" class="sheet">
                  <div
                    v-for="f in sheetPreview"
                    :key="f.id"
                    class="sheet__cell"
                  >
                    <FakeQr :seed="code(row, f)" :size="28" />
                    <span>{{ f.number }}</span>
                  </div>
                </div>
                <FakeQr v-else :seed="code(row, fach)" :size="132" />
                <span v-if="isNew" class="detail__new">
                  <v-icon x-small color="success" class="mr-1"
                    >mdi-check</v-icon
                  >
                  Neu ersetzt, noch drucken
                </span>
              </div>

              <template v-if="!confirming">
                <v-btn color="primary" depressed block @click="print('pdf')">
                  <v-icon left>mdi-printer-outline</v-icon>
                  <template v-if="all">Sammel-PDF drucken</template>
                  <template v-else-if="isNew">Neuen QR-Code drucken</template>
                  <template v-else>Drucken (PDF, A4)</template>
                </v-btn>
                <div class="detail__formats">
                  <template v-if="all">
                    Etikettenbogen 2×4, jeder Schrank auf einer neuen Seite.
                  </template>
                  <template v-else>
                    Für eigene Layouts:
                    <a @click.prevent="print('svg')">SVG</a> ·
                    <a @click.prevent="print('png')">PNG</a>
                  </template>
                </div>
              </template>

              <div v-else class="confirm">
                <div class="confirm__q">
                  {{
                    all
                      ? `Scan-Codes aller ${count} Fächer ersetzen?`
                      : "Scan-Code ersetzen?"
                  }}
                </div>
                <div class="confirm__text">{{ warning }}</div>
                <div class="d-flex mt-3" style="gap: 8px">
                  <v-btn small depressed color="error" @click="confirm">
                    {{ all ? `${count} ersetzen` : "Ersetzen" }}
                  </v-btn>
                  <v-btn small text @click="confirming = false"
                    >Abbrechen</v-btn
                  >
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-6 py-3">
          <v-btn
            v-if="!confirming"
            text
            small
            color="error"
            @click="confirming = true"
          >
            <v-icon left small>mdi-autorenew</v-icon>
            {{ all ? "Alle Scan-Codes ersetzen …" : "Scan-Code ersetzen …" }}
          </v-btn>
          <v-spacer />
          <v-btn text @click="open = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.qrb-body {
  display: block;
}

.qrb-body--split {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 360px;
}

.faecher {
  border-right: 1px solid var(--scb-rule);
  padding: 8px 0;
  max-height: 440px;
  overflow-y: auto;
}

.faecher__head {
  padding: 12px 16px 2px;
  font-size: var(--scb-font-size-caption);
  color: var(--scb-text-muted);
}

.faecher__item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 16px;
  text-align: left;
  font-size: var(--scb-font-size-sm);
  color: inherit;
}

.faecher__item:hover {
  background: var(--scb-surface-tint-faint);
}

.faecher__item.is-active {
  background: var(--scb-primary-tint, rgba(25, 118, 210, 0.1));
  font-weight: var(--scb-font-weight-medium);
}

.faecher__item--all {
  font-weight: var(--scb-font-weight-medium);
}

.faecher__count {
  margin-left: auto;
  color: var(--scb-text-muted);
}

.faecher__out {
  font-size: var(--scb-font-size-caption);
  color: var(--v-warning-darken2);
}

.faecher__new {
  margin-left: auto;
  font-size: var(--scb-font-size-caption);
  color: var(--v-success-base);
}

.detail {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail > .v-btn {
  flex: 0 0 auto;
}

.detail__title {
  font-weight: var(--scb-font-weight-medium);
}

.detail__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-surface);
}

.detail__new {
  font-size: var(--scb-font-size-caption);
  color: var(--v-success-darken1);
}

.detail__formats {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  text-align: center;
}

.sheet {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.sheet__cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border: 1px dashed #bdbdbd;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
}

.confirm {
  padding: 12px;
  border-left: 3px solid var(--v-error-base);
  background: var(--scb-surface-tint-faint);
}

.confirm__q {
  font-weight: var(--scb-font-weight-medium);
  margin-bottom: 2px;
}

.confirm__text {
  font-size: var(--scb-font-size-sm);
}
</style>
