<!-- PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
     Variant C, neu: eine Liste mit Sonderregeln. A segment bar for who may
     book; below one table of roles and people, each with „darf buchen“
     (only when access is limited) and its discount. A row lives as long as
     one of the two holds; removing it clears both. -->
<template>
  <div>
    <div class="p344-field">
      <div class="p344-question">{{ naming.who }}</div>
      <v-btn-toggle
        :value="access"
        mandatory
        dense
        color="primary"
        class="p344-segments"
        @change="setAccess"
      >
        <v-btn v-for="o in accessOptions" :key="o.value" :value="o.value" small>
          {{ o.label }}
        </v-btn>
      </v-btn-toggle>
      <div class="p344-hint">{{ naming.accessHint[access] }}</div>
    </div>

    <div v-if="showsTable" class="p344-field">
      <div class="p344-question">{{ naming.tableTitle || "Rollen und Personen" }}</div>
      <div v-if="showsDiscounts" class="p344-hint mt-0 mb-2">
        {{ naming.discountsHint }}
      </div>
      <p v-if="access === 'selected' && !hasLists" class="p344-note">
        {{ naming.selectedEmpty || "Noch niemand gewählt." }}
      </p>
      <p v-if="showsDiscounts && !paid && hasDiscountRows" class="p344-note">
        {{ naming.discountsNotPaid || "Wirkt erst mit Preis." }}
      </p>

      <table class="p344-table">
        <thead>
          <tr>
            <th>Rolle oder Person</th>
            <th v-if="access === 'selected'" class="p344-c">
              {{ naming.canBook || "darf buchen" }}
            </th>
            <th v-if="showsDiscounts">{{ naming.discounts }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.type + row.id">
            <td>
              <v-icon small class="mr-1">
                {{ row.type === "user" ? "mdi-account" : "mdi-account-group" }}
              </v-icon>
              {{ labelOf(row.type, row.id) }}
              <span class="p344-hint">
                {{ row.type === "user" ? naming.users : naming.roles }}
              </span>
            </td>
            <td v-if="access === 'selected'" class="p344-c">
              <v-simple-checkbox
                :value="row.permitted"
                @input="togglePermitted(row, $event)"
              />
            </td>
            <td v-if="showsDiscounts" class="p344-percent">
              <v-text-field
                v-if="row.discountIndex >= 0"
                :value="row.percent"
                type="number"
                min="0"
                max="100"
                suffix="%"
                outlined
                dense
                hide-details="auto"
                :error-messages="percentError(row.percent) ? [percentError(row.percent)] : []"
                :aria-label="naming.percent"
                @input="setDiscount(row.type, row.discountIndex, $event)"
              />
              <v-btn
                v-else
                x-small
                text
                color="primary"
                @click="addDiscount(row.type, row.id, 100)"
              >
                + {{ naming.percent }}
              </v-btn>
            </td>
            <td class="p344-c">
              <v-btn icon small title="Entfernen" @click="removeRow(row)">
                <v-icon small>mdi-close</v-icon>
              </v-btn>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="4" class="p344-hint">Noch niemand eingetragen.</td>
          </tr>
        </tbody>
      </table>

      <div class="p344-row mt-3">
        <v-autocomplete
          v-model="newKey"
          class="p344-row__name"
          :items="addable"
          item-text="text"
          item-value="key"
          :label="naming.add"
          outlined
          dense
          hide-details
        />
        <v-btn small text color="primary" :disabled="!newKey" @click="addRow">
          <v-icon left small>mdi-plus</v-icon>Hinzufügen
        </v-btn>
      </div>
      <div class="p344-hint">
        {{ addHint }}
      </div>
    </div>
  </div>
</template>

<script>
import permVariant from "./permVariant";
import { ID_KEY, listsPatch } from "./permShared";

export default {
  name: "PermVariantC",
  mixins: [permVariant],
  data() {
    return { newKey: null };
  },
  computed: {
    showsTable() {
      return this.access === "selected" || this.showsDiscounts;
    },
    rows() {
      const rows = [];
      const find = (type, id) =>
        rows.find((r) => r.type === type && r.id === id);
      const add = (type, id) => {
        let row = find(type, id);
        if (!row) {
          row = { type, id, permitted: false, discountIndex: -1, percent: null };
          rows.push(row);
        }
        return row;
      };
      this.roles.forEach((id) => (add("role", id).permitted = true));
      this.users.forEach((id) => (add("user", id).permitted = true));
      ["role", "user"].forEach((type) =>
        this.discountEntries(type).forEach((entry, index) => {
          const row = add(type, entry[ID_KEY[type]]);
          row.discountIndex = index;
          row.percent = entry.discountPercent;
        })
      );
      // Rows that only carry a permission while access is not limited would
      // be invisible data: they cannot exist, as applyAccess clears the lists.
      return rows;
    },
    hasDiscountRows() {
      return this.rows.some((r) => r.discountIndex >= 0);
    },
    addable() {
      const taken = this.rows.map((r) => r.type + r.id);
      return [
        ...this.roleItems.map((r) => ({
          key: `role:${r.id}`,
          text: `${r.name} · Rolle`,
        })),
        ...this.userItems.map((u) => ({
          key: `user:${u.userId}`,
          text: `${u.label} · Person`,
        })),
      ].filter((i) => !taken.includes(i.key.replace(":", "")));
    },
    addHint() {
      if (this.access === "selected" && this.showsDiscounts)
        return "Neue Einträge dürfen buchen; einen Nachlass geben Sie in der Zeile.";
      if (this.access === "selected") return "Neue Einträge dürfen buchen.";
      return "Neue Einträge bekommen 100 % Nachlass.";
    },
  },
  methods: {
    addRow() {
      const [type, id] = this.newKey.split(/:(.*)/s);
      this.newKey = null;
      if (this.access === "selected") return this.togglePermitted({ type, id }, true);
      this.addDiscount(type, id, 100);
    },
    togglePermitted(row, on) {
      const key = row.type === "user" ? "users" : "roles";
      const current = this[key].filter((id) => id !== row.id);
      this.patch(
        listsPatch(this.bookable, { [key]: on ? [...current, row.id] : current })
      );
    },
    removeRow(row) {
      const key = row.type === "user" ? "users" : "roles";
      const changes = listsPatch(this.bookable, {
        [key]: this[key].filter((id) => id !== row.id),
      });
      const discounts = this.discounts;
      const dKey = row.type === "user" ? "users" : "roles";
      changes.bookingDiscounts = {
        ...discounts,
        [dKey]: discounts[dKey].filter((e) => e[ID_KEY[row.type]] !== row.id),
      };
      this.patch(changes);
    },
  },
};
</script>

<style scoped>
.p344-segments {
  flex-wrap: wrap;
}
.p344-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--scb-font-size-sm);
}
.p344-table th {
  text-align: left;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
  padding: var(--scb-space-2);
  border-bottom: 1px solid var(--scb-rule);
}
.p344-table td {
  padding: var(--scb-space-2);
  border-bottom: 1px solid var(--scb-rule);
  vertical-align: middle;
}
.p344-c {
  text-align: center;
  width: 1%;
  white-space: nowrap;
}
.p344-percent {
  width: 140px;
}
</style>
