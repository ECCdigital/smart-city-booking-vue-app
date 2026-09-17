<template>
  <div class="raw-html-block" :class="{ selected }">
    <div class="d-flex align-center mb-1">
      <v-icon x-small color="warning" class="mr-1">mdi-alert</v-icon>
      <span class="text-caption warning--text">Experten-Block (Roh-HTML)</span>
    </div>
    <v-textarea
      :value="block.html"
      placeholder="<p>HTML hier…</p>"
      rows="3"
      auto-grow
      dense
      hide-details
      filled
      class="raw-html-textarea"
      ref="htmlField"
      @input="onChange"
    >
      <template #append>
        <MailVariablePicker
          :variables="variables"
          :tenant="tenant"
          field="html"
          icon
          @insert="insertVariable"
        />
      </template>
    </v-textarea>
    <ConditionalVariableAlert
      :value="block.html || ''"
      :variables="variables"
      :tenant="tenant"
      class="mt-2"
    />
    <div class="text-caption grey--text mt-1">
      Bedingungen (<code v-pre>{{#if}}</code
      >) nicht zwischen <code>&lt;table&gt;</code>-Tags setzen.
    </div>
  </div>
</template>

<script>
import MailVariablePicker from "@/components/Mail/MailVariablePicker.vue";
import ConditionalVariableAlert from "@/components/Mail/ConditionalVariableAlert.vue";
import { insertIntoField } from "@/components/Mail/fieldInsert.js";

export default {
  name: "RawHtmlBlock",
  components: { ConditionalVariableAlert, MailVariablePicker },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
    selected: { type: Boolean, default: false },
  },
  methods: {
    onChange(v) {
      this.$emit("update", { ...this.block, html: v });
    },
    insertVariable(expr) {
      insertIntoField(this.$refs.htmlField, expr, this.onChange);
    },
  },
};
</script>

<style scoped>
.raw-html-block {
  padding: 6px;
  background: #fff8e1;
  border-radius: 4px;
}
.raw-html-block.selected {
  outline: 2px solid var(--v-primary-base);
}
.raw-html-textarea >>> textarea {
  font-family: "Courier New", monospace;
  font-size: 12px;
}
</style>
