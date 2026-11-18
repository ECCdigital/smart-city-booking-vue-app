<script>
/**
 * The frame of a guided flow: a centred column with the progress as dots,
 * the step's title and why beneath, the step in a panel and the way on in a
 * footer. From Vuetify's lg the overview (slot `overview`) stands beside it;
 * from xl the steps stand as a list left, in place of the dots. The
 * bookable's flow (`BookableFlow`) and the event's (`EventFlow`) fill it; it
 * holds no state of its own: `go(index)` asks for a step, `save` for the
 * save on the last one.
 */
export default {
  name: "FlowFrame",
  props: {
    // [{ key, title }]
    steps: { type: Array, required: true },
    index: { type: Number, required: true },
    // The keys of the steps left forward once: a check instead of the number.
    done: { type: Array, default: () => [] },
    // The keys of the steps that hold a missing required field: red.
    alertKeys: { type: Array, default: () => [] },
    // The current step's heading and the sentence beneath it.
    title: { type: String, required: true },
    why: { type: String, default: "" },
    // The step in a bordered panel; off for a step of its own cards.
    panel: { type: Boolean, default: true },
    inProgress: { type: Boolean, default: false },
    saveFailed: { type: Boolean, default: false },
    saveFailedText: { type: String, default: "" },
    saveHint: { type: String, default: "" },
  },
  computed: {
    last() {
      return this.index === this.steps.length - 1;
    },
    /** From Vuetify's lg the overview stands beside the step. */
    showOverview() {
      return !!this.$scopedSlots.overview && this.$vuetify.breakpoint.lgAndUp;
    },
    /** From Vuetify's xl the step list stands left, in place of the dots. */
    showStepList() {
      return this.showOverview && this.$vuetify.breakpoint.xl;
    },
  },
  methods: {
    /** `current`, `alert`, `done` or `upcoming`, for the dots and the list. */
    stepState(idx) {
      if (idx === this.index) return "current";
      const key = this.steps[idx].key;
      if (this.alertKeys.includes(key)) return "alert";
      return this.done.includes(key) ? "done" : "upcoming";
    },
    // The state as the screen reader hears it; an alert reads as open.
    stateLabel(idx) {
      const state = this.stepState(idx);
      return this.$t(
        `bookable.flow.step-state.${state === "alert" ? "upcoming" : state}`
      );
    },
  },
};
</script>

