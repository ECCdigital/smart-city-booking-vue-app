<script>
/**
 * PROTOTYPE (tickets#1095) — the rows as decided in tickets#1093 (Variante A),
 * copied from tickets#1094. Fixed here, the same in all variants. Bearbeiten
 * and the menu „…“ go to the variant (`edit`, `more`); a variant may put a
 * line under a row (`below` slot) and marks on it (`extraMarks`).
 */
import { store, activeProviders, stub } from "../zugangspunkte-fuehrung/data";
import SectionHead from "../zeilen-je-anbieter/SectionHead.vue";
import {
  kindLabel,
  deviations,
  hasQr,
  bookableList,
} from "../zeilen-je-anbieter/rows";

export default {
  name: "FolgenRows",
  components: { SectionHead },
  props: {
    menuFor: { type: Function, required: true },
    qrTitle: { type: Function, default: () => "QR-Code drucken (PDF, A4)" },
    rowClass: { type: Function, default: () => "" },
    extraMarks: { type: Function, default: () => [] },
  },
  computed: {
    sections() {
      return activeProviders().map((p) => ({
        p,
        rows: store.accessPoints.filter((r) => r.provider === p.id),
      }));
    },
  },
  methods: {
    hasQr,
    bookableList,
    marks(row) {
      return [...deviations(row), ...this.extraMarks(row)];
    },
    meta(row) {
      return [
        row.kind === "door" ? null : kindLabel(row),
        row.externalId,
        row.address,
      ]
        .filter(Boolean)
        .join(" · ");
    },
    edit(row) {
      if (row.lockerType === "locker" && row.provider === "open-locker")
        return this.$emit("edit", row);
      stub(`Stub: öffnet „${row.label}“ im Dialog zum Bearbeiten (#1085).`);
    },
    qr(row) {
      stub(`Stub: QR-Code von „${row.label}“ (#1094).`);
    },
  },
};
</script>

<template>
  <div>
    <section v-for="s in sections" :key="s.p.id" class="system mb-4">
      <SectionHead :provider="s.p" :count="s.rows.length" />

      <template v-for="row in s.rows">
      <div :key="row.id" class="row" :class="rowClass(row)">
        <div class="row__main">
          <div class="row__label">
            {{ row.label }}
            <v-tooltip v-for="d in marks(row)" :key="d.key" bottom>
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
          <v-chip
            v-for="b in bookableList(row)"
            :key="b.id"
            x-small
            class="mr-1 mb-1"
          >
            {{ b.name }}
          </v-chip>
        </div>

        <div class="row__actions">
          <v-btn
            v-if="hasQr(row)"
            icon
            small
            :title="qrTitle(row)"
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
              <template v-for="(a, i) in menuFor(row)">
                <v-divider v-if="a.danger && i > 0" :key="`d-${a.key}`" />
                <v-list-item :key="a.key" link @click="$emit('more', row, a)">
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
      <div v-if="$scopedSlots.below" :key="`below-${row.id}`" class="below">
        <slot name="below" :row="row" />
      </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.system {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) auto;
  align-items: center;
  gap: 16px;
  padding: 8px 8px 8px 16px;
}

.row + .row,
.below + .row {
  border-top: 1px solid var(--scb-rule);
}

.below:empty {
  display: none;
}

.row--danger {
  background: rgba(229, 57, 53, 0.06);
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
</style>
