<template>
  <div>
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="mb-4 pa-3"
      style="border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 8px"
    >
      <v-row dense align="center">
        <v-col cols="12" md="11">
          <v-select
            v-model="row.type"
            :items="actionItems"
            label="Aktionstyp"
            :hint="defFor(row.type) ? defFor(row.type).description : ''"
            persistent-hint
            hide-details="auto"
            dense
            outlined
            @change="onTypeChange(row)"
          />
        </v-col>
        <v-col cols="12" md="1" class="text-center">
          <v-btn icon color="red" @click="removeAction(index)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-col>
      </v-row>

      <div
        v-if="defFor(row.type) && defFor(row.type).aggregate"
        class="mt-1 mb-1"
      >
        <v-chip x-small color="indigo" text-color="white" label>
          <v-icon left x-small>mdi-account-multiple</v-icon>
          Sammel-E-Mail: eine Mail pro Mandant
        </v-chip>
      </div>

      <template v-if="defFor(row.type) && defFor(row.type).params.length">
        <v-divider class="my-2" />
        <v-row dense>
          <v-col
            v-for="param in defFor(row.type).params"
            :key="param.name"
            cols="12"
            md="6"
            class="mb-2"
          >
            <RuleValueInput
              :value="row.params[param.name]"
              :type="param.type"
              :label="paramLabel(param)"
              :hint="param.note || ''"
              :persistent-hint="!!param.note"
              :placeholders="param.name === 'to' ? placeholders : []"
              @input="onParamInput(row, param, $event)"
            />
          </v-col>
        </v-row>
      </template>

      <template v-else-if="row.type">
        <v-divider class="my-2" />
        <v-textarea
          v-model="row.paramsText"
          label="Parameter (JSON)"
          placeholder='{ "reason": "inaktiv" }'
          rows="2"
          auto-grow
          dense
          outlined
          hide-details="auto"
          :error-messages="row.error ? [row.error] : []"
          @input="onRawParamsInput(row)"
        />
      </template>
    </div>

    <div
      v-if="rows.length === 0"
      class="font-italic text-center grey--text pa-4"
    >
      <v-icon color="grey">mdi-flash-off</v-icon>
      Keine Aktionen definiert.
    </div>

    <v-btn small color="primary" outlined class="mt-2" @click="addAction">
      <v-icon left>mdi-plus</v-icon>
      Aktion hinzufügen
    </v-btn>
  </div>
</template>

<script>
import RuleValueInput from "@/components/Instance/RuleEngine/RuleValueInput.vue";

export default {
  name: "RuleActionsEditor",
  components: { RuleValueInput },
  props: {
    value: {
      type: Array,
      default: () => [],
    },
    actionDefs: {
      type: Array,
      default: () => [],
    },
    allowedActions: {
      type: Array,
      default: () => [],
    },
    placeholders: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      rows: this.fromValue(this.value),
    };
  },
  computed: {
    actionItems() {
      if (this.actionDefs.length) {
        return this.actionDefs.map((d) => ({
          text: d.label || d.type,
          value: d.type,
        }));
      }
      return this.allowedActions.map((a) => ({ text: a, value: a }));
    },
  },
  watch: {
    value(newVal) {
      if (JSON.stringify(this.toValue()) !== JSON.stringify(newVal)) {
        this.rows = this.fromValue(newVal);
      }
    },
  },
  methods: {
    defFor(type) {
      return this.actionDefs.find((d) => d.type === type) || null;
    },
    paramLabel(param) {
      return param.required ? `${param.label} *` : param.label;
    },
    fromValue(value) {
      return (value || []).map((action) => ({
        type: action.type || "",
        params: { ...(action.params || {}) },
        paramsText:
          action.params && Object.keys(action.params).length
            ? JSON.stringify(action.params, null, 2)
            : "",
        error: null,
      }));
    },
    toValue() {
      return this.rows.map((row) => {
        if (this.defFor(row.type) || !row.type) {
          return { type: row.type, params: this.cleanParams(row.params) };
        }
        return { type: row.type, params: this.parseRaw(row.paramsText) || {} };
      });
    },
    cleanParams(params) {
      const out = {};
      Object.entries(params || {}).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== "") {
          out[key] = val;
        }
      });
      return out;
    },
    parseRaw(text) {
      if (!text || !text.trim()) return {};
      try {
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    },
    onTypeChange(row) {
      row.params = {};
      row.paramsText = "";
      row.error = null;
      this.emitChange();
    },
    onParamInput(row, param, value) {
      this.$set(row.params, param.name, value);
      this.emitChange();
    },
    onRawParamsInput(row) {
      if (!row.paramsText || !row.paramsText.trim()) {
        row.error = null;
      } else if (this.parseRaw(row.paramsText) === null) {
        row.error = "Ungültiges JSON";
      } else {
        row.error = null;
      }
      this.emitChange();
    },
    addAction() {
      const firstType =
        (this.actionDefs[0] && this.actionDefs[0].type) ||
        this.allowedActions[0] ||
        "";
      this.rows.push({
        type: firstType,
        params: {},
        paramsText: "",
        error: null,
      });
      this.emitChange();
    },
    removeAction(index) {
      this.rows.splice(index, 1);
      this.emitChange();
    },
    emitChange() {
      this.$emit("input", this.toValue());
    },
    isValid() {
      return this.rows.every((row) => {
        if (row.error) return false;
        const def = this.defFor(row.type);
        if (!def) return true;
        return def.params
          .filter((p) => p.required)
          .every((p) => {
            const val = row.params[p.name];
            return val !== null && val !== undefined && val !== "";
          });
      });
    },
  },
};
</script>
