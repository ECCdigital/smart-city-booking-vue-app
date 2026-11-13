<script>
/**
 * PROTOTYPE (tickets#1094) — Variante C: Aufkleber im Blick, Warnung bis
 * gedruckt.
 *
 * Der Knopf QR-Code öffnet rechts ein Panel mit dem Aufkleber, wie er
 * gedruckt aussieht: bei der Tür die A4-Seite, bei der Anlage den
 * Etikettenbogen je Schrank. Ein Klick auf ein Etikett zeigt seine Aktionen.
 * Das Menü „…“ der Zeile bleibt wie in tickets#1093.
 *
 * Warnung vorher: immer mit Häkchen, auch an der Tür. Warnung danach: Die
 * Zeile trägt die Marke „Aufkleber tauschen“, bis der neue Code geladen ist,
 * und das Panel streicht den alten durch.
 */
import QrRows from "../QrRows.vue";
import FakeQr from "../FakeQr.vue";
import { stub } from "../../zugangspunkte-fuehrung/data";
import { moreActions } from "../../zeilen-je-anbieter/rows";
import {
  isAnlage,
  isFixed,
  faecher,
  schraenke,
  code,
  fachLabel,
  opensNot,
  scanRequired,
  rotate,
  rotateAll,
  isStale,
  staleCount,
  download,
  downloadSheet,
} from "../qr";

export default {
  name: "VariantC",
  components: { QrRows, FakeQr },
  data() {
    return {
      panel: false,
      row: null,
      picked: null,
      confirmOpen: false,
      confirmRow: null,
      confirmFach: null,
      confirmAll: false,
      acknowledged: false,
    };
  },
  computed: {
    anlage() {
      return this.row && isAnlage(this.row);
    },
    pages() {
      if (!this.anlage) return [];
      const pages = [];
      schraenke(this.row).forEach((g) => {
        for (let i = 0; i < g.faecher.length; i += 8)
          pages.push({
            id: `${g.schrank}-${i}`,
            schrank: g.schrank,
            faecher: g.faecher.slice(i, i + 8),
          });
      });
      return pages;
    },
    stale() {
      return this.row ? staleCount(this.row) : 0;
    },
    pickedFach() {
      return this.anlage
        ? faecher(this.row).find((f) => f.id === this.picked) || null
        : null;
    },
    confirmCount() {
      return this.confirmRow ? faecher(this.confirmRow).length : 0;
    },
    confirmTarget() {
      const r = this.confirmRow;
      if (!r) return "";
      if (this.confirmAll)
        return `aller ${this.confirmCount} Fächer von „${r.label}“`;
      if (this.confirmFach)
        return `von ${fachLabel(this.confirmFach)} in „${r.label}“`;
      return `von „${r.label}“`;
    },
    confirmLocks() {
      return this.confirmRow && scanRequired(this.confirmRow);
    },
    confirmConsequence() {
      const r = this.confirmRow;
      if (!r) return "";
      const who = opensNot(r, this.confirmFach, this.confirmAll);
      return this.confirmLocks
        ? `Der QR-Scan ist verlangt: Bis ${
            this.confirmAll
              ? "die neuen Aufkleber hängen"
              : "der neue Aufkleber hängt"
          }, ${who} für Buchende.`
        : "Ohne QR-Scan öffnen Buchende weiter über die App. Der alte Aufkleber führt ins Leere.";
    },
  },
  methods: {
    code,
    isStale,
    scanRequired,
    menuFor: moreActions,
    qrTitle(row) {
      return isAnlage(row) ? "Aufkleber der Fächer" : "Aufkleber ansehen";
    },
    extraMarks(row) {
      const n = staleCount(row);
      if (!n) return [];
      return [
        {
          key: "stale",
          text: n > 1 ? `${n} Aufkleber tauschen` : "Aufkleber tauschen",
          tone: "warning",
          why: "Der Scan-Code wurde ersetzt, der neue QR-Code ist noch nicht gedruckt. Die Marke geht, sobald er geladen ist.",
        },
      ];
    },
    showPanel(row) {
      this.row = row;
      this.picked = null;
      this.panel = true;
    },
    onQr(row) {
      this.showPanel(row);
    },
    onMore(row, action) {
      if (action.key === "svg" || action.key === "png")
        return download(row, null, action.key);
      if (action.key === "rotate") return this.askRotate(row, null, false);
      if (action.key === "rotate-all") return this.askRotate(row, null, true);
      stub(`Stub: „${action.text.replace(" …", "")}“ für „${row.label}“.`);
    },
    askRotate(row, fach, all) {
      this.confirmRow = row;
      this.confirmFach = fach;
      this.confirmAll = all;
      this.acknowledged = false;
      this.confirmOpen = true;
    },
    doRotate() {
      if (this.confirmAll) rotateAll(this.confirmRow);
      else rotate(this.confirmRow, this.confirmFach);
      this.confirmOpen = false;
      const row = this.confirmRow;
      const fach = this.confirmFach;
      this.showPanel(row);
      if (fach) this.picked = fach.id;
    },
    pick(f) {
      this.picked = this.picked === f.id ? null : f.id;
    },
    printMain() {
      if (this.anlage) downloadSheet(this.row);
      else download(this.row, null, "pdf");
    },
    printFach(format) {
      download(this.row, this.pickedFach, format);
    },
    kindHint() {
      return isFixed(this.row)
        ? "Scannen, um Ihr Fach zu öffnen"
        : "Scannen, um die Tür zu öffnen";
    },
  },
};
</script>

