<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86): throwaway variant switcher, never
       shipped — hidden in production builds. -->
  <div v-if="enabled" class="prototype-switcher" role="toolbar">
    <button type="button" aria-label="Vorige Variante" @click="step(-1)">
      ‹
    </button>
    <span class="prototype-switcher__label">
      {{ current }}<template v-if="names[current]">
        ({{ names[current] }})</template
      >
    </span>
    <button type="button" aria-label="Nächste Variante" @click="step(1)">
      ›
    </button>
  </div>
</template>

<script>
export default {
  name: "PrototypeSwitcher",
  props: {
    variants: { type: Array, required: true },
    names: { type: Object, default: () => ({}) },
  },
  computed: {
    enabled() {
      return process.env.NODE_ENV !== "production";
    },
    current() {
      const variant = this.$route.query.variant;
      return this.variants.includes(variant) ? variant : this.variants[0];
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    step(delta) {
      const index = this.variants.indexOf(this.current);
      const next =
        this.variants[
          (index + delta + this.variants.length) % this.variants.length
        ];
      this.$router.replace({ query: { ...this.$route.query, variant: next } });
    },
    onKey(event) {
      const target = event.target;
      if (
        target.closest &&
        target.closest("input, textarea, [contenteditable]")
      ) {
        return;
      }
      if (event.key === "ArrowLeft") this.step(-1);
      if (event.key === "ArrowRight") this.step(1);
    },
  },
};
</script>

<style scoped>
.prototype-switcher {
  position: fixed;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #ff00aa;
  color: #fff;
  font: 600 11px/1 monospace;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  opacity: 0.9;
}

.prototype-switcher button {
  border: 0;
  background: none;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
}

.prototype-switcher__label {
  white-space: nowrap;
}
</style>