<template>
  <div
    class="flow-frame"
    :class="{ 'flow-frame--with-overview': showOverview }"
  >
    <!-- One structure at every width: the breakpoint only adds the side
         columns, so a kept-alive step survives a resize. -->
    <nav
      v-if="showStepList"
      class="flow-frame__steps"
      :aria-label="$t('bookable.flow.progress')"
      data-test="flow-steps"
    >
      <button
        v-for="(step, idx) in steps"
        :key="step.key"
        type="button"
        class="flow-frame__entry"
        :class="`flow-frame__entry--${stepState(idx)}`"
        :aria-current="idx === index ? 'step' : null"
        :data-test="`flow-steps-${step.key}`"
        @click="$emit('go', idx)"
      >
        <span class="flow-frame__badge" aria-hidden="true">
          <v-icon v-if="stepState(idx) === 'done'" x-small>mdi-check</v-icon>
          <span v-else-if="stepState(idx) === 'alert'">!</span>
          <span v-else>{{ idx + 1 }}</span>
        </span>
        <span class="flow-frame__entry-title">{{ step.title }}</span>
        <span class="d-sr-only">{{ stateLabel(idx) }}</span>
      </button>
      <div class="flow-frame__entry flow-frame__entry--flag">
        <span class="flow-frame__badge" aria-hidden="true">
          <v-icon x-small>mdi-flag-outline</v-icon>
        </span>
        <span class="flow-frame__entry-title">
          {{ $t("bookable.flow.done-label") }}
        </span>
      </div>
    </nav>

    <div class="flow-frame__column">
      <nav
        v-if="!showStepList"
        class="flow-frame__progress"
        :aria-label="$t('bookable.flow.progress')"
        data-test="flow-progress"
      >
        <button
          v-for="(step, idx) in steps"
          :key="step.key"
          type="button"
          class="flow-frame__dot"
          :class="`flow-frame__dot--${stepState(idx)}`"
          :aria-current="idx === index ? 'step' : null"
          :aria-label="
            $t('bookable.flow.step-label', {
              index: idx + 1,
              title: step.title,
            })
          "
          :title="step.title"
          :data-test="`flow-dot-${step.key}`"
          @click="$emit('go', idx)"
        >
          <v-icon v-if="stepState(idx) === 'done'" x-small>mdi-check</v-icon>
          <span v-else-if="stepState(idx) === 'alert'">!</span>
          <span v-else>{{ idx + 1 }}</span>
        </button>
        <span class="flow-frame__line" />
        <span
          class="flow-frame__dot flow-frame__dot--upcoming flow-frame__dot--flag"
          role="img"
          :aria-label="$t('bookable.flow.done-label')"
        >
          <v-icon x-small>mdi-flag-outline</v-icon>
        </span>
      </nav>

      <header class="flow-frame__header">
        <h2 class="flow-frame__title" data-test="flow-title-heading">
          {{ title }}
        </h2>
        <p v-if="why" class="flow-frame__why">{{ why }}</p>
      </header>

      <div :class="{ 'flow-frame__panel': panel }" data-test="flow-panel">
        <slot />
      </div>

      <v-alert
        v-if="saveFailed"
        type="error"
        text
        dense
        class="mt-4 mb-0"
        data-test="flow-save-failed"
      >
        {{ saveFailedText }}
      </v-alert>

      <div class="flow-footer">
        <v-btn
          v-if="index > 0"
          text
          data-test="flow-back"
          @click="$emit('go', index - 1)"
        >
          <v-icon left small>mdi-chevron-left</v-icon>
          {{ $t("bookable.flow.back") }}
        </v-btn>
        <div class="flow-footer__right" data-test="flow-footer-actions">
          <v-btn
            v-if="last"
            color="primary"
            depressed
            :loading="inProgress"
            data-test="flow-save"
            @click="$emit('save')"
          >
            {{ $t("actions.save") }}
          </v-btn>
          <v-btn
            v-else
            color="primary"
            depressed
            data-test="flow-next"
            @click="$emit('go', index + 1)"
          >
            {{ $t("bookable.flow.next") }}
            <v-icon right small>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
        <p
          v-if="last && saveHint"
          class="flow-footer__note"
          data-test="flow-save-hint"
        >
          {{ saveHint }}
        </p>
      </div>
    </div>

    <div v-if="showOverview" class="flow-frame__summary">
      <slot name="overview" />
    </div>
  </div>
</template>

<style scoped>
.flow-frame {
  max-width: var(--scb-editor-width-max);
  margin: 0 auto;
  padding-bottom: var(--scb-space-6);
}

.flow-frame--with-overview {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
  max-width: none;
  margin: 0;
}

.flow-frame--with-overview .flow-frame__column {
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--scb-editor-width-max);
}

/* The side columns stick and scroll in themselves, as the editor's section
   nav and overview column do. */
.flow-frame__steps,
.flow-frame__summary {
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
}

.flow-frame__summary {
  flex: 0 0 var(--scb-overview-width);
  max-width: var(--scb-overview-width-max);
}

/* The editor's section nav: its width and padding. */
.flow-frame__steps {
  flex: 0 0 auto;
  min-width: var(--scb-nav-width-min);
  max-width: var(--scb-nav-width-max);
  padding: 2px 0;
}

/* An entry looks like a tab of the editor's section nav: the current one
   is a tinted pill, with no bar at its left edge. */
.flow-frame__entry {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: var(--scb-nav-item-height);
  margin: 0;
  padding: var(--scb-space-2) var(--scb-space-3);
  border: 0;
  border-radius: var(--scb-radius-control);
  background: transparent;
  color: var(--scb-text);
  font: inherit;
  font-size: var(--scb-font-size-md);
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.flow-frame__entry:hover {
  background-color: var(--scb-hover-tint);
}

.flow-frame__entry:focus-visible {
  box-shadow: inset 0 0 0 2px var(--v-primary-base);
}

.flow-frame__entry--current {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint);
  font-weight: var(--scb-font-weight-medium);
}

.flow-frame__entry--upcoming {
  color: var(--scb-text-muted);
}

