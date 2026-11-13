<script>
/**
 * PROTOTYPE (tickets#1095) — Variante B: Am Ort.
 *
 * Kein Dialog für die Rückfragen. Löschen wird eine Zeile unter der Zeile,
 * wie das Ausschalten eines Schließsystems (tickets#1087): ein Satz, die
 * Namen und der lange Hinweis im Tooltip, Abbrechen und Löschen daneben.
 *
 * Fächer: Die Folgen stehen am Fach, sobald man es abwählt, und als Satz
 * unter dem Raster, wie die Hinweise am Feld aus tickets#1085. Speichern
 * fragt nicht mehr nach. Was kein freies Fach bekam, steht danach als Marke
 * an der Zeile der Anlage und als Zeile darunter, bis jemand es löst.
 */
import Rows from "../Rows.vue";
import AnlageEdit from "../AnlageEdit.vue";
import { moreActions } from "../../zeilen-je-anbieter/rows";
import { stub } from "../../zugangspunkte-fuehrung/data";
import {
  checkRunning,
  bookablesOf,
  deleteRow,
  names,
  providerName,
  theNoun,
  plan,
  saveFaecher,
  strandedAt,
  bookingsAt,
  isRunning,
  fachName,
  period,
  until,
  folgen,
} from "../folgen";

export default {
  name: "VariantB",
  components: { Rows, AnlageEdit },
  data() {
    return {
      del: { row: null, state: "idle", running: [] },
      edit: { open: false, row: null, initial: null },
      dismissed: {},
    };
  },
  computed: {
    bookables() {
      return this.del.row ? bookablesOf(this.del.row) : [];
    },
  },
  methods: {
    menuFor: moreActions,
    names,
    providerName,
    theNoun,
    fachName,
    period,
    until,
    onMore(row, action) {
      if (action.key !== "delete")
        return stub(`Stub: „${action.text.replace(" …", "")}“ (#1094).`);
      this.del = { row, state: "loading", running: [] };
      checkRunning(row)
        .then((list) => {
          if (this.del.row !== row) return;
          this.del.running = list;
          this.del.state = "done";
        })
        .catch(() => {
          if (this.del.row === row) this.del.state = "unreadable";
        });
    },
    cancelDelete() {
      this.del = { row: null, state: "idle", running: [] };
    },
    confirmDelete() {
      const label = this.del.row.label;
      deleteRow(this.del.row);
      this.cancelDelete();
      stub(`„${label}“ gelöscht.`);
    },
    rowClass(row) {
      return this.del.row === row ? "row--danger" : "";
    },
    stranded(row) {
      return this.dismissed[row.id] ? [] : strandedAt(row);
    },
    extraMarks(row) {
      const n = this.stranded(row).length;
      if (!n) return [];
      return [
        {
          key: "stranded",
          tone: "warning",
          text: `${n} ${n === 1 ? "Buchung" : "Buchungen"} ohne Fach`,
          why: "Beim Speichern war kein Fach frei. Sie stehen noch am alten Fach.",
        },
      ];
    },
    onEdit(row, initial = null) {
      this.edit = { open: true, row, initial };
    },
    markFor(fach, kept) {
      if (kept.includes(fach.id) || !fach.inAnlage) return null;
      const list = bookingsAt(fach.id);
      if (!list.length) return null;
      const run = list.filter(isRunning);
      const fut = list.length - run.length;
      const parts = [];
      if (run.length) parts.push(`läuft ${until(run[0])}, bleibt`);
      if (fut) parts.push(`${fut} ${fut === 1 ? "zieht" : "ziehen"} um`);
      return { tone: run.length ? "warning" : "info", text: parts.join(" · ") };
    },
    summary(kept) {
      const p = plan(this.edit.row, kept);
      if (!p.count) return "";
      const fut = p.moved.length + p.stranded.length;
      const out = [];
      if (p.running.length)
        out.push(
          `${p.running.length} laufende ${
            p.running.length === 1 ? "Buchung behält ihr" : "Buchungen behalten ihr"
          } Fach`
        );
      if (fut)
        out.push(
          `${fut} künftige ${
            fut === 1 ? "bekommt" : "bekommen"
          } ein freies Fach in Betrieb`
        );
      return `Beim Speichern: ${out.join(", ")}.`;
    },
    onSave(kept) {
      const row = this.edit.row;
      const p = saveFaecher(row, kept);
      this.dismissed = { ...this.dismissed, [row.id]: false };
      this.edit.open = false;
      stub(
        p.stranded.length
          ? "Anlage gespeichert, nicht jede Buchung bekam ein Fach."
          : "Anlage gespeichert."
      );
    },
    openBooking(b) {
      stub(`Stub: öffnet die Buchung ${b.id}.`);
    },
    dismiss(row) {
      this.dismissed = { ...this.dismissed, [row.id]: true };
    },
    unreadable() {
      return folgen.unreadable;
    },
  },
};
</script>

