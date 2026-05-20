<template>
  <div class="divider-block" :class="{ selected }" :style="wrapperStyle">
    <hr :style="hrStyle" />
  </div>
</template>

<script>
export default {
  name: "DividerBlock",
  props: {
    block: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  computed: {
    wrapperStyle() {
      const py = Number.isFinite(this.block.paddingY) ? this.block.paddingY : 12;
      return { padding: `${py}px 6px` };
    },
    hrStyle() {
      const thickness = Number.isFinite(this.block.thickness)
        ? this.block.thickness
        : 1;
      const style = this.block.style === "dashed" ? "dashed" : "solid";
      return {
        border: "none",
        borderTop: `${thickness}px ${style} ${this.block.color || "#dddddd"}`,
        margin: 0,
      };
    },
  },
};
</script>

<style scoped>
.divider-block {
  background: white;
  border-radius: 4px;
}
.divider-block.selected {
  outline: 2px solid var(--v-primary-base);
}
</style>