.flow-frame__entry--flag {
  margin-top: var(--scb-space-2);
  padding-top: var(--scb-space-3);
  border-top: 1px solid var(--scb-rule);
  border-radius: 0;
  color: var(--scb-text-caption);
  cursor: default;
}

.flow-frame__badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: var(--scb-font-size-caption);
  border-radius: 50%;
  color: var(--scb-text-muted);
  background-color: var(--scb-surface-tint);
}

.flow-frame__badge .v-icon {
  color: inherit;
}

.flow-frame__entry-title {
  flex: 1 1 auto;
  min-width: 0;
  line-height: var(--scb-line-height-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-frame__progress {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin: var(--scb-space-2) 0 var(--scb-space-5);
}

.flow-frame__dot {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font: inherit;
  font-size: var(--scb-font-size-xs);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast);
}

.flow-frame__dot:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

/* An entry's badge takes the colours of its dot. */
.flow-frame__dot--current,
.flow-frame__entry--current .flow-frame__badge {
  color: #fff;
  background-color: var(--v-primary-base);
}

.flow-frame__dot--done,
.flow-frame__entry--done .flow-frame__badge {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint);
}

.flow-frame__dot--done .v-icon {
  color: inherit;
}

.flow-frame__dot--upcoming {
  color: var(--scb-text-muted);
  background-color: var(--scb-surface-tint);
}

.flow-frame__dot--alert,
.flow-frame__entry--alert .flow-frame__badge {
  color: var(--v-error-base);
  background-color: color-mix(in srgb, var(--v-error-base) 12%, transparent);
}

.flow-frame__dot--flag {
  cursor: default;
}

.flow-frame__line {
  flex: 1 1 auto;
  height: 1px;
  background-color: var(--scb-rule);
}

.flow-frame__header {
  margin-bottom: var(--scb-space-4);
}

.flow-frame__title {
  margin: 0;

  font-size: 1.25rem;
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
}

.flow-frame__why {
  margin: var(--scb-space-1) 0 0;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.flow-frame__panel {
  padding: var(--scb-space-5);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

@media (max-width: 599px) {
  .flow-frame__panel {
    padding: var(--scb-space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-frame__dot,
  .flow-frame__entry {
    transition: none;
  }
}
</style>

<style>
/* The pieces the steps share; the selectors are the frame's own, so the
   sheet is plain (not scoped). */
.flow-frame .flow-field {
  margin-bottom: var(--scb-space-5);
}

.flow-frame .flow-field__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.flow-frame .flow-field__hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.flow-frame .flow-field__hint--tight {
  margin-top: calc(-1 * var(--scb-space-4));
}

.flow-frame .flow-question {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.flow-frame .flow-caption {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-4);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.flow-frame .flow-note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}

.flow-frame .flow-note--warning {
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}

.flow-frame .flow-note__title {
  margin-bottom: 2px;
  font-weight: var(--scb-font-weight-semibold);
}

.flow-frame .flow-rule {
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}

.flow-frame .flow-box {
  margin-top: var(--scb-space-5);
  padding: var(--scb-space-4);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.flow-frame .flow-box:first-child {
  margin-top: 0;
}

.flow-frame .flow-box__summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-4);
  padding-top: var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
  border-top: 1px solid var(--scb-rule);
}

.flow-frame .flow-box__total {
  font-size: 1.25rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--v-primary-base);
}

.flow-frame .flow-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-3);
}

.flow-frame .flow-inline__text {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
}

.flow-frame .flow-switch {
  margin-top: 0;
  padding-top: 0;
  margin-bottom: var(--scb-space-4);
}

.flow-frame .flow-vat-rate {
  max-width: 160px;
}

.flow-frame .flow-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--scb-space-3);
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-4);
  border-top: 1px solid var(--scb-rule);
}

.flow-frame .flow-footer__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2) var(--scb-space-3);
  margin-left: auto;
}

.flow-frame .flow-footer__note {
  flex: 1 1 100%;
  margin: 0;
  text-align: right;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-caption);
}

/* The app's buttons capitalise every word (!important, variables.scss);
   the flow's labels are sentences. */
.flow-frame .v-btn {
  text-transform: none !important;
  letter-spacing: normal;
}
</style>
