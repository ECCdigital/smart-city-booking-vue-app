<template>
  <div class="raw-html-block" :class="{ selected }">
    <div class="d-flex align-center mb-1">
      <v-icon x-small color="warning" class="mr-1">mdi-alert</v-icon>
      <span class="text-caption warning--text">Experten-Block (Roh-HTML)</span>
    </div>
    <MailVariableTextField
      :value="block.html || ''"
      multiline
      placeholder="<p>HTML hier…</p>"
      rows="3"
      auto-grow
      dense
      hide-details
      filled
      class="raw-html-textarea"
      field="html"
      :variables="variables"
      :tenant="tenant"
      @input="onChange"
    >
      <div class="text-caption grey--text mt-1">
        Bedingungen (<code v-pre>{{#if}}</code
        >) nicht zwischen <code>&lt;table&gt;</code>-Tags setzen.
      </div>
    </MailVariableTextField>
  </div>
</template>

<script>
import MailVariableTextField from "@/components/Mail/MailVariableTextField.vue";

export default {
  name: "RawHtmlBlock",
  components: { MailVariableTextField },
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
