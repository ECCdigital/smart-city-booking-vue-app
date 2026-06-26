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
      @input="onText"
    />
    <footer v-if="block.cite" class="mt-1 text-caption">— {{ block.cite }}</footer>
  </blockquote>
</template>

<script>
export default {
  name: "QuoteBlock",
  props: {
    block: { type: Object, required: true },
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
