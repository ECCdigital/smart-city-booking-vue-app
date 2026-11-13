<script>
/**
 * PROTOTYPE (tickets#1095) — Variante A: Kurz gesagt.
 *
 * Löschen bleibt ein Dialog, aber schmal: der Titel ist die Frage, darunter
 * je Folge ein Satz mit Zahl. Namen stehen im Satz, solange es wenige sind,
 * die Liste der Buchungen klappt unter „Welche?“ auf. Ohne Folgen ein Satz.
 *
 * Fächer: Die Rückfrage kommt beim Speichern, als kleiner Dialog mit einem
 * Satz je Gruppe (läuft, zieht um), die Buchungen eingeklappt. Wer kein
 * freies Fach bekam, nennt der Dialog nach dem Speichern, wie heute.
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
  fachName,
  period,
  until,
} from "../folgen";

export default {
  name: "VariantA",
  components: { Rows, AnlageEdit },
  data() {
    return {
      del: { open: false, row: null, state: "idle", running: [], more: false },
      edit: { open: false, row: null, initial: null },
      ask: { open: false, plan: null, kept: null, more: false, after: false },
    };
  },
  computed: {
    bookables() {
      return this.del.row ? bookablesOf(this.del.row) : [];
    },
    nothing() {
      return (
        this.del.state === "done" &&
        !this.bookables.length &&
        !this.del.running.length
      );
    },
  },
  methods: {
    menuFor: moreActions,
    providerName,
    theNoun,
    names,
    period,
    until,
    fachName,
    onMore(row, action) {
      if (action.key !== "delete")
        return stub(`Stub: „${action.text.replace(" …", "")}“ (#1094).`);
      this.del = {
        open: true,
        row,
        state: "loading",
        running: [],
        more: false,
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
    openBooking(b) {
      stub(`Stub: öffnet die Buchung ${b.id}.`);
    },
    onEdit(row, initial = null) {
      this.edit = { open: true, row, initial };
    },
    onSave(kept) {
      const p = plan(this.edit.row, kept);
      if (!p.count) return this.finish(kept);
      this.ask = { open: true, plan: p, kept, more: false, after: false };
    },
    finish(kept) {
      const p = saveFaecher(this.edit.row, kept);
      this.edit.open = false;
      if (p.stranded.length) {
        this.ask = { open: true, plan: p, kept, more: true, after: true };
      } else {
        this.ask.open = false;
        stub("Anlage gespeichert.");
      }
    },
  },
};
</script>

<template>
  <div>
    <Rows :menu-for="menuFor" @more="onMore" @edit="onEdit" />

    <!-- Löschen -->
    <v-dialog v-model="del.open" max-width="480">
      <v-card v-if="del.row">
        <v-card-title class="text-h6 pb-1">
          „{{ del.row.label }}“ löschen?
        </v-card-title>
        <v-card-text class="pt-3 a-body">
          <div v-if="del.state === 'loading'" class="a-line text--secondary">
            <v-progress-circular
              indeterminate
              size="14"
              width="2"
              color="primary"
              class="mr-3"
            />
            Prüfe laufende Buchungen …
          </div>

          <div v-else-if="nothing" class="a-line">
            <v-icon small color="success" class="mr-3">mdi-check</v-icon>
            Nichts weiter betroffen: kein Buchungsobjekt, keine laufende
            Buchung.
          </div>

          <template v-else>
            <div v-if="bookables.length" class="a-line">
              <v-icon small class="mr-3">mdi-link-variant-off</v-icon>
              <span>
                <strong>{{ names(bookables) }}</strong>
                {{ bookables.length === 1 ? "verliert" : "verlieren" }}
                {{ theNoun(del.row) }}.
              </span>
            </div>

            <div v-if="del.state === 'unreadable'" class="a-line">
              <v-icon small color="warning" class="mr-3"
                >mdi-help-circle-outline</v-icon
              >
              <span class="text--secondary">
                Ob laufende Buchungen hier Zugang haben, ließ sich nicht prüfen.
              </span>
            </div>

            <div v-else-if="del.running.length" class="a-line">
              <v-icon small color="error" class="mr-3">mdi-key-alert</v-icon>
              <span>
                <strong
                  >{{ del.running.length }} laufende
                  {{ del.running.length === 1 ? "Buchung" : "Buchungen" }}</strong
                >
                {{ del.running.length === 1 ? "behält ihren" : "behalten ihren" }}
                Zugang bei {{ providerName(del.row) }}, entziehen lässt er sich
                hier danach nicht mehr.
                <a class="a-toggle" @click="del.more = !del.more">
                  {{ del.more ? "Ausblenden" : "Welche?" }}
                </a>
              </span>
            </div>
            <ul v-if="del.more && del.running.length" class="a-list">
              <li v-for="b in del.running" :key="b.id">
                {{ b.id }} · {{ b.name }}
                <span class="text--secondary">· {{ until(b) }}</span>
              </li>
            </ul>
          </template>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn text @click="del.open = false">Abbrechen</v-btn>
          <v-btn
            color="error"
            depressed
            :disabled="del.state === 'loading'"
            @click="confirmDelete"
          >
            Löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bearbeiten der Anlage -->
    <AnlageEdit
      v-model="edit.open"
      :row="edit.row"
      :initial="edit.initial"
      @save="onSave"
    />

    <!-- Rückfrage Fächer, vor und nach dem Speichern -->
    <v-dialog v-model="ask.open" max-width="480">
      <v-card v-if="ask.plan">
        <v-card-title class="text-h6 pb-1">
          <template v-if="!ask.after">
            {{ ask.plan.count }}
            {{ ask.plan.count === 1 ? "Buchung" : "Buchungen" }} an abgewählten
            Fächern
          </template>
          <template v-else>
            {{ ask.plan.stranded.length }}
            {{ ask.plan.stranded.length === 1 ? "Buchung" : "Buchungen" }}
            ohne neues Fach
          </template>
        </v-card-title>
        <v-card-text class="pt-3 a-body">
          <template v-if="!ask.after">
            <div v-if="ask.plan.running.length" class="a-line">
              <i class="a-dot a-dot--run mr-3" />
              <span>
                {{ ask.plan.running.length }} laufende
                {{ ask.plan.running.length === 1 ? "behält ihr" : "behalten ihr" }}
                Fach.
              </span>
            </div>
            <div
              v-if="ask.plan.moved.length + ask.plan.stranded.length"
              class="a-line"
            >
              <i class="a-dot a-dot--future mr-3" />
              <span>
                {{ ask.plan.moved.length + ask.plan.stranded.length }} künftige
                bekommen ein freies Fach.
                <a class="a-toggle" @click="ask.more = !ask.more">
                  {{ ask.more ? "Ausblenden" : "Welche?" }}
                </a>
              </span>
            </div>
            <ul v-if="ask.more" class="a-list">
              <li v-for="r in ask.plan.running" :key="r.booking.id">
                {{ fachName(r.fach) }} · {{ r.booking.name }}
                <span class="text--secondary">· läuft {{ until(r.booking) }}</span>
              </li>
              <li
                v-for="m in [...ask.plan.moved, ...ask.plan.stranded]"
                :key="m.booking.id"
              >
                {{ fachName(m.from) }} · {{ m.booking.name }}
                <span class="text--secondary">· {{ period(m.booking) }}</span>
              </li>
            </ul>
          </template>
          <template v-else>
            <p class="mb-2">
              Gespeichert. Für diese künftigen Buchungen war kein Fach frei, sie
              bleiben an ihrem alten Fach. Lösen Sie sie von Hand.
            </p>
            <ul class="a-list">
              <li v-for="s in ask.plan.stranded" :key="s.booking.id">
                <a @click.prevent="openBooking(s.booking)">{{ s.booking.id }}</a> ·
                {{ fachName(s.from) }} · {{ s.booking.name }}
                <span class="text--secondary">· {{ period(s.booking) }}</span>
              </li>
            </ul>
          </template>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <template v-if="!ask.after">
            <v-btn text @click="ask.open = false">Zurück</v-btn>
            <v-btn color="primary" depressed @click="finish(ask.kept)">
              Speichern
            </v-btn>
          </template>
          <v-btn v-else text @click="ask.open = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.a-body {
  font-size: var(--scb-font-size-sm);
}

.a-line {
  display: flex;
  align-items: flex-start;
  padding: 6px 0;
  line-height: 1.45;
}

.a-line .v-icon {
  margin-top: 2px;
}

.a-toggle {
  margin-left: 4px;
  white-space: nowrap;
}

.a-list {
  margin: 0 0 4px 30px;
  padding: 0;
  font-size: var(--scb-font-size-xs);
  max-height: 180px;
  overflow: auto;
}

.a-dot {
  display: inline-block;
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-top: 5px;
}

.a-dot--run {
  background: var(--v-success-base);
}

.a-dot--future {
  border: 2px solid var(--v-primary-base);
}
</style>