<template>
  <div>
    <QrRows
      :menu-for="menuFor"
      :qr-title="qrTitle"
      :extra-marks="extraMarks"
      @qr="onQr"
      @more="onMore"
    />

    <v-navigation-drawer
      v-model="panel"
      fixed
      right
      temporary
      width="460"
      class="panel"
    >
      <div v-if="row" class="panel__inner">
        <header class="panel__head">
          <div>
            <div class="text-h6">{{ row.label }}</div>
            <div class="text-caption text--secondary">
              {{
                anlage
                  ? `Etikettenbogen · ${pages.length} ${
                      pages.length === 1 ? "Seite" : "Seiten"
                    }`
                  : "A4-Seite"
              }}
              · {{ scanRequired(row) ? "mit QR-Scan" : "ohne QR-Scan" }}
            </div>
          </div>
          <v-btn icon @click="panel = false"><v-icon>mdi-close</v-icon></v-btn>
        </header>

        <div v-if="stale" class="panel__stale">
          <v-icon small color="warning darken-2" class="mr-2"
            >mdi-printer-alert</v-icon
          >
          {{
            stale > 1
              ? `${stale} Aufkleber sind ersetzt, aber noch nicht gedruckt.`
              : "Ein Aufkleber ist ersetzt, aber noch nicht gedruckt."
          }}
        </div>

        <v-btn color="primary" depressed block class="mb-4" @click="printMain">
          <v-icon left>mdi-printer-outline</v-icon>
          {{
            anlage
              ? stale
                ? "Sammel-PDF drucken, mit den neuen"
                : "Sammel-PDF drucken"
              : stale
              ? "Neuen Aufkleber drucken (PDF)"
              : "Drucken (PDF, A4)"
          }}
        </v-btn>

        <!-- Tür und festes Fach: die A4-Seite -->
        <template v-if="!anlage">
          <div class="a4" :class="{ 'a4--stale': stale }">
            <div class="a4__label">{{ row.label }}</div>
            <FakeQr :seed="code(row, null)" :size="150" />
            <div class="a4__hint">{{ kindHint() }}</div>
            <span v-if="stale" class="tag">neu</span>
          </div>
          <div class="panel__links">
            <a @click.prevent="onMore(row, { key: 'svg' })">SVG</a> ·
            <a @click.prevent="onMore(row, { key: 'png' })">PNG</a>
            <v-spacer />
            <a class="danger" @click.prevent="askRotate(row, null, false)"
              >Rotieren …</a
            >
          </div>
        </template>

        <!-- Anlage: der Etikettenbogen je Schrank -->
        <template v-else>
          <div v-for="p in pages" :key="p.id" class="page">
            <div class="page__cap">Schrank {{ p.schrank }}</div>
            <div class="page__grid">
              <button
                v-for="f in p.faecher"
                :key="f.id"
                class="label"
                :class="{
                  'label--stale': isStale(row, f),
                  'label--picked': picked === f.id,
                }"
                @click="pick(f)"
              >
                <span class="label__top">{{ row.label }}</span>
                <span class="label__body">
                  <FakeQr :seed="code(row, f)" :size="44" />
                  <span class="label__fach">
                    <small>FACH</small>{{ f.number }}
                  </span>
                </span>
                <span v-if="f.outOfService" class="label__out"
                  >außer Betrieb</span
                >
                <span v-if="isStale(row, f)" class="tag">neu</span>
              </button>
            </div>
            <div
              v-if="pickedFach && p.faecher.includes(pickedFach)"
              class="page__strip"
            >
              <strong>Fach {{ pickedFach.number }}</strong>
              <a @click.prevent="printFach('pdf')">PDF</a>
              <a @click.prevent="printFach('svg')">SVG</a>
              <a @click.prevent="printFach('png')">PNG</a>
              <v-spacer />
              <a
                class="danger"
                @click.prevent="askRotate(row, pickedFach, false)"
                >Rotieren …</a
              >
            </div>
          </div>
          <div class="panel__links">
            <span class="text--secondary">Etikett anklicken für ein Fach</span>
            <v-spacer />
            <a class="danger" @click.prevent="askRotate(row, null, true)"
              >Alle rotieren …</a
            >
          </div>
        </template>
      </div>
    </v-navigation-drawer>

    <v-dialog v-model="confirmOpen" max-width="500">
      <v-card v-if="confirmRow">
        <v-card-title class="text-h6">
          <v-icon left color="error">mdi-alert</v-icon>
          {{ confirmAll ? "Alle Scan-Codes rotieren" : "Scan-Code rotieren" }}
        </v-card-title>
        <v-card-text>
          <p>
            Der Scan-Code {{ confirmTarget }} wird ersetzt. Gedruckte und
            angebrachte Aufkleber gelten ab sofort nicht mehr.
          </p>
          <v-alert
            dense
            text
            :color="confirmLocks ? 'error' : 'info'"
            :icon="
              confirmLocks
                ? 'mdi-lock-alert-outline'
                : 'mdi-information-outline'
            "
          >
            {{ confirmConsequence }}
          </v-alert>
          <v-checkbox
            v-model="acknowledged"
            hide-details
            class="mt-0"
            :label="
              confirmAll
                ? 'Ich drucke alle Aufkleber neu und bringe sie an.'
                : 'Ich drucke den neuen Aufkleber und bringe ihn an.'
            "
          />
          <div class="text-caption text--secondary mt-3">
            Bis der neue Code geladen ist, trägt die Zeile die Marke „Aufkleber
            tauschen“.
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn text @click="confirmOpen = false">Abbrechen</v-btn>
          <v-btn
            color="error"
            depressed
            :disabled="!acknowledged"
            @click="doRotate"
          >
            {{ confirmAll ? `${confirmCount} rotieren` : "Rotieren" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.panel__inner {
  padding: 16px 20px 24px;
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel__stale {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: var(--scb-radius-surface);
  background: var(--scb-warning-tint);
  color: var(--v-warning-darken2);
  font-size: var(--scb-font-size-sm);
}

.panel__links {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: var(--scb-font-size-sm);
}

.danger {
  color: var(--v-error-base) !important;
}

.a4 {
  position: relative;
  width: 240px;
  aspect-ratio: 210 / 297;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  color: #111;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.a4--stale {
  outline: 2px dashed var(--v-warning-base);
  outline-offset: 3px;
}

.a4__label {
  font-weight: 700;
  font-size: 15px;
  text-align: center;
}

.a4__hint {
  font-size: 11px;
}

.page {
  margin-bottom: 14px;
}

.page__cap {
  font-size: var(--scb-font-size-caption);
  color: var(--scb-text-muted);
  margin-bottom: 4px;
}

.page__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.label {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px dashed #d0d0d0;
  text-align: left;
  color: #111;
  background: #fff;
}

.label:hover {
  background: #fafafa;
}

.label--picked {
  outline: 2px solid var(--v-primary-base);
  outline-offset: -2px;
  z-index: 1;
}

.label--stale {
  background: #fff8e1;
}

.label__top {
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #ddd;
  padding-bottom: 2px;
}

.label__body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label__fach {
  display: flex;
  flex-direction: column;
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.label__fach small {
  font-size: 8px;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.label__out {
  font-size: 9px;
  color: #b26a00;
}

.tag {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--v-warning-base);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
}

.page__strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border: 1px solid var(--scb-rule);
  border-top: none;
  font-size: var(--scb-font-size-sm);
}
</style>
