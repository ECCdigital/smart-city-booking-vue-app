<template>
  <div>
    <v-select
      v-if="type === 'boolean'"
      :value="value"
      :items="boolItems"
      :label="label"
      :hint="hint"
      :persistent-hint="persistentHint"
      :dense="dense"
      :hide-details="hideDetails"
      outlined
      @change="$emit('input', $event)"
    />

    <v-text-field
      v-else-if="type === 'number'"
      :value="value"
      type="number"
      :label="label"
      :hint="hint"
      :persistent-hint="persistentHint"
      :dense="dense"
      :hide-details="hideDetails"
      outlined
      @input="onNumber"
    />

    <div v-else-if="type === 'datetime'">
      <v-select
        v-if="placeholders.length"
        :value="dtMode"
        :items="dtModeItems"
        :label="label || 'Zeitpunkt'"
        :dense="dense"
        hide-details="auto"
        outlined
        class="mb-2"
        @change="onDtMode"
      />

      <v-text-field
        v-if="dtMode === 'fixed'"
        :value="dtLocal"
        type="datetime-local"
        :label="placeholders.length ? 'Fester Zeitpunkt' : label"
        :hint="hint"
        :persistent-hint="persistentHint"
        :dense="dense"
        :hide-details="hideDetails"
        outlined
        @input="onDateTime"
      />

      <v-row v-else-if="isObjectMode" dense>
        <v-col cols="6">
          <v-text-field
            :value="relAmount"
            type="number"
            min="0"
            label="Anzahl"
            :dense="dense"
            hide-details="auto"
            outlined
            @input="onRelAmount"
          />
        </v-col>
        <v-col cols="6">
          <v-select
            :value="relUnit"
            :items="unitItems"
            label="Einheit"
            :dense="dense"
            hide-details="auto"
            outlined
            @change="onRelUnit"
          />
        </v-col>
      </v-row>
    </div>

    <v-textarea
      v-else-if="type === 'text'"
      :value="value"
      :label="label"
      :hint="hint"
      :persistent-hint="persistentHint"
      rows="2"
      auto-grow
      :dense="dense"
      :hide-details="hideDetails"
      outlined
      @input="$emit('input', $event)"
    />

    <v-text-field
      v-else
      :value="value"
      :label="label"
      :hint="hint"
      :persistent-hint="persistentHint"
      :dense="dense"
      :hide-details="hideDetails"
      outlined
      @input="$emit('input', $event)"
    />
  </div>
</template>

<script>
const UNIT_LABELS = {
  second: "Sekunden",
  minute: "Minuten",
  hour: "Stunden",
  day: "Tage",
  week: "Wochen",
  month: "Monate",
  year: "Jahre",
};

export default {
  name: "RuleValueInput",
  props: {
    value: {
      default: null,
    },
    type: {
      type: String,
      default: "string",
    },
    label: {
      type: String,
      default: "Wert",
    },
    hint: {
      type: String,
      default: "",
    },
    persistentHint: {
      type: Boolean,
      default: false,
    },
    placeholders: {
      type: Array,
      default: () => [],
    },
    dense: {
      type: Boolean,
      default: true,
    },
    hideDetails: {
      type: [Boolean, String],
      default: "auto",
    },
  },
  data() {
    return {
      boolItems: [
        { text: "Ja", value: true },
        { text: "Nein", value: false },
      ],
    };
  },
  computed: {
    dtModeItems() {
      return [
        { text: "Fester Zeitpunkt", value: "fixed" },
        ...this.placeholders.map((p) => ({ text: p.label, value: p.token })),
      ];
    },
    dtMode() {
      if (typeof this.value === "string" && this.value.startsWith("$$")) {
        return this.value;
      }
      if (
        this.value &&
        typeof this.value === "object" &&
        !Array.isArray(this.value)
      ) {
        const keys = Object.keys(this.value);
        if (keys.length === 1 && this.isObjectPlaceholder(keys[0])) {
          return keys[0];
        }
      }
      return "fixed";
    },
    isObjectMode() {
      return this.dtMode !== "fixed" && this.isObjectPlaceholder(this.dtMode);
    },
    currentPlaceholder() {
      return this.placeholders.find((p) => p.token === this.dtMode) || null;
    },
    unitItems() {
      const def = this.currentPlaceholder;
      const units = (def && def.units) || Object.keys(UNIT_LABELS);
      return units.map((u) => ({ text: UNIT_LABELS[u] || u, value: u }));
    },
    relAmount() {
      const inner = this.relInner();
      return inner ? inner.amount : this.defaultRel().amount;
    },
    relUnit() {
      const inner = this.relInner();
      return inner ? inner.unit : this.defaultRel().unit;
    },
    dtLocal() {
      if (
        this.value === null ||
        this.value === undefined ||
        this.value === "" ||
        typeof this.value === "object"
      ) {
        return "";
      }
      const ms = Number(this.value);
      if (Number.isNaN(ms)) return "";
      const d = new Date(ms);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
  },
  methods: {
    isObjectPlaceholder(token) {
      const def = this.placeholders.find((p) => p.token === token);
      return !!(def && ((def.units && def.units.length) || def.valueShape));
    },
    defaultRel() {
      const def = this.currentPlaceholder;
      const shape = (def && def.valueShape) || {};
      const units = (def && def.units) || Object.keys(UNIT_LABELS);
      return {
        unit: shape.unit || units[0] || "day",
        amount: typeof shape.amount === "number" ? shape.amount : 1,
      };
    },
    relInner() {
      if (
        this.value &&
        typeof this.value === "object" &&
        !Array.isArray(this.value) &&
        this.value[this.dtMode] &&
        typeof this.value[this.dtMode] === "object"
      ) {
        return this.value[this.dtMode];
      }
      return null;
    },
    onNumber(val) {
      if (val === "" || val === null) {
        this.$emit("input", null);
      } else {
        this.$emit("input", Number(val));
      }
    },
    onDtMode(mode) {
      if (mode === "fixed") {
        this.$emit("input", null);
      } else if (this.isObjectPlaceholder(mode)) {
        const def = this.placeholders.find((p) => p.token === mode);
        const shape = (def && def.valueShape) || {};
        const units = (def && def.units) || Object.keys(UNIT_LABELS);
        this.$emit("input", {
          [mode]: {
            unit: shape.unit || units[0] || "day",
            amount: typeof shape.amount === "number" ? shape.amount : 1,
          },
        });
      } else {
        this.$emit("input", mode);
      }
    },
    onRelAmount(val) {
      this.$emit("input", {
        [this.dtMode]: {
          unit: this.relUnit,
          amount: val === "" || val === null ? 0 : Number(val),
        },
      });
    },
    onRelUnit(val) {
      this.$emit("input", {
        [this.dtMode]: { unit: val, amount: this.relAmount },
      });
    },
    onDateTime(localStr) {
      if (!localStr) {
        this.$emit("input", null);
        return;
      }
      this.$emit("input", new Date(localStr).getTime());
    },
  },
};
</script>
