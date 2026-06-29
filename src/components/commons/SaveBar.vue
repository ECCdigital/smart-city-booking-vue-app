<script>
export default {
  name: "SaveBar",
  props: {
    inProgress: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
    showCancel: { type: Boolean, default: false },
    showRestore: { type: Boolean, default: false },
    anchorEl: {
      type: [Object, HTMLElement],
      default: null,
    },
    scrollRoot: {
      type: [Object, HTMLElement],
      default: null,
    },
  },
  data() {
    return {
      anchorBox: { left: 0, width: 0 },
      ro: null,
    };
  },
  computed: {
    primaryColor() {
      const theme = this.$vuetify.theme.themes;
      return this.$vuetify.theme.dark
        ? theme.dark.primary
        : theme.light.primary;
    },
  },
  methods: {
    submitChanges() {
      this.$emit("submit");
    },
    cancelChanges() {
      this.$emit("cancel");
    },
    updateAnchorBox() {
      const el = this.anchorEl instanceof Element ? this.anchorEl : null;
      if (!el) {
        this.anchorBox = { left: 0, width: window.innerWidth };
        return;
      }
      const rect = el.getBoundingClientRect();
      this.anchorBox = {
        left: Math.round(rect.left),
        width: Math.round(rect.width),
      };
    },
    addListeners() {
      this._onResizeOrScroll = () => this.updateAnchorBox();
      window.addEventListener("resize", this._onResizeOrScroll, {
        passive: true,
      });
      window.addEventListener("scroll", this._onResizeOrScroll, {
        passive: true,
      });
      window.addEventListener("orientationchange", this._onResizeOrScroll);
      const scrollEl = this.getScrollElement();
      if (scrollEl && scrollEl !== window) {
        scrollEl.addEventListener("scroll", this._onResizeOrScroll, {
          passive: true,
        });
      }
      if (this.anchorEl instanceof Element && "ResizeObserver" in window) {
        this.ro = new ResizeObserver(() => this.updateAnchorBox());
        this.ro.observe(this.anchorEl);
      }
    },
    removeListeners() {
      window.removeEventListener("resize", this._onResizeOrScroll);
      window.removeEventListener("scroll", this._onResizeOrScroll);
      window.removeEventListener("orientationchange", this._onResizeOrScroll);
      const scrollEl = this.getScrollElement();
      if (scrollEl && scrollEl !== window) {
        scrollEl.removeEventListener("scroll", this._onResizeOrScroll);
      }
      if (this.ro) {
        this.ro.disconnect();
        this.ro = null;
      }
    },
    getScrollElement() {
      if (this.scrollRoot instanceof Element) {
        return this.scrollRoot;
      }
      return window;
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.updateAnchorBox();
      this.addListeners();
    });
  },
  beforeDestroy() {
    this.removeListeners();
  },
  watch: {
    anchorEl: {
      handler() {
        this.$nextTick(() => {
          this.removeListeners();
          this.updateAnchorBox();
          this.addListeners();
        });
      },
      immediate: false,
    },
    scrollRoot: {
      handler() {
        this.$nextTick(() => {
          this.removeListeners();
          this.updateAnchorBox();
          this.addListeners();
        });
      },
      immediate: false,
    },
  },
};
</script>

<template>
  <div
    class="save-bar-wrapper"
    :style="{
      left: anchorBox.left + 'px',
      width: anchorBox.width + 'px',
    }"
  >
    <div
      class="save-bar"
      :style="{
        boxShadow: !disabled
          ? '0 0 10px rgba(0, 0, 0, 0.2)'
          : `0 0 15px ${primaryColor}66`,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }"
    >
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-content-save</v-icon>
        <span class="mr-4">Änderungen speichern</span>
        <v-spacer />
        <v-btn v-if="showCancel" text class="save-bar-btn" @click="cancelChanges">
          Abbrechen
        </v-btn>
        <v-btn
          v-if="showRestore"
          :disabled="inProgress || !disabled"
          text
          class="save-bar-btn"
          @click="cancelChanges"
        >
          Änderungen zurücksetzen
        </v-btn>
        <v-btn
          color="primary"
          class="save-bar-btn save-bar-btn--primary"
          :loading="inProgress"
          :disabled="inProgress || !disabled"
          @click="submitChanges"
        >
          Speichern
        </v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --save-bar-height: 56px;
  --save-bar-gap: 12px;
}

.save-bar-wrapper {
  position: fixed;
  bottom: 12px;
  z-index: 10;
  pointer-events: none;
  padding-bottom: calc(var(--save-bar-gap) + env(safe-area-inset-bottom));
}

.save-bar {
  pointer-events: auto;
  min-height: var(--save-bar-height);
  border-radius: 12px;
  padding: 8px 12px;
  backdrop-filter: blur(10px);
}

.save-bar-btn {
  margin: 0 0 0 8px !important;
  min-width: 0 !important;
  height: 36px !important;
  padding: 0 16px !important;
  letter-spacing: normal;
  text-transform: none;
}

.save-bar-btn--primary {
  padding: 0 20px !important;
}
</style>
