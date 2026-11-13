<script>
/**
 * PROTOTYPE (tickets#1093) — Variante B: Tabelle je Abschnitt.
 *
 * Jeder Abschnitt ist eine kleine Tabelle mit Spaltenköpfen. Die Spalten
 * hängen vom Anbieter ab: Türen haben QR-Scan und Standort, Salto KS dazu
 * den IQ, Open Locker die Art samt Fächern, iFBS und Pareva kein QR-Scan.
 * Jede Angabe steht immer da, auch wenn sie dem Standard entspricht.
 *
 * Oben eine Leiste mit Suche und Filtern: Anbieter (mehrere), „ohne
 * Buchungsobjekt“, „mit Hinweis“. Ein Abschnitt zeigt 8 Zeilen, dann
 * „Weitere zeigen“. Abschnitte ohne Treffer verschwinden ganz.
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
  hasQr,
  qrAction,
  moreActions,
  bookableList,
  matches,
  isPaused,
} from "../rows";

const PAGE = 8;

function columnsFor(p) {
  const cols = [{ key: "label", text: "Bezeichnung" }];
  if (p.id === "open-locker") cols.push({ key: "kind", text: "Art" });
  cols.push({ key: "bookables", text: "Buchungsobjekte" });
  if (p.id === "salto-ks") cols.push({ key: "iq", text: "IQ" });
  if (p.group === "doors" || p.id === "open-locker")
    cols.push({ key: "qr", text: "QR-Scan" });
  cols.push({ key: "address", text: "Standort" });
  cols.push({ key: "actions", text: "" });
  return cols;
}

export default {
  name: "VariantB",
  components: { AssignDialog, SectionHead },
  data() {
    return {
      search: "",
      providerFilter: [],
      unassigned: false,
      withHint: false,
      expanded: {},
      assignOpen: false,
      assignAp: null,
    };
  },
  computed: {
    providers() {
      return activeProviders();
    },
    filtering() {
      return (
        !!this.search.trim() ||
        this.providerFilter.length > 0 ||
        this.unassigned ||
        this.withHint
      );
    },
    sections() {
      return this.providers
        .filter(
          (p) =>
            !this.providerFilter.length || this.providerFilter.includes(p.id)
        )
        .map((p) => {
          const all = store.accessPoints.filter((r) => r.provider === p.id);
          const rows = all.filter(
            (r) =>
              matches(r, this.search) &&
              (!this.unassigned || r.bookableIds.length === 0) &&
              (!this.withHint || r.iqActive === false || r.origin === "manual")
          );
          const open = this.expanded[p.id] || this.filtering;
          return {
            p,
            all,
            rows,
            shown: open ? rows : rows.slice(0, PAGE),
            hidden: open ? 0 : Math.max(0, rows.length - PAGE),
            cols: columnsFor(p),
          };
        })
        .filter((s) => !this.filtering || s.rows.length);
    },
    hits() {
      return this.sections.reduce((n, s) => n + s.rows.length, 0);
    },
  },
  methods: {
    kindLabel,
    qrLabel,
    hasQr,
    qrAction,
    moreActions,
    bookableList,
    isPaused,
    toggleProvider(id) {
      const i = this.providerFilter.indexOf(id);
      if (i === -1) this.providerFilter.push(id);
      else this.providerFilter.splice(i, 1);
    },
    showAll(id) {
      this.$set(this.expanded, id, true);
    },
    reset() {
      this.search = "";
      this.providerFilter = [];
      this.unassigned = false;
      this.withHint = false;
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
    <div class="filters mb-4">
      <v-text-field
        v-model="search"
        dense
        outlined
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        placeholder="Suchen"
        class="filters__search mr-3"
      />
      <span class="filters__label mr-2">Anbieter</span>
      <v-chip
        v-for="p in providers"
        :key="p.id"
        small
        class="mr-1"
        :outlined="!providerFilter.includes(p.id)"
        :color="providerFilter.includes(p.id) ? 'primary' : undefined"
        @click="toggleProvider(p.id)"
      >
        {{ p.name }}
      </v-chip>
      <span class="filters__sep" />
      <v-chip
        small
        class="mr-1"
        :outlined="!unassigned"
        :color="unassigned ? 'primary' : undefined"
        @click="unassigned = !unassigned"
      >
        ohne Buchungsobjekt
      </v-chip>
      <v-chip
        small
        :outlined="!withHint"
        :color="withHint ? 'primary' : undefined"
        @click="withHint = !withHint"
      >
        mit Hinweis
      </v-chip>
      <template v-if="filtering">
        <span class="filters__count ml-3">{{ hits }} Treffer</span>
        <v-btn x-small text class="ml-1" @click="reset">Zurücksetzen</v-btn>
      </template>
    </div>

    <div v-if="filtering && !sections.length" class="nothing">
      Kein Zugangspunkt passt zu Suche und Filter.
    </div>

    <section
      v-for="s in sections"
      :key="s.p.id"
      class="system mb-4"
      :class="{ 'system--paused': isPaused(s.p.id) }"
    >
      <SectionHead :provider="s.p" :count="s.all.length" />

      <v-simple-table dense class="table">
        <thead>
          <tr>
            <th v-for="c in s.cols" :key="c.key" :class="`col--${c.key}`">
              {{ c.text }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in s.shown" :key="row.id">
            <td v-for="c in s.cols" :key="c.key" :class="`col--${c.key}`">
              <template v-if="c.key === 'label'">
                <div class="cell__label">{{ row.label }}</div>
                <div class="cell__sub">
                  {{ row.externalId || "–" }}
                  <span v-if="row.origin === 'manual'"> · von Hand</span>
                </div>
              </template>

              <template v-else-if="c.key === 'kind'">
                {{ kindLabel(row) }}
              </template>

              <template v-else-if="c.key === 'bookables'">
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
                <a v-else class="assign-link" @click="openAssign(row)">
                  Zuordnen
                </a>
              </template>

              <template v-else-if="c.key === 'iq'">
                <span v-if="row.iqActive" class="cell__ok">aktiviert</span>
                <span v-else class="cell__warn">nicht aktiviert</span>
              </template>

              <template v-else-if="c.key === 'qr'">
                <span :class="row.qrRequired ? '' : 'cell__muted'">{{
                  qrLabel(row)
                }}</span>
              </template>

              <template v-else-if="c.key === 'address'">
                <span v-if="row.address">{{ row.address }}</span>
                <span v-else class="cell__muted">–</span>
              </template>

              <template v-else-if="c.key === 'actions'">
                <div class="cell__actions">
                  <v-btn
                    v-if="hasQr(row)"
                    x-small
                    text
                    color="primary"
                    :title="qrAction(row).title"
                    @click="qr(row)"
                  >
                    <v-icon left x-small>mdi-qrcode</v-icon>
                    {{ qrAction(row).text }}
                  </v-btn>
                  <v-btn x-small text @click="edit(row)">Bearbeiten</v-btn>
                  <v-menu offset-y left>
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn icon x-small v-bind="attrs" v-on="on">
                        <v-icon small>mdi-dots-horizontal</v-icon>
                      </v-btn>
                    </template>
                    <v-list dense>
                      <v-list-item
                        v-for="a in moreActions(row)"
                        :key="a.key"
                        link
                        @click="more(row, a)"
                      >
                        <v-list-item-title
                          :class="a.danger ? 'error--text' : ''"
                          >{{ a.text }}</v-list-item-title
                        >
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </v-simple-table>

      <div v-if="s.hidden" class="system__more">
        <v-btn x-small text color="primary" @click="showAll(s.p.id)">
          Weitere {{ s.hidden }} zeigen
        </v-btn>
      </div>
    </section>

    <AssignDialog v-model="assignOpen" :access-point="assignAp" />
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 0;
}

.filters__search {
  max-width: 260px;
}

.filters__label,
.filters__count {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.filters__sep {
  width: 1px;
  height: 20px;
  margin: 0 10px;
  background: var(--scb-surface-border);
}

.nothing {
  padding: 24px 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.system {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

.system--paused tbody {
  opacity: 0.55;
}

.table {
  background: transparent !important;
}

.table th {
  font-size: var(--scb-font-size-xs) !important;
  font-weight: var(--scb-font-weight-medium);
  white-space: nowrap;
}

.table td {
  font-size: var(--scb-font-size-sm) !important;
  vertical-align: middle;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

.cell__label {
  font-weight: var(--scb-font-weight-medium);
}

.cell__sub,
.cell__muted {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.cell__ok {
  color: var(--v-success-base);
}

.cell__warn {
  color: var(--v-warning-darken2);
  font-weight: var(--scb-font-weight-medium);
}

.assign-link {
  font-size: var(--scb-font-size-sm);
  color: var(--v-warning-darken2) !important;
  text-decoration: underline;
}

.col--actions {
  width: 1%;
  white-space: nowrap;
  text-align: right;
}

.cell__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.col--label {
  min-width: 200px;
}

.system__more {
  padding: 4px 8px;
  border-top: 1px solid var(--scb-rule);
}
</style>
