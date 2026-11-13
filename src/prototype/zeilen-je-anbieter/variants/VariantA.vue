<script>
/**
 * PROTOTYPE (tickets#1093) — Variante A: Schlanke Zeile, Seltenes im Menü.
 *
 * Eine Zeile je Zugangspunkt: Bezeichnung, darunter klein ID und Standort,
 * Buchungsobjekte als Chips, sichtbar QR-Code und Bearbeiten. Was vom
 * Standard des Anbieters abweicht, steht als kleine Marke an der Bezeichnung
 * („ohne QR-Scan“, „von Hand“, „IQ nicht aktiviert“), sonst nichts. Alles
 * Seltene liegt im Menü „…“.
 *
 * Eine Suche über alle Abschnitte. Abschnitte ohne Treffer schrumpfen auf
 * ihren Kopf. Kein Filter nach Typ: Den Typ trägt der Abschnitt. Alle Zeilen
 * stehen da, ohne Blättern.
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
  deviations,
  hasQr,
  qrAction,
  moreActions,
  bookableList,
  matches,
  isPaused,
  needsAction,
} from "../rows";

export default {
  name: "VariantA",
  components: { AssignDialog, SectionHead },
  data() {
    return {
      search: "",
      onlyOpen: false,
      assignOpen: false,
      assignAp: null,
    };
  },
  computed: {
    total() {
      return store.accessPoints.length;
    },
    filtering() {
      return !!this.search.trim() || this.onlyOpen;
    },
    sections() {
      return activeProviders().map((p) => {
        const all = store.accessPoints.filter((r) => r.provider === p.id);
        const rows = all.filter(
          (r) => matches(r, this.search) && (!this.onlyOpen || needsAction(r))
        );
        return { p, all, rows };
      });
    },
    hits() {
      return this.sections.reduce((n, s) => n + s.rows.length, 0);
    },
    openCount() {
      return store.accessPoints.filter(needsAction).length;
    },
  },
  methods: {
    kindLabel,
    deviations,
    hasQr,
    qrAction,
    moreActions,
    bookableList,
    isPaused,
    meta(row) {
      return [
        row.kind === "door" ? null : kindLabel(row),
        row.externalId,
        row.address,
      ]
        .filter(Boolean)
        .join(" · ");
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
    <div class="tools mb-4">
      <v-text-field
        v-model="search"
        dense
        outlined
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        placeholder="Bezeichnung, ID, Standort oder Buchungsobjekt"
        class="tools__search"
      />
      <v-chip
        small
        :outlined="!onlyOpen"
        :color="onlyOpen ? 'warning' : undefined"
        class="ml-3"
        @click="onlyOpen = !onlyOpen"
      >
        <v-icon left x-small>mdi-alert-circle-outline</v-icon>
        Offen ({{ openCount }})
      </v-chip>
      <span v-if="filtering" class="tools__count ml-3">
        {{ hits }} von {{ total }}
      </span>
    </div>

    <section
      v-for="s in sections"
      :key="s.p.id"
      class="system mb-4"
      :class="{ 'system--paused': isPaused(s.p.id) }"
    >
      <SectionHead :provider="s.p" :count="s.all.length" />

      <div v-if="filtering && !s.rows.length" class="system__none">
        Keine Treffer bei {{ s.p.name }}.
      </div>

      <div v-for="row in s.rows" :key="row.id" class="row">
        <div class="row__main">
          <div class="row__label">
            {{ row.label }}
            <v-tooltip v-for="d in deviations(row)" :key="d.key" bottom>
              <template v-slot:activator="{ on, attrs }">
                <span
                  class="mark"
                  :class="`mark--${d.tone}`"
                  v-bind="attrs"
                  v-on="on"
                  >{{ d.text }}</span
                >
              </template>
              <span>{{ d.why }}</span>
            </v-tooltip>
          </div>
          <div class="row__meta">{{ meta(row) }}</div>
        </div>

        <div class="row__bookables">
          <template v-if="row.bookableIds.length">
            <v-chip
              v-for="b in bookableList(row)"
              :key="b.id"
              x-small
              class="mr-1 mb-1"
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
            <v-icon left x-small>mdi-link-variant</v-icon>
            Buchungsobjekt zuordnen
          </v-btn>
        </div>

        <div class="row__actions">
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
          <v-menu offset-y left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                small
                title="Weitere Aktionen"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon small>mdi-dots-horizontal</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <template v-for="(a, i) in moreActions(row)">
                <v-divider v-if="a.danger && i > 0" :key="`d-${a.key}`" />
                <v-list-item :key="a.key" link @click="more(row, a)">
                  <v-list-item-icon>
                    <v-icon small :color="a.danger ? 'error' : undefined">
                      {{ a.icon }}
                    </v-icon>
                  </v-list-item-icon>
                  <v-list-item-title>{{ a.text }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-list>
          </v-menu>
        </div>
      </div>
    </section>

    <AssignDialog v-model="assignOpen" :access-point="assignAp" />
  </div>
</template>

<style scoped>
.tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 0;
}

.tools__search {
  max-width: 420px;
}

.tools__count {
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

.row {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) auto;
  align-items: center;
  gap: 16px;
  padding: 8px 8px 8px 16px;
}

.row + .row {
  border-top: 1px solid var(--scb-rule);
}

.row:hover {
  background: var(--scb-surface-tint-faint);
}

.row__label {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
}

.row__meta {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mark {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: var(--scb-radius-badge);
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-medium);
  line-height: 16px;
  vertical-align: 1px;
  cursor: default;
}

.mark--neutral {
  border: 1px solid var(--scb-surface-border);
  color: var(--scb-text-muted);
}

.mark--warning {
  background: var(--scb-warning-tint);
  color: var(--v-warning-darken2);
}

.row__actions {
  display: flex;
  align-items: center;
}

.row__noqr {
  display: inline-block;
  width: 28px;
}

@media (max-width: 760px) {
  .row {
    grid-template-columns: 1fr auto;
  }

  .row__bookables {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
