<template>
  <!-- PROTOTYPE (#57): cycles the row variants via ?variant=, ← / → too. -->
  <div class="proto-switcher" data-test="prototype-switcher">
    <button class="proto-switcher__arrow" title="Vorige (←)" @click="step(-1)">
      ‹
    </button>
    <div class="proto-switcher__label">
      <span class="proto-switcher__tag">Prototyp #57</span>
      <strong>{{ current.key || "–" }}</strong>
      {{ current.name }}
      <span class="proto-switcher__count">
        {{ index + 1 }}/{{ variants.length }}
      </span>
    </div>
    <button class="proto-switcher__arrow" title="Nächste (→)" @click="step(1)">
      ›
    </button>
  </div>
</template>

<script>
import { VARIANTS, rowVariantOf } from "./variant";

export default {
  name: "PrototypeSwitcher",
  data() {
    return { variants: VARIANTS };
  },
  computed: {
    index() {
      const key = rowVariantOf(this.$route);
      return Math.max(
        0,
        this.variants.findIndex((v) => v.key === key)
      );
    },
    current() {
      return this.variants[this.index];
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
      const query = { ...this.$route.query };
      if (next.key) query.variant = next.key;
      else delete query.variant;
      this.$router.replace({ query }).catch(() => {});
    },
    onKey(event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
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
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: 13px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  user-select: none;
}

.proto-switcher__arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  font-size: 20px;
  line-height: 1;
}

.proto-switcher__arrow:hover {
  background: rgba(255, 255, 255, 0.15);
}

.proto-switcher__label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  white-space: nowrap;
}

.proto-switcher__tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f5c400;
  color: #111;
  font-size: 11px;
  font-weight: 600;
}

.proto-switcher__count {
  opacity: 0.55;
}
</style>
