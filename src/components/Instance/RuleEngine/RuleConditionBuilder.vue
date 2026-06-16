<template>
  <div>
    <div class="d-flex align-center mb-2">
      <span class="text-caption grey--text">
        Wird pro Dokument geprüft (JSON-Logic). Vergleicht Felder mit Werten.
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
      <div v-if="rows.length > 1" class="mb-2">
        <v-btn-toggle v-model="combinator" mandatory dense @change="emitChange">
          <v-btn
            v-for="opt in combinatorItems"
            :key="opt.value"
            :value="opt.value"
            small
          >
            {{ opt.text }}
          </v-btn>
        </v-btn-toggle>
        <span class="text-caption grey--text ml-2">
          Verknüpfung der Bedingungen
        </span>
      </div>

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
              @change="emitChange"
            />
          </v-col>
          <v-col cols="12" md="4">
            <RuleValueInput
              v-model="row.value"
              :type="fieldType(row.field)"
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
        Keine Bedingung – jedes geladene Dokument gilt als Treffer.
      </div>

      <v-btn small color="primary" outlined class="mt-1" @click="addRow">
        <v-icon left>mdi-plus</v-icon>
        Bedingung hinzufügen
      </v-btn>
    </template>

    <template v-else>
      <v-textarea
        v-model="rawText"
        label="conditions (JSON-Logic)"
        placeholder='{ "==": [{ "var": "isPayed" }, false] }'
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

const DEFAULT_OP_LABELS = {
  "==": "gleich",
  "!=": "ungleich",
  "===": "exakt gleich",
  "!==": "exakt ungleich",
  ">": "größer als",
  ">=": "größer/gleich",
  "<": "kleiner als",
  "<=": "kleiner/gleich",
};
const DEFAULT_COMBINATOR_LABELS = { and: "UND", or: "ODER" };

function isPrimitive(val) {
  return val === null || ["string", "number", "boolean"].includes(typeof val);
}

function isVarRef(node) {
  return (
    node &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    Object.keys(node).length === 1 &&
    typeof node.var === "string"
  );
}

export default {
  name: "RuleConditionBuilder",
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
    conditionOperators: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    const parsed = this.parse(this.value);
    return {
      mode: parsed.ok ? "builder" : "raw",
      rows: parsed.rows,
      combinator: parsed.combinator || "and",
      rawText: parsed.ok ? "" : JSON.stringify(this.value, null, 2),
      rawError: null,
    };
  },
  computed: {
    comparisonOps() {
      const fromMeta = this.conditionOperators
        .filter((o) => o.arity === 2)
        .map((o) => o.operator);
      return fromMeta.length ? fromMeta : Object.keys(DEFAULT_OP_LABELS);
    },
    combinatorOps() {
      const fromMeta = this.conditionOperators
        .filter((o) => o.arity === "n")
        .map((o) => o.operator)
        .filter((op) => op === "and" || op === "or");
      return fromMeta.length ? fromMeta : ["and", "or"];
    },
    operatorItems() {
      const metaLabels = {};
      this.conditionOperators.forEach((o) => {
        if (o.operator) metaLabels[o.operator] = o.label;
      });
      return this.comparisonOps.map((op) => ({
        text: metaLabels[op] || DEFAULT_OP_LABELS[op] || op,
        value: op,
      }));
    },
    combinatorItems() {
      const metaLabels = {};
      this.conditionOperators.forEach((o) => {
        if (o.operator) metaLabels[o.operator] = o.label;
      });
      return this.combinatorOps.map((op) => ({
        text: metaLabels[op] || DEFAULT_COMBINATOR_LABELS[op] || op,
        value: op,
      }));
    },
    fieldItems() {
      return this.fields.map((f) => ({
        text: f.label || f.name,
        value: f.name,
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
        this.combinator = parsed.combinator || "and";
      } else {
        this.mode = "raw";
        this.rawText = JSON.stringify(newVal, null, 2);
      }
    },
  },
  methods: {
    fieldType(name) {
      const field = this.fields.find((f) => f.name === name);
      return field ? field.type : "string";
    },
    parseRow(node) {
      if (!node || typeof node !== "object" || Array.isArray(node)) return null;
      const keys = Object.keys(node);
      if (keys.length !== 1) return null;
      const op = keys[0];
      if (!this.comparisonOps.includes(op)) return null;
      const operands = node[op];
      if (!Array.isArray(operands) || operands.length !== 2) return null;
      const [left, right] = operands;
      if (!isVarRef(left) || !isPrimitive(right)) return null;
      return { field: left.var, operator: op, value: right };
    },
    parse(obj) {
      if (obj === null || obj === undefined) {
        return { ok: true, rows: [], combinator: "and" };
      }
      if (typeof obj !== "object" || Array.isArray(obj)) {
        return { ok: false, rows: [] };
      }
      const keys = Object.keys(obj);
      if (keys.length !== 1) return { ok: false, rows: [] };
      const key = keys[0];

      if (this.combinatorOps.includes(key)) {
        const parts = obj[key];
        if (!Array.isArray(parts)) return { ok: false, rows: [] };
        const rows = [];
        for (const part of parts) {
          const row = this.parseRow(part);
          if (!row) return { ok: false, rows: [] };
          rows.push(row);
        }
        return { ok: true, rows, combinator: key };
      }

      const single = this.parseRow(obj);
      if (single) return { ok: true, rows: [single], combinator: "and" };
      return { ok: false, rows: [] };
    },
    build(rows, combinator) {
      const valid = rows.filter((r) => r.field && r.operator);
      if (valid.length === 0) return null;
      const exprs = valid.map((r) => ({
        [r.operator]: [{ var: r.field }, r.value],
      }));
      if (exprs.length === 1) return exprs[0];
      return { [combinator]: exprs };
    },
    currentObject() {
      if (this.mode === "raw") {
        try {
          return this.rawText.trim() ? JSON.parse(this.rawText) : null;
        } catch (e) {
          return undefined;
        }
      }
      return this.build(this.rows, this.combinator);
    },
    onFieldChange(row) {
      row.value = null;
      this.emitChange();
    },
    addRow() {
      this.rows.push({
        field: this.fields[0] ? this.fields[0].name : "",
        operator: this.comparisonOps[0] || "==",
        value: null,
      });
      this.emitChange();
    },
    removeRow(index) {
      this.rows.splice(index, 1);
      this.emitChange();
    },
    emitChange() {
      this.$emit("input", this.build(this.rows, this.combinator));
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
        this.rawText = JSON.stringify(
          this.build(this.rows, this.combinator) || {},
          null,
          2
        );
        this.rawError = null;
        this.mode = "raw";
      } else {
        const parsed = this.parse(this.currentObject());
        if (parsed.ok) {
          this.rows = parsed.rows;
          this.combinator = parsed.combinator || "and";
          this.mode = "builder";
        } else {
          this.rawError =
            "Diese Bedingung ist zu komplex für den Baukasten und kann nur als JSON bearbeitet werden.";
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
