<template>
  <v-sheet class="onboarding-path" outlined data-test="wizard-steps">
    <div class="onboarding-path__headline">
      <v-avatar color="primary" size="32" class="onboarding-path__avatar">
        <v-icon dark small>{{ current.icon }}</v-icon>
      </v-avatar>
      <div class="onboarding-path__words">
        <span class="onboarding-path__count">
          {{
            $t("tenant.onboarding.path.count", {
              index: currentIndex + 1,
              total: entries.length,
            })
          }}
        </span>
        <span class="onboarding-path__word primary--text">
          {{ current.label }}
        </span>
      </div>
    </div>

    <div class="onboarding-path__segments" role="tablist">
      <button
        v-for="entry in entries"
        :key="entry.step"
        type="button"
        role="tab"
        class="onboarding-path__segment"
        :class="`onboarding-path__segment--${entry.state}`"
        :aria-selected="String(entry.step === value)"
        :disabled="!entry.reachable"
        :data-test="`wizard-step-${entry.step}`"
        @click="$emit('input', entry.step)"
      >
        <span class="onboarding-path__bar" :class="barClass(entry)" />
        <span class="onboarding-path__label">
          <v-icon
            v-if="entry.state === 'done'"
            size="13"
            color="success"
            class="onboarding-path__check"
          >
            mdi-check-circle
          </v-icon>
          {{ entry.label }}
        </span>
        <span class="onboarding-path__hint">{{ entry.hint }}</span>
      </button>
    </div>
  </v-sheet>
</template>

<script>
const STEP_ICONS = {
  tenant: "mdi-domain",
  offer: "mdi-cube-outline",
  setup: "mdi-tune-variant",
  overview: "mdi-flag-checkered",
};

/**
 * The wizard's progress as the booking page draws a state: a headline word
 * over a segmented path. Each segment is one step - done (green bar and
 * check), current (primary bar, bold) or upcoming (empty bar) - and names
 * under its label what the step already holds. A reachable segment is a
 * tab that reports its step as `input`.
 */
export default {
  name: "OnboardingPath",
  props: {
    /** `{ step, label, hint, state: done | current | upcoming, reachable }` per step. */
    entries: { type: Array, required: true },
    /** The current step key. */
    value: { type: String, required: true },
  },
  computed: {
    currentIndex() {
      return Math.max(
        0,
        this.entries.findIndex((entry) => entry.step === this.value)
      );
    },
    current() {
      const entry = this.entries[this.currentIndex] || {};
      return { ...entry, icon: STEP_ICONS[entry.step] || "mdi-circle-outline" };
    },
  },
  methods: {
    barClass(entry) {
      if (entry.state === "done") return "success";
      if (entry.state === "current") return "primary";
      return "onboarding-path__bar--empty";
    },
  },
};
</script>

<style scoped>
.onboarding-path {
  border-radius: var(--scb-radius-surface) !important;
  padding: var(--scb-space-3) var(--scb-space-4);
  margin-bottom: var(--scb-gap-cards);
}

.onboarding-path__headline {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
}

.onboarding-path__avatar {
  flex: none;
}

.onboarding-path__words {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.onboarding-path__count {
  font-size: var(--scb-font-size-caption);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-tight);
}

.onboarding-path__word {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: var(--scb-line-height-tight);
}

.onboarding-path__segments {
  display: flex;
  gap: 6px;
  margin-top: var(--scb-space-3);
}

/* A segment is a bar with its words below; as a tab it takes the pointer
   and a focus ring, as an upcoming step it takes neither. */
.onboarding-path__segment {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  padding: 4px 6px 2px;
  margin: -4px -6px -2px;
  border-radius: var(--scb-radius-control);
  background: none;
  border: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast);
}

.onboarding-path__segment:disabled {
  cursor: default;
}

.onboarding-path__segment:not(:disabled):hover,
.onboarding-path__segment:focus-visible {
  background-color: var(--scb-hover-tint);
}

.onboarding-path__segment:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base) inset;
}

.onboarding-path__bar {
  display: block;
  height: 4px;
  border-radius: 2px;
}

.onboarding-path__bar--empty {
  background: var(--scb-surface-border);
}

.onboarding-path__label {
  margin-top: 4px;
  font-size: var(--scb-font-size-caption);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.onboarding-path__check {
  vertical-align: -2px;
  margin-right: 2px;
}

.onboarding-path__hint {
  font-size: var(--scb-font-size-caption);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.onboarding-path__segment--current .onboarding-path__label {
  font-weight: 700;
  color: var(--scb-text);
}

.onboarding-path__segment--done .onboarding-path__label {
  color: var(--scb-text);
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-path__segment {
    transition: none;
  }
}

/* $scb-bp-xs of tokens.scss: the hints go, the labels may wrap. */
@media (max-width: 599px) {
  .onboarding-path__hint {
    display: none;
  }
  .onboarding-path__label {
    white-space: normal;
  }
}
</style>
