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
      @input="onTextChange"
    />
  </div>
</template>

<script>
export default {
  name: "HeadingBlock",
  props: {
    block: { type: Object, required: true },
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
