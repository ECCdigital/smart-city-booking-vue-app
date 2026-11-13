<script>
/**
 * PROTOTYPE (tickets#1095) — Variante C: Wer merkt es?
 *
 * Löschen bleibt ein Dialog, gegliedert nach den Betroffenen: Buchungsobjekte,
 * Buchende, Anbieter. Je eine Zeile mit einem Satz, Details aufklappbar. Hält
 * eine laufende Buchung Zugang, oder ließ sich das nicht prüfen, ist Löschen
 * erst nach einem Häkchen frei.
 *
 * Fächer: Die Rückfrage kommt beim Abwählen, am Fach selbst: ein kleines
 * Fenster nennt jede Buchung und wohin sie zieht, mit Abwählen oder Behalten.
 * Abgewählte Fächer zeigen danach ihr Ziel, Speichern fragt nicht mehr.
 * Setzt voraus, dass das Backend die Umzüge vorab nennen kann (heute
 * entscheidet es erst beim Speichern, tickets#1043).
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
  noun,
  theNoun,
  plan,
  saveFaecher,
  bookingsAt,
  fachName,
  period,
  until,
  folgen,
} from "../folgen";

export default {
  name: "VariantC",
  components: { Rows, AnlageEdit },
  data() {
    return {
      del: {
        open: false,
        row: null,
        state: "idle",
        running: [],
        open1: false,
        open2: false,
        ack: false,
      },
      edit: { open: false, row: null, initial: null },
      pop: { open: false, x: 0, y: 0, fach: null, kept: [] },
    };
  },
  computed: {
    bookables() {
      return this.del.row ? bookablesOf(this.del.row) : [];
    },
    needsAck() {
      return (
        this.del.state === "unreadable" ||
        (this.del.state === "done" && this.del.running.length > 0)
      );
    },
    popPlan() {
      if (!this.pop.fach) return null;
      const kept = this.pop.kept.filter((id) => id !== this.pop.fach.id);
      return plan(this.edit.row, kept);
    },
    popLines() {
      const p = this.popPlan;
      if (!p) return [];
      const id = this.pop.fach.id;
      return [
        ...p.running
          .filter((r) => r.fach.id === id)
          .map((r) => ({
            b: r.booking,
            tone: "run",
            text: `läuft ${until(r.booking)}, behält das Fach`,
          })),
        ...p.moved
          .filter((m) => m.from.id === id)
          .map((m) => ({
            b: m.booking,
            tone: "future",
            text: `zieht um nach ${fachName(m.to)}`,
          })),
        ...p.stranded
          .filter((s) => s.from.id === id)
          .map((s) => ({
            b: s.booking,
            tone: "stranded",
            text: "kein Fach frei, bleibt hier",
          })),
      ];
    },
  },
  methods: {
    menuFor: moreActions,
    names,
    providerName,
    noun,
    theNoun,
    fachName,
    period,
    until,
    onMore(row, action) {
      if (action.key !== "delete")
        return stub(`Stub: „${action.text.replace(" …", "")}“ (#1094).`);
      this.del = {
        open: true,
        row,
        state: "loading",
        running: [],
        open1: false,
        open2: false,
        ack: false,
      };
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
    confirmDelete() {
      const label = this.del.row.label;
      deleteRow(this.del.row);
      this.del.open = false;
      stub(`„${label}“ gelöscht.`);
    },
    onEdit(row, initial = null) {
      this.edit = { open: true, row, initial };
    },
    // Abwählen of a Fach with bookings asks at the Fach.
    intercept(fach, e, kept) {
      if (!kept.includes(fach.id) || !bookingsAt(fach.id).length) return false;
      const box = e.currentTarget.getBoundingClientRect();
      this.pop = {
        open: false,
        x: box.left,
        y: box.bottom + 4,
        fach,
        kept,
      };
      this.$nextTick(() => (this.pop.open = true));
      return true;
    },
    popConfirm() {
      this.$refs.anlage.set(this.pop.fach, false);
      this.pop.open = false;
    },
    activeFor(fach) {
      return this.pop.open && this.pop.fach === fach;
    },
    markFor(fach, kept) {
      if (kept.includes(fach.id) || !fach.inAnlage) return null;
      const p = plan(this.edit.row, kept);
      const run = p.running.filter((r) => r.fach.id === fach.id).length;
      const to = p.moved
        .filter((m) => m.from.id === fach.id)
        .map((m) => `${m.to.schrank}${m.to.number}`);
      const st = p.stranded.filter((s) => s.from.id === fach.id).length;
      if (!run && !to.length && !st) return null;
      const parts = [];
      if (run) parts.push("läuft, bleibt");
      if (to.length) parts.push(`→ ${[...new Set(to)].join(", ")}`);
      if (st) parts.push(`${st} ohne Fach`);
      return { tone: st ? "warning" : "info", text: parts.join(" · ") };
    },
    summary(kept) {
      const p = plan(this.edit.row, kept);
      return p.count ? p : null;
    },
    onSave(kept) {
      saveFaecher(this.edit.row, kept);
      this.edit.open = false;
      stub("Anlage gespeichert.");
    },
    unreadable() {
      return folgen.unreadable;
    },
  },
};
</script>

<template>
  <div>
    <Rows :menu-for="menuFor" @more="onMore" @edit="onEdit" />

    <!-- Löschen, nach Betroffenen -->
    <v-dialog v-model="del.open" max-width="540">
      <v-card v-if="del.row">
        <v-card-title class="d-block pb-1">
          <div class="text-h6">{{ noun(del.row) }} löschen</div>
          <div class="text-body-2 text--secondary">{{ del.row.label }}</div>
        </v-card-title>
        <v-card-text class="pt-3">
          <div class="c-who">
            <div class="c-who__label">Buchungsobjekte</div>
            <div class="c-who__text">
              <template v-if="bookables.length">
                {{ names(bookables) }}
                {{ bookables.length === 1 ? "verliert" : "verlieren" }}
                {{ theNoun(del.row) }}.
              </template>
              <span v-else class="text--secondary">keins zugeordnet</span>
            </div>
          </div>

          <div class="c-who">
            <div class="c-who__label">Buchende</div>
            <div class="c-who__text">
              <template v-if="del.state === 'loading'">
                <v-progress-circular
                  indeterminate
                  size="12"
                  width="2"
                  color="primary"
                  class="mr-2"
                />
                <span class="text--secondary">wird geprüft …</span>
              </template>
              <span v-else-if="del.state === 'unreadable'" class="warning--text">
                ließ sich nicht prüfen
              </span>
              <template v-else-if="del.running.length">
                {{ del.running.length }} laufende
                {{ del.running.length === 1 ? "Buchung öffnet" : "Buchungen öffnen" }}
                über Biletado nicht mehr.
                <a @click="del.open1 = !del.open1">
                  {{ del.open1 ? "Ausblenden" : "Welche?" }}
                </a>
                <ul v-if="del.open1" class="c-list">
                  <li v-for="b in del.running" :key="b.id">
                    {{ b.id }} · {{ b.name }}
                    <span class="text--secondary">· {{ until(b) }}</span>
                  </li>
                </ul>
              </template>
              <span v-else class="text--secondary">keine laufende Buchung</span>
            </div>
          </div>

          <div class="c-who">
            <div class="c-who__label">{{ providerName(del.row) }}</div>
            <div class="c-who__text">
              <template
                v-if="del.state === 'done' && del.running.length"
              >
                Erteilte Zugänge bleiben dort bestehen.
                <a @click="del.open2 = !del.open2">
                  {{ del.open2 ? "Ausblenden" : "Was heißt das?" }}
                </a>
                <div v-if="del.open2" class="text-caption mt-1">
                  Biletado widerruft sie beim Löschen nicht und kann sie danach
                  nicht mehr entziehen. Wer Zugang hat, behält ihn beim Anbieter
                  bis zum Ende der Buchung.
                </div>
              </template>
              <span v-else class="text--secondary">
                {{ theNoun(del.row) }} bleibt beim Anbieter, nur Biletado
                vergisst sie.
              </span>
            </div>
          </div>

          <v-checkbox
            v-if="needsAck"
            v-model="del.ack"
            dense
            hide-details
            class="mt-4"
            :label="
              del.state === 'unreadable'
                ? 'Trotzdem löschen, ohne die Buchungen zu kennen'
                : `Verstanden: Die Zugänge bleiben bei ${providerName(del.row)}`
            "
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn text @click="del.open = false">Abbrechen</v-btn>
          <v-btn
            color="error"
            depressed
            :disabled="del.state === 'loading' || (needsAck && !del.ack)"
            @click="confirmDelete"
          >
            Löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bearbeiten der Anlage, Rückfrage am Fach -->
    <AnlageEdit
      ref="anlage"
      v-model="edit.open"
      :row="edit.row"
      :initial="edit.initial"
      :intercept="intercept"
      :mark-for="markFor"
      :active-for="activeFor"
      @save="onSave"
    >
      <template #below-grid="{ kept }">
        <div v-if="summary(kept)" class="c-sum">
          <span v-if="summary(kept).running.length">
            <i class="c-dot c-dot--run" />
            {{ summary(kept).running.length }} laufende bleiben
          </span>
          <span v-if="summary(kept).moved.length">
            <i class="c-dot c-dot--future" />
            {{ summary(kept).moved.length }} ziehen um
          </span>
          <span v-if="summary(kept).stranded.length" class="warning--text">
            <v-icon x-small color="warning">mdi-alert</v-icon>
            {{ summary(kept).stranded.length }} ohne freies Fach, bleiben am
            alten
          </span>
        </div>
      </template>
    </AnlageEdit>

    <v-menu
      v-model="pop.open"
      :position-x="pop.x"
      :position-y="pop.y"
      absolute
      :close-on-content-click="false"
      max-width="340"
      z-index="300"
    >
      <v-card v-if="pop.fach" class="c-pop">
        <div class="c-pop__title">{{ fachName(pop.fach) }} abwählen?</div>
        <div v-if="unreadable()" class="text-caption text--secondary">
          Die Buchungen ließen sich nicht lesen. Künftige bekommen ein freies
          Fach, laufende behalten ihres.
        </div>
        <div v-for="l in popLines" :key="l.b.id" class="c-pop__line">
          <i class="c-dot" :class="`c-dot--${l.tone}`" />
          <div>
            <div>{{ l.b.name }}, {{ period(l.b) }}</div>
            <div
              class="text-caption"
              :class="l.tone === 'stranded' ? 'warning--text' : 'text--secondary'"
            >
              {{ l.text }}
            </div>
          </div>
        </div>
        <div class="d-flex mt-2">
          <v-spacer />
          <v-btn x-small text @click="pop.open = false">Behalten</v-btn>
          <v-btn x-small depressed color="primary" @click="popConfirm">
            Abwählen
          </v-btn>
        </div>
      </v-card>
    </v-menu>
  </div>
</template>

<style scoped>
.c-who {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  padding: 10px 0;
  font-size: var(--scb-font-size-sm);
  line-height: 1.45;
}

.c-who + .c-who {
  border-top: 1px solid var(--scb-rule);
}

.c-who__label {
  color: var(--scb-text-muted);
  font-weight: var(--scb-font-weight-medium);
}

.c-list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: var(--scb-font-size-xs);
  max-height: 160px;
  overflow: auto;
}

.c-sum {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 10px;
  font-size: var(--scb-font-size-xs);
}

.c-pop {
  padding: 12px 14px;
  font-size: var(--scb-font-size-sm);
}

.c-pop__title {
  font-weight: var(--scb-font-weight-medium);
  margin-bottom: 6px;
}

.c-pop__line {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  line-height: 1.35;
}

.c-dot {
  display: inline-block;
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-top: 5px;
}

.c-dot--run {
  background: var(--v-success-base);
}

.c-dot--future {
  border: 2px solid var(--v-primary-base);
}

.c-dot--stranded {
  background: var(--v-warning-base);
}
</style>
