<template>
  <li
    class="app-toast"
    :class="[`app-toast--${type}`, { 'app-toast--paused': isPaused }]"
    @mouseenter="handlePause"
    @mouseleave="handleResume"
  >
    <div class="app-toast__icon" :class="[`app-toast__icon--${type}`]">
      <svg
        v-if="type === 'success'"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>

      <svg
        v-else-if="type === 'error'"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>

      <svg
        v-else-if="type === 'warning'"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M10.29 3.86L1.82 18a2 2 0 001.71
             3h16.94a2 2 0 001.71-3L13.71 3.86a2
             2 0 00-3.42 0z"
        />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <svg
        v-else
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>

    <div class="app-toast__body">
      <p v-if="title" class="app-toast__title">{{ title }}</p>
      <p v-if="message" class="app-toast__description">
        {{ message }}
      </p>
    </div>

    <button class="app-toast__close" @click="$emit('close', id)">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>

    <div
      v-if="timeout > 0"
      class="app-toast__progress"
      :class="[`app-toast__progress--${type}`]"
      :style="progressStyle"
    />
  </li>
</template>

<script>
export default {
  name: "AppToast",
  props: {
    id: { type: Number, required: true },
    type: {
      type: String,
      default: "info",
      validator: (v) => ["success", "error", "warning", "info"].includes(v),
    },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    timeout: { type: Number, default: 5000 },
  },
  data() {
    return {
      isPaused: false,
    };
  },
  computed: {
    progressStyle() {
      return {
        animationDuration: `${this.timeout}ms`,
        animationPlayState: this.isPaused ? "paused" : "running",
      };
    },
  },
  methods: {
    handlePause() {
      this.isPaused = true;
      this.$emit("pause", this.id);
    },
    handleResume() {
      this.isPaused = false;
      this.$emit("resume", this.id);
    },
  },
};
</script>

<style scoped lang="scss">
$success: #10b981;
$error: #ef4444;
$warning: #f59e0b;
$info: #3b82f6;

$radius: 8px;

.app-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-radius: $radius;
  overflow: hidden;
  min-width: 340px;
  max-width: 420px;

  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 4px 6px -4px rgba(0, 0, 0, 0.05);

  list-style: none;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.12),
      0 4px 6px -4px rgba(0, 0, 0, 0.08);
  }
}

.app-toast__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 0;

  &--success {
    color: $success;
  }
  &--error {
    color: $error;
  }
  &--warning {
    color: $warning;
  }
  &--info {
    color: $info;
  }

  svg {
    width: 100%;
    height: 100%;
  }
}

.app-toast__body {
  flex: 1;
  min-width: 0;
  padding-top: 0;
}

.app-toast__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #111827;
  letter-spacing: -0.01em;
}

.app-toast__description {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
}

.app-toast__close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s, background 0.2s, color 0.2s;
  margin-top: -2px;

  &:hover {
    opacity: 1;
    background: #f3f4f6;
    color: #374151;
  }
}

.app-toast:hover .app-toast__close {
  opacity: 1;
}

.app-toast__progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  animation: toast-shrink linear forwards;

  &--success {
    background: $success;
  }
  &--error {
    background: $error;
  }
  &--warning {
    background: $warning;
  }
  &--info {
    background: $info;
  }
}

@keyframes toast-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0;
  }
}

.theme--dark {
  .app-toast {
    background: #374151;
    border-color: #4b5563;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4),
      0 4px 6px -4px rgba(0, 0, 0, 0.3);

    &:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5),
        0 4px 6px -4px rgba(0, 0, 0, 0.4);
    }
  }

  .app-toast__title {
    color: #f9fafb;
  }

  .app-toast__description {
    color: #d1d5db;
  }

  .app-toast__close {
    color: #9ca3af;

    &:hover {
      background: #4b5563;
      color: #e5e7eb;
    }
  }

  .app-toast__icon--info {
    color: #60a5fa;
  }
  .app-toast__icon--success {
    color: #34d399;
  }
  .app-toast__icon--error {
    color: #f87171;
  }
  .app-toast__icon--warning {
    color: #fbbf24;
  }
}
</style>
