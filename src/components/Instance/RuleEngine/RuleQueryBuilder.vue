<template>
  <div>
    <div class="d-flex align-center mb-2">
      <span class="text-caption grey--text">
        Filtert, welche Dokumente überhaupt geladen werden (MongoDB-Filter).
      </span>
      <v-spacer />
      <v-btn x-small text @click="toggleMode">
        <v-icon left x-small>
          {{
            mode === "builder" ? "mdi-code-json" : "mdi-cursor-default-click"
          }}
        </v-icon>
        {{ mode === "builder" ? "Erweitert (JSON)" : "Baukasten" }}
      </v-btn>
    </div>

    <template v-if="mode === 'builder'">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="mb-2 pa-2"
        style="border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px"
      >
        <v-row dense align="start">
          <v-col cols="12" md="4">
            <v-select
              v-model="row.field"
              :items="fieldItems"
              label="Feld"
              dense
              outlined
              hide-details="auto"
              @change="onFieldChange(row)"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="row.operator"
              :items="operatorItems"
              label="Operator"
              dense
              outlined
              hide-details="auto"
              @change="onOperatorChange(row)"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-combobox
              v-if="valueKind(row.operator) === 'array'"
              :value="row.value"
              multiple
              chips
              small-chips
              deletable-chips
              label="Werte (Enter zum Hinzufügen)"
              dense
              outlined
              hide-details="auto"
              @change="onArrayChange(row, $event)"
            />
            <RuleValueInput
              v-else
              v-model="row.value"
              :type="inputType(row)"
              :placeholders="placeholders"
              label="Wert"
              @input="emitChange"
            />
          </v-col>
          <v-col cols="12" md="1" class="text-center">
            <v-btn icon color="red" @click="removeRow(index)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <div
        v-if="rows.length === 0"
        class="font-italic text-center grey--text pa-3"
      >
        Kein Filter – es werden alle Dokumente geladen.
      </div>

      <v-btn small color="primary" outlined class="mt-1" @click="addRow">
        <v-icon left>mdi-plus</v-icon>
        Filter hinzufügen
      </v-btn>
    </template>

    <template v-else>
      <v-textarea
        v-model="rawText"
        label="query (JSON)"
        placeholder='{ "isPayed": false }'
        rows="4"
        auto-grow
        outlined
        dense
        :error-messages="rawError ? [rawError] : []"
        @input="onRawInput"
      />
    </template>
  </div>
</template>

<script>
import RuleValueInput from "@/components/Instance/RuleEngine/RuleValueInput.vue";

// Vollständiger Katalog der gängigen MongoDB-Filter-Operatoren auf Feldebene.
// "value" beschreibt, wie der Wert eingegeben wird:
//   field   -> Eingabe passend zum Feldtyp
//   array   -> Liste von Werten ($in, $nin, $all)
//   boolean -> Ja/Nein
//   number  -> Zahl
//   string  -> Freitext
const QUERY_OPERATORS = [
  { operator: "$eq", label: "ist gleich", value: "field" },
  { operator: "$ne", label: "ist ungleich", value: "field" },
  { operator: "$gt", label: "größer als", value: "field" },
  { operator: "$gte", label: "größer oder gleich", value: "field" },
  { operator: "$lt", label: "kleiner als", value: "field" },
  { operator: "$lte", label: "kleiner oder gleich", value: "field" },
  { operator: "$in", label: "ist eine von (Liste)", value: "array" },
  { operator: "$nin", label: "ist keine von (Liste)", value: "array" },
  { operator: "$all", label: "enthält alle (Liste)", value: "array" },
  { operator: "$exists", label: "Feld ist vorhanden", value: "boolean" },
  { operator: "$regex", label: "entspricht Regex", value: "string" },
  { operator: "$size", label: "Array-Größe ist", value: "number" },
  { operator: "$type", label: "hat BSON-Typ", value: "string" },
];

function isPrimitive(val) {
  return val === null || ["string", "number", "boolean"].includes(typeof val);
}

