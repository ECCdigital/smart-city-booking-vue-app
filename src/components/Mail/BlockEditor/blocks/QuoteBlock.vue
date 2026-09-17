<template>
  <blockquote class="quote-block" :class="{ selected }" :style="quoteStyle">
    <v-textarea
      :value="block.text"
      placeholder="Zitat…"
      rows="2"
      auto-grow
      dense
      hide-details
      flat
      solo
      background-color="transparent"
      ref="textField"
      @input="onText"
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
    </v-textarea>
    <ConditionalVariableAlert
      :value="block.text || ''"
      :variables="variables"
      :tenant="tenant"
    />
    <footer v-if="block.cite" class="mt-1 text-caption">— {{ block.cite }}</footer>
  </blockquote>
</template>

<script>
import MailVariablePicker from "@/components/Mail/MailVariablePicker.vue";
import ConditionalVariableAlert from "@/components/Mail/ConditionalVariableAlert.vue";
import { insertIntoField } from "@/components/Mail/fieldInsert.js";

export default {
  name: "QuoteBlock",
  components: { ConditionalVariableAlert, MailVariablePicker },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
    selected: { type: Boolean, default: false },
  },
  computed: {
    quoteStyle() {
      return {
        textAlign: this.block.align || "left",
        color: this.block.color || "#555",
        fontStyle: "italic",
      };
    },
  },
  methods: {
    onText(v) {
      this.$emit("update", { ...this.block, text: v });
    },
    insertVariable(expr) {
      insertIntoField(this.$refs.textField, expr, this.onText);
    },
  },
};
</script>

<style scoped>
.quote-block {
  padding: 8px 16px;
  margin: 0;
  border-left: 4px solid #cccccc;
  background: white;
  border-radius: 4px;
}
.quote-block.selected {
  outline: 2px solid var(--v-primary-base);
}
</style>
