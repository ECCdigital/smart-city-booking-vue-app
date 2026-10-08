<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     The floating bar to flip variants: arrows or ← →, kept in `?variant=`. -->
<template>
  <div v-if="enabled" class="proto-switcher" data-test="prototype-switcher">
    <button type="button" aria-label="Vorherige Variante" @click="step(-1)">
      ‹
    </button>
    <span class="proto-switcher__label">
      Prototyp #346 · {{ currentVariant.key }} ({{ currentVariant.name }})
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
    current: { type: String, required: true },
  },
  computed: {
    enabled() {
      return process.env.NODE_ENV !== "production";
    },
    index() {
      return this.variants.findIndex((v) => v.key === this.current);
    },
    currentVariant() {
      return this.variants[this.index] || this.variants[0];
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
      const n = this.variants.length;
      const next = this.variants[(this.index + delta + n) % n];
      this.$router.replace({
        query: { ...this.$route.query, variant: next.key },
      });
    },
    onKey(event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable ||
          el.closest("[contenteditable]"))
      ) {
        return;
      }
      this.step(event.key === "ArrowLeft" ? -1 : 1);
    },
  },
};
</script>

<style scoped>
.proto-switcher {
  position: fixed;
  bottom: 96px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  color: #fff;
  background: #111;
  border: 2px solid #ff3d7f;
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  font-size: 13px;
}
.proto-switcher button {
  width: 28px;
  height: 28px;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  border-radius: 50%;
}
.proto-switcher button:hover {
  background: #333;
}
.proto-switcher__label {
  white-space: nowrap;
}
</style>