<template>
  <div>
    <Rows
      :menu-for="menuFor"
      :row-class="rowClass"
      :extra-marks="extraMarks"
      @more="onMore"
      @edit="onEdit"
    >
      <template #below="{ row }">
        <!-- Rückfrage Löschen -->
        <div v-if="del.row === row" class="b-confirm">
          <v-icon small color="error" class="mr-2">mdi-delete-outline</v-icon>
          <span class="b-confirm__text">
            <strong>Löschen?</strong>
            <template v-if="del.state === 'loading'">
              <v-progress-circular
                indeterminate
                size="12"
                width="2"
                color="primary"
                class="mx-1"
              />
              Prüfe laufende Buchungen …
            </template>
            <template v-else>
              <template v-if="bookables.length">
                {{ names(bookables, 2) }}
                {{ bookables.length === 1 ? "verliert" : "verlieren" }}
                {{ theNoun(row) }}.
              </template>
              <template v-if="del.state === 'unreadable'">
                Laufende Buchungen nicht prüfbar.
              </template>
              <v-tooltip v-else-if="del.running.length" bottom max-width="360">
                <template v-slot:activator="{ on, attrs }">
                  <span class="b-run" v-bind="attrs" v-on="on">
                    {{ del.running.length }} laufende
                    {{ del.running.length === 1 ? "Buchung behält" : "behalten" }}
                    Zugang bei {{ providerName(row) }}
                    <v-icon x-small>mdi-information-outline</v-icon>
                  </span>
                </template>
                <div>
                  Der Zugang bleibt beim Anbieter bestehen und lässt sich hier
                  danach nicht mehr entziehen.
                </div>
                <div
                  v-for="b in del.running.slice(0, 6)"
                  :key="b.id"
                  class="mt-1"
                >
                  {{ b.id }} · {{ b.name }} · {{ until(b) }}
                </div>
                <div v-if="del.running.length > 6">
                  … und {{ del.running.length - 6 }} weitere
                </div>
              </v-tooltip>
              <template v-if="!bookables.length && !del.running.length">
                <template v-if="del.state !== 'unreadable'">
                  Nichts weiter betroffen.
                </template>
              </template>
            </template>
          </span>
          <v-spacer />
          <v-btn x-small text @click="cancelDelete">Abbrechen</v-btn>
          <v-btn
            x-small
            depressed
            color="error"
            :disabled="del.state === 'loading'"
            @click="confirmDelete"
          >
            Löschen
          </v-btn>
        </div>

        <!-- Buchungen ohne Fach, nach dem Speichern -->
        <div v-if="stranded(row).length" class="b-stranded">
          <v-icon small color="warning" class="mr-2">mdi-alert-outline</v-icon>
          <span>
            Kein freies Fach für
            <template v-for="(b, i) in stranded(row)">
              <a :key="b.id" @click.prevent="openBooking(b)">{{ b.id }}</a
              ><span :key="`s-${b.id}`" class="text--secondary">
                ({{ fachName(b.fach) }}, {{ period(b) }})</span
              ><span v-if="i < stranded(row).length - 1" :key="`c-${b.id}`"
                >,
              </span>
            </template>
            . Sie bleiben am alten Fach.
          </span>
          <v-spacer />
          <v-btn x-small text @click="dismiss(row)">Ausblenden</v-btn>
        </div>
      </template>
    </Rows>

    <AnlageEdit
      v-model="edit.open"
      :row="edit.row"
      :initial="edit.initial"
      :mark-for="markFor"
      @save="onSave"
    >
      <template #below-grid="{ kept }">
        <div v-if="summary(kept)" class="b-hint">
          <v-icon small class="mr-2">mdi-information-outline</v-icon>
          <span>
            {{ summary(kept) }}
            <template v-if="unreadable()">
              Welche Buchungen betroffen sind, ließ sich nicht lesen.
            </template>
          </span>
        </div>
      </template>
    </AnlageEdit>
  </div>
</template>

<style scoped>
.b-confirm,
.b-stranded {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 16px;
  font-size: var(--scb-font-size-sm);
}

.b-confirm {
  background: rgba(229, 57, 53, 0.06);
  border-top: 1px dashed rgba(229, 57, 53, 0.4);
}

.b-confirm__text {
  line-height: 1.5;
}

.b-run {
  border-bottom: 1px dotted currentColor;
  cursor: help;
  color: var(--v-error-base);
}

.b-stranded {
  background: var(--scb-warning-tint);
}

.b-hint {
  display: flex;
  align-items: flex-start;
  margin-top: 10px;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: 1.45;
}
</style>
