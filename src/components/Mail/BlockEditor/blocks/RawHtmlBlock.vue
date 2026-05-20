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
      @input="onChange"
    />
  </div>
</template>

<script>
export default {
  name: "RawHtmlBlock",
  props: {
    block: { type: Object, required: true },
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
