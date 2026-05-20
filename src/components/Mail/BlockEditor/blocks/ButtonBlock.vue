<template>
  <div
    class="button-block"
    :class="{ selected }"
    :style="{ textAlign: block.align || 'left' }"
  >
    <a :href="block.href || '#'" :style="aStyle" @click.prevent>
      {{ block.label || "Button" }}
    </a>
  </div>
</template>

<script>
export default {
  name: "ButtonBlock",
  props: {
    block: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  computed: {
    aStyle() {
      const radius = Number.isFinite(this.block.radius) ? this.block.radius : 4;
      const px = Number.isFinite(this.block.paddingX) ? this.block.paddingX : 20;
      const py = Number.isFinite(this.block.paddingY) ? this.block.paddingY : 12;
      const style = {
        display: "inline-block",
        padding: `${py}px ${px}px`,
        background: this.block.bg || "#1976d2",
        color: this.block.color || "#ffffff",
        textDecoration: "none",
        fontWeight: 600,
        borderRadius: `${radius}px`,
      };
      if (this.block.fullWidth) {
        style.width = "100%";
        style.textAlign = "center";
      }
      return style;
    },
  },
};
</script>

<style scoped>
.button-block {
  padding: 6px;
  border-radius: 4px;
  background: white;
}
.button-block.selected {
  outline: 2px solid var(--v-primary-base);
}
</style>
