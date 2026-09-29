<template>
  <!-- PROTOTYPE (ECCdigital/tickets#54), throwaway: cycles ?variant= and shows
       the search state. Never shipped: hidden in production builds. -->
  <div v-if="enabled" class="proto-switcher" @click.stop>
    <button type="button" class="proto-switcher__arrow" @click="step(-1)">
      ←
    </button>
    <div class="proto-switcher__body">
      <div class="proto-switcher__label">
        {{ current }} · {{ variants[current] }}
      </div>
      <div class="proto-switcher__state">
        Eingabe „{{ state.raw || "" }}“ · gesucht „{{ state.committed || "" }}“
        <span v-if="state.raw !== state.committed">(wartet …)</span>
        <template v-if="state.total !== null">
          · {{ state.count }} von {{ state.total }}
        </template>
      </div>
    </div>
    <button type="button" class="proto-switcher__arrow" @click="step(1)">
      →
    </button>
  </div>
</template>

<script>
export default {
  name: "PrototypeSwitcher",
  props: {
    // { A: "Werkzeugleiste", B: "…" }
    variants: { type: Object, required: true },
    current: { type: String, required: true },
    // { raw, committed, count, total }
    state: { type: Object, required: true },
  },
  computed: {
    enabled() {
      return process.env.NODE_ENV !== "production";
    },
    keys() {
      return Object.keys(this.variants);
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
      const i = this.keys.indexOf(this.current);
      const next = this.keys[(i + delta + this.keys.length) % this.keys.length];
      this.$router.replace({ query: { ...this.$route.query, variant: next } });
    },
    onKey(e) {
      const t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") this.step(-1);
      if (e.key === "ArrowRight") this.step(1);
    },
  },
};
</script>

<style scoped>
.proto-switcher {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  font: 13px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.proto-switcher__arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  font-size: 16px;
}

.proto-switcher__arrow:hover {
  background: rgba(255, 255, 255, 0.24);
}

.proto-switcher__body {
  min-width: 320px;
  text-align: center;
}

.proto-switcher__label {
  font-weight: 700;
}

.proto-switcher__state {
  opacity: 0.7;
  font-size: 11px;
}
</style>
