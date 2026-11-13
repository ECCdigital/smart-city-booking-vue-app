<script>
/**
 * PROTOTYPE (tickets#1093) — Variante C: Zeile klappt auf, kein Menü „…“.
 *
 * Die Zeile trägt nur Bezeichnung, Buchungsobjekte, QR-Code und Bearbeiten.
 * Was zu tun ist, steht als Punkt vor der Bezeichnung. Ein Klick auf die
 * Zeile klappt sie auf: alle Angaben als Fakten und die seltenen Aktionen
 * als Text-Knöpfe. Ein Menü „…“ gibt es nicht.
 *
 * Die Suche erscheint erst ab 15 Zugangspunkten, rechts oben. Ein langer
 * Abschnitt zeigt zuerst 5 Zeilen, zugeordnete zuletzt, darunter „Alle 16
 * Türen zeigen“. Während der Suche zeigt jeder Abschnitt alle Treffer, und
 * Abschnitte ohne Treffer klappen auf ihren Kopf zu.
 */
import {
  store,
  activeProviders,
  stub,
} from "../../zugangspunkte-fuehrung/data";
import AssignDialog from "../../zugangspunkte-fuehrung/AssignDialog.vue";
import SectionHead from "../SectionHead.vue";
import {
  kindLabel,
  qrLabel,
  deviations,
  hasQr,
  qrAction,
  moreActions,
  bookableList,
  matches,
  isPaused,
  needsAction,
} from "../rows";

const SEARCH_FROM = 15;
const SHORT = 5;

export default {
  name: "VariantC",
  components: { AssignDialog, SectionHead },
  data() {
    return {
      search: "",
      open: null,
      expanded: {},
      assignOpen: false,
      assignAp: null,
    };
  },
  computed: {
    total() {
      return store.accessPoints.length;
    },
    searchable() {
      return this.total >= SEARCH_FROM;
    },
    searching() {
      return !!this.search.trim();
    },
    sections() {
      return activeProviders().map((p) => {
        const all = store.accessPoints.filter((r) => r.provider === p.id);
        // What needs doing comes first, so a short list still shows it.
        const sorted = [...all].sort(
          (a, b) => Number(needsAction(b)) - Number(needsAction(a))
        );
        const rows = sorted.filter((r) => matches(r, this.search));
        const full = this.searching || this.expanded[p.id];
        const shown =
          full || rows.length <= SHORT + 1 ? rows : rows.slice(0, SHORT);
        return { p, all, rows, shown, hidden: rows.length - shown.length };
      });
    },
    hits() {
      return this.sections.reduce((n, s) => n + s.rows.length, 0);
    },
  },
  methods: {
    kindLabel,
    qrLabel,
    deviations,
    hasQr,
    qrAction,
    moreActions,
    bookableList,
    isPaused,
    needsAction,
    toggle(row) {
      this.open = this.open === row.id ? null : row.id;
    },
    nounPlural(p) {
      return p.group === "doors" ? "Türen" : "Zugangspunkte";
    },
    facts(row) {
      const list = [
        { k: "Art", v: kindLabel(row) },
        { k: "ID beim Anbieter", v: row.externalId || "–" },
        {
          k: "Herkunft",
          v: row.origin === "manual" ? "von Hand eingetragen" : "aus der Liste",
        },
        { k: "Standort", v: row.address || "kein Standort" },
      ];
      if (row.qrRequired !== null) list.push({ k: "QR-Scan", v: qrLabel(row) });
      if (row.iqActive !== undefined)
        list.push({
          k: "IQ",
          v: row.iqActive ? "aktiviert" : "nicht aktiviert",
        });
      return list;
    },
    openAssign(row) {
      this.assignAp = row;
      this.assignOpen = true;
    },
    qr(row) {
      stub(`Stub: ${qrAction(row).title} für „${row.label}“.`);
    },
    edit(row) {
      stub(`Stub: öffnet „${row.label}“ im Dialog zum Bearbeiten (#1085).`);
    },
    more(row, action) {
      stub(`Stub: „${action.text.replace(" …", "")}“ für „${row.label}“.`);
    },
  },
};
</script>