export default {
  name: "RuleQueryBuilder",
  components: { RuleValueInput },
  props: {
    value: {
      type: Object,
      default: null,
    },
    fields: {
      type: Array,
      default: () => [],
    },
    queryOperators: {
      type: Array,
      default: () => [],
    },
    placeholders: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    const parsed = this.parse(this.value);
    return {
      mode: parsed.ok ? "builder" : "raw",
      rows: parsed.rows,
      rawText: parsed.ok ? "" : JSON.stringify(this.value, null, 2),
      rawError: null,
    };
  },
  computed: {
    fieldItems() {
      return this.fields.map((f) => ({
        text: f.label || f.name,
        value: f.name,
      }));
    },
    operatorItems() {
      // Server-seitige Labels (falls vorhanden) haben Vorrang.
      const metaLabels = {};
      this.queryOperators.forEach((op) => {
        if (op.operator) metaLabels[op.operator] = op.label;
      });
      return QUERY_OPERATORS.map((op) => ({
        text: metaLabels[op.operator] || op.label,
        value: op.operator,
      }));
    },
  },
  watch: {
    value(newVal) {
      if (JSON.stringify(newVal) === JSON.stringify(this.currentObject())) {
        return;
      }
      const parsed = this.parse(newVal);
      if (parsed.ok) {
        this.mode = "builder";
        this.rows = parsed.rows;
      } else {
        this.mode = "raw";
        this.rawText = JSON.stringify(newVal, null, 2);
      }
    },
  },
  methods: {
    operatorDef(op) {
      return QUERY_OPERATORS.find((o) => o.operator === op) || null;
    },
    valueKind(op) {
      const def = this.operatorDef(op);
      return def ? def.value : "field";
    },
    fieldType(name) {
      const field = this.fields.find((f) => f.name === name);
      return field ? field.type : "string";
    },
    inputType(row) {
      const kind = this.valueKind(row.operator);
      if (kind === "field") return this.fieldType(row.field);
      return kind;
    },
    coerce(val, fieldType) {
      if (typeof val !== "string") return val;
      if (fieldType === "number") {
        const n = Number(val);
        return Number.isNaN(n) ? val : n;
      }
      if (fieldType === "boolean") {
        if (val === "true") return true;
        if (val === "false") return false;
      }
      return val;
    },
    parse(obj) {
      if (obj === null || obj === undefined) return { ok: true, rows: [] };
      if (typeof obj !== "object" || Array.isArray(obj)) {
        return { ok: false, rows: [] };
      }
      const rows = [];
      for (const [key, val] of Object.entries(obj)) {
        if (isPrimitive(val)) {
          rows.push({ field: key, operator: "$eq", value: val });
        } else if (val && typeof val === "object" && !Array.isArray(val)) {
          const entries = Object.entries(val);
          for (const [op, v] of entries) {
            if (!this.operatorDef(op)) {
              return { ok: false, rows: [] };
            }
            rows.push({ field: key, operator: op, value: v });
          }
        } else {
          return { ok: false, rows: [] };
        }
      }
      return { ok: true, rows };
    },
    build(rows) {
      const out = {};
      rows.forEach((row) => {
        if (!row.field) return;
        if (row.operator === "$eq") {
          out[row.field] = row.value;
        } else {
          const existing =
            out[row.field] && typeof out[row.field] === "object"
              ? out[row.field]
              : {};
          out[row.field] = { ...existing, [row.operator]: row.value };
        }
      });
      return Object.keys(out).length ? out : null;
    },
    currentObject() {
      if (this.mode === "raw") {
        try {
          return this.rawText.trim() ? JSON.parse(this.rawText) : null;
        } catch (e) {
          return undefined;
        }
      }
      return this.build(this.rows);
    },
    onFieldChange(row) {
      row.value = this.valueKind(row.operator) === "array" ? [] : null;
      this.emitChange();
    },
    onOperatorChange(row) {
      row.value = this.valueKind(row.operator) === "array" ? [] : null;
      this.emitChange();
    },
    onArrayChange(row, values) {
      const fieldType = this.fieldType(row.field);
      row.value = (values || []).map((v) => this.coerce(v, fieldType));
      this.emitChange();
    },
    addRow() {
      this.rows.push({
        field: this.fields[0] ? this.fields[0].name : "",
        operator: "$eq",
        value: null,
      });
      this.emitChange();
    },
    removeRow(index) {
      this.rows.splice(index, 1);
      this.emitChange();
    },
    emitChange() {
      this.$emit("input", this.build(this.rows));
    },
    onRawInput() {
      if (!this.rawText.trim()) {
        this.rawError = null;
        this.$emit("input", null);
        return;
      }
      try {
        const parsed = JSON.parse(this.rawText);
        this.rawError = null;
        this.$emit("input", parsed);
      } catch (e) {
        this.rawError = "Ungültiges JSON";
      }
    },
    toggleMode() {
      if (this.mode === "builder") {
        this.rawText = JSON.stringify(this.build(this.rows) || {}, null, 2);
        this.rawError = null;
        this.mode = "raw";
      } else {
        const parsed = this.parse(this.currentObject());
        if (parsed.ok) {
          this.rows = parsed.rows;
          this.mode = "builder";
        } else {
          this.rawError =
            "Dieser Filter ist zu komplex für den Baukasten und kann nur als JSON bearbeitet werden.";
        }
      }
    },
    isValid() {
      if (this.mode === "raw") {
        return this.rawError === null;
      }
      return true;
    },
  },
};
</script>
