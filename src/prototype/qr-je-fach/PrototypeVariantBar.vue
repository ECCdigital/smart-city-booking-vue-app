<script>
/**
 * PROTOTYPE (tickets#1049) — floating variant switcher. Throwaway, never merged.
 *
 * Deliberately loud so nobody mistakes it for part of the design under review.
 * Hidden in production builds, so a stray merge cannot ship it.
 */
export default {
  name: "PrototypeVariantBar",
  props: {
    variants: { type: Array, required: true },
    current: { type: String, required: true },
  },
  computed: {
    visible() {
      return process.env.NODE_ENV !== "production";
    },
    index() {
      const found = this.variants.findIndex((v) => v.key === this.current);
      return found === -1 ? 0 : found;
    },
    currentVariant() {
      return this.variants[this.index];
    },
  },
  methods: {
    cycle(step) {
      const next =
        (this.index + step + this.variants.length) % this.variants.length;
      this.$emit("change", this.variants[next].key);
    },
    onKey(event) {
      const el = document.activeElement;
      const tag = (el?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || el?.isContentEditable)
        return;
      if (event.key === "ArrowLeft") this.cycle(-1);
      if (event.key === "ArrowRight") this.cycle(1);
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.onKey);
  },
};
</script>

<template>
  <div v-if="visible" class="prototype-bar">
    <v-btn icon dark small @click="cycle(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <div class="prototype-bar__label">
      <span class="prototype-bar__key">{{ currentVariant.key }}</span>
      <span class="prototype-bar__name">{{ currentVariant.name }}</span>
    </div>
    <v-btn icon dark small @click="cycle(1)">
      <v-icon>mdi-chevron-right</v-icon>
    </v-btn>
  </div>
</template>

<style scoped>
.prototype-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #1b1b1f;
  color: #fff;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  font-family: monospace;
}

.prototype-bar__label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 8px;
  white-space: nowrap;
}

.prototype-bar__key {
  font-weight: 700;
  font-size: 15px;
}

.prototype-bar__name {
  font-size: 13px;
  opacity: 0.75;
}
</style>