<template>
  <div>
    <div v-if="searchable" class="search mb-4">
      <span v-if="searching" class="search__count mr-3">
        {{ hits }} von {{ total }} Zugangspunkten
      </span>
      <v-text-field
        v-model="search"
        dense
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        placeholder="Zugangspunkt suchen"
        class="search__field"
      />
    </div>

    <section
      v-for="s in sections"
      :key="s.p.id"
      class="system mb-4"
      :class="{ 'system--paused': isPaused(s.p.id) }"
    >
      <SectionHead :provider="s.p" :count="s.all.length" />

      <div v-if="searching && !s.rows.length" class="system__none">
        Keine Treffer.
      </div>

      <div
        v-for="row in s.shown"
        :key="row.id"
        class="row"
        :class="{ 'row--open': open === row.id }"
      >
        <div class="row__line" @click="toggle(row)">
          <v-icon small class="row__chev">
            {{ open === row.id ? "mdi-chevron-down" : "mdi-chevron-right" }}
          </v-icon>
          <span
            class="row__dot"
            :class="{ 'row__dot--on': needsAction(row) }"
            :title="needsAction(row) ? 'Hier fehlt noch etwas' : ''"
          />
          <div class="row__label">
            {{ row.label }}
            <span v-if="row.kind !== 'door'" class="row__kind">
              {{ kindLabel(row) }}
            </span>
          </div>
          <div class="row__bookables" @click.stop>
            <template v-if="row.bookableIds.length">
              <v-chip
                v-for="b in bookableList(row)"
                :key="b.id"
                x-small
                class="mr-1"
                @click="openAssign(row)"
              >
                {{ b.name }}
              </v-chip>
            </template>
            <v-btn
              v-else
              x-small
              outlined
              color="warning"
              @click="openAssign(row)"
            >
              Buchungsobjekt zuordnen
            </v-btn>
          </div>
          <div class="row__actions" @click.stop>
            <v-btn
              v-if="hasQr(row)"
              icon
              small
              :title="qrAction(row).title"
              @click="qr(row)"
            >
              <v-icon small>mdi-qrcode</v-icon>
            </v-btn>
            <span v-else class="row__noqr" />
            <v-btn icon small title="Bearbeiten" @click="edit(row)">
              <v-icon small>mdi-pencil-outline</v-icon>
            </v-btn>
          </div>
        </div>

        <div v-if="open === row.id" class="row__detail">
          <div
            v-for="d in deviations(row).filter((x) => x.tone === 'warning')"
            :key="d.key"
            class="detail__warn"
          >
            <v-icon x-small color="warning" class="mr-1">mdi-alert</v-icon>
            {{ d.why }}
          </div>
          <dl class="facts">
            <template v-for="f in facts(row)">
              <dt :key="`k-${f.k}`">{{ f.k }}</dt>
              <dd :key="`v-${f.k}`">{{ f.v }}</dd>
            </template>
          </dl>
          <div class="detail__actions">
            <v-btn
              v-for="a in moreActions(row)"
              :key="a.key"
              x-small
              text
              :color="a.danger ? 'error' : 'primary'"
              @click="more(row, a)"
            >
              <v-icon left x-small>{{ a.icon }}</v-icon>
              {{ a.text }}
            </v-btn>
          </div>
        </div>
      </div>

      <div v-if="s.hidden" class="system__more">
        <v-btn
          x-small
          text
          color="primary"
          @click="$set(expanded, s.p.id, true)"
        >
          Alle {{ s.rows.length }} {{ nounPlural(s.p) }} zeigen
        </v-btn>
        <span class="system__more-hint">
          Oben steht, wo noch etwas fehlt.
        </span>
      </div>
    </section>

    <AssignDialog v-model="assignOpen" :access-point="assignAp" />
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.search__field {
  max-width: 280px;
}

.search__count {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.system {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

.system__none {
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.system--paused .row {
  opacity: 0.55;
}

.row + .row {
  border-top: 1px solid var(--scb-rule);
}

.row__line {
  display: grid;
  grid-template-columns: 20px 8px minmax(0, 5fr) minmax(0, 4fr) auto;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 6px 10px;
  cursor: pointer;
}

.row__line:hover {
  background: var(--scb-surface-tint-faint);
}

.row--open .row__line {
  background: var(--scb-surface-tint);
}

.row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.row__dot--on {
  background: var(--v-warning-base);
}

.row__label {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
}

.row__kind {
  font-weight: normal;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  margin-left: 6px;
}

.row__actions {
  display: flex;
}

.row__noqr {
  display: inline-block;
  width: 28px;
}

.row__detail {
  padding: 8px 16px 12px 48px;
  background: var(--scb-surface-tint);
}

.detail__warn {
  font-size: var(--scb-font-size-sm);
  margin-bottom: 8px;
}

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 16px;
  margin: 0 0 8px;
  font-size: var(--scb-font-size-sm);
}

.facts dt {
  color: var(--scb-text-muted);
}

.facts dd {
  margin: 0;
}

.detail__actions {
  margin-left: -8px;
}

.system__more {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-top: 1px solid var(--scb-rule);
}

.system__more-hint {
  margin-left: 8px;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

@media (max-width: 760px) {
  .row__line {
    grid-template-columns: 20px 8px 1fr auto;
  }

  .row__bookables {
    grid-column: 3 / -1;
    grid-row: 2;
  }
}
</style>
