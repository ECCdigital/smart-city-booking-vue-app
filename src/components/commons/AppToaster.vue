<template>
  <div class="app-toaster">
    <transition-group name="toast" tag="ol" class="app-toaster__list">
      <AppToast
        v-for="toast in toasts"
        :key="toast.id"
        :id="toast.id"
        v-bind="toast"
        @close="remove"
        @pause="onPause"
        @resume="onResume"
      />
    </transition-group>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import AppToast from "./AppToast.vue";

export default {
  name: "AppToaster",
  components: { AppToast },
  methods: {
    ...mapActions({
      remove: "toasts/remove",
      pause: "toasts/pause",
      resume: "toasts/resume",
    }),
    onResume(id) {
      this.resume(id);
    },
    onPause(id) {
      this.pause(id);
    },
  },
  computed: {
    ...mapGetters({
      toasts: "toasts/all",
    }),
  },
};
</script>

<style scoped lang="scss">
.app-toaster {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  width: 380px;
  max-width: calc(100vw - 48px);
  pointer-events: none;
}

.app-toaster__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
}

.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
  position: absolute;
  width: 100%;
}

.toast-enter {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.toast-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
