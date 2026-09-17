<template>
  <div class="heading-block" :class="{ selected }">
    <v-text-field
      :value="block.text"
      placeholder="Überschrift…"
      dense
      hide-details
      flat
      solo
      background-color="transparent"
      :style="headingStyle"
      ref="textField"
      @input="onTextChange"
    >
      <template #append>
        <MailVariablePicker
          :variables="variables"
          :tenant="tenant"
          field="line"
          icon
          @insert="insertVariable"
        />
      </template>
    </v-text-field>
    <ConditionalVariableAlert
      :value="block.text || ''"
      :variables="variables"
      :tenant="tenant"
    />
  </div>
</template>

<script>
import MailVariablePicker from "@/components/Mail/MailVariablePicker.vue";
import ConditionalVariableAlert from "@/components/Mail/ConditionalVariableAlert.vue";
import { insertIntoField } from "@/components/Mail/fieldInsert.js";

export default {
  name: "HeadingBlock",
  components: { ConditionalVariableAlert, MailVariablePicker },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
    selected: { type: Boolean, default: false },
  },
  computed: {
    headingStyle() {
      const level = Math.min(Math.max(this.block.level || 1, 1), 3);
      const sizePx = level === 1 ? 26 : level === 2 ? 22 : 18;
      return {
        color: this.block.color || "inherit",
        textAlign: this.block.align || "left",
        fontSize: `${sizePx}px`,
        fontWeight: 700,
      };
    },
  },
  methods: {
    onTextChange(val) {
      this.$emit("update", { ...this.block, text: val });
    },
    insertVariable(expr) {
      insertIntoField(this.$refs.textField, expr, this.onTextChange);
    },
  },
};
</script>

<style scoped>
.heading-block {
  padding: 4px 6px;
  border-radius: 4px;
  background: white;
}
.heading-block.selected {
  outline: 2px solid var(--v-primary-base);
}
.heading-block >>> .v-text-field__slot input {
  font-weight: 700 !important;
}
</style>
