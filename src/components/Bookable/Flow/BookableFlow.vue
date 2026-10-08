<template>
  <div
    class="bookable-flow"
    :class="{ 'bookable-flow--with-overview': showOverview }"
    data-test="bookable-flow"
  >
    <BookableFlowDone
      v-if="outcome"
      :bookable="bookable"
      :outcome="outcome"
      :level="level"
      @open-area="$emit('open-area', $event)"
      @another="$emit('another')"
      @overview="$emit('overview')"
    />

    <!-- One structure at every width: the breakpoint only adds the side
         column, so the kept-alive step survives a resize. -->
    <template v-else>
      <!-- From xl the steps stand as a list left, in place of the dots; the
           same state and jump as the dots. -->
      <nav
        v-if="showStepList"
        class="bookable-flow__steps"
        :aria-label="$t('bookable.flow.progress')"
        data-test="flow-steps"
      >
        <button
          v-for="(step, idx) in steps"
          :key="step"
          type="button"
          class="bookable-flow__entry"
          :class="`bookable-flow__entry--${stepState(idx)}`"
          :aria-current="idx === index ? 'step' : null"
          :data-test="`flow-steps-${step}`"
          @click="goTo(idx)"
        >
          <span class="bookable-flow__badge" aria-hidden="true">
            <v-icon v-if="stepState(idx) === 'done'" x-small>mdi-check</v-icon>
            <span v-else>{{ idx + 1 }}</span>
          </span>
          <span class="bookable-flow__entry-title">
            {{ $t(`bookable.flow.steps.${step}.title`) }}
          </span>
          <span class="d-sr-only">
            {{ $t(`bookable.flow.step-state.${stepState(idx)}`) }}
          </span>
        </button>
        <div class="bookable-flow__entry bookable-flow__entry--flag">
          <span class="bookable-flow__badge" aria-hidden="true">
            <v-icon x-small>mdi-flag-outline</v-icon>
          </span>
          <span class="bookable-flow__entry-title">
            {{ $t("bookable.flow.done-label") }}
          </span>
        </div>
      </nav>

      <div class="bookable-flow__column">
        <!-- The tenant's first bookable, right after its creation: the level
             it started at stays in view (free shows none). -->
        <OnboardingSupervisionNotice
          v-if="onboarding"
          :level="level"
          class="bookable-flow__notice"
        />

        <nav
          v-if="!showStepList"
          class="bookable-flow__progress"
          :aria-label="$t('bookable.flow.progress')"
          data-test="flow-progress"
        >
          <button
            v-for="(step, idx) in steps"
            :key="step"
            type="button"
            class="bookable-flow__dot"
            :class="`bookable-flow__dot--${stepState(idx)}`"
            :aria-current="idx === index ? 'step' : null"
            :aria-label="
              $t('bookable.flow.step-label', {
                index: idx + 1,
                title: $t(`bookable.flow.steps.${step}.title`),
              })
            "
            :data-test="`flow-dot-${step}`"
            @click="goTo(idx)"
          >
            <v-icon v-if="stepState(idx) === 'done'" x-small>mdi-check</v-icon>
            <span v-else>{{ idx + 1 }}</span>
          </button>
          <span class="bookable-flow__line" />
          <span
            class="bookable-flow__dot bookable-flow__dot--upcoming bookable-flow__dot--flag"
            role="img"
            :aria-label="$t('bookable.flow.done-label')"
          >
            <v-icon x-small>mdi-flag-outline</v-icon>
          </span>
        </nav>

        <header class="bookable-flow__header">
          <h2 class="bookable-flow__title" data-test="flow-title-heading">
            {{ $t(`bookable.flow.steps.${step}.title`) }}
          </h2>
          <p class="bookable-flow__why">
            {{ $t(`bookable.flow.steps.${step}.why`) }}
          </p>
        </header>

        <!-- Kept alive as a cache only: a step reads everything from the
             bookable, and a choice it cannot show yet (Tarife, Bestimmte
             Rollen) may be lost when it unmounts. -->
        <div :class="{ 'bookable-flow__panel': step !== 'amount' }">
          <keep-alive>
            <component
              :is="stepComponent"
              :key="step"
              ref="step"
              :bookable="bookable"
              :is-new="isNew"
              v-bind="stepProps"
              @update:bookable="$emit('update:bookable', $event)"
              @open-section="$emit('open-section', $event)"
            />
          </keep-alive>
        </div>

        <v-alert
          v-if="saveFailed"
          type="error"
          text
          dense
          class="mt-4 mb-0"
          data-test="flow-save-failed"
        >
          {{ $t("bookable.flow.save-failed") }}
        </v-alert>

        <div class="flow-footer">
          <v-btn
            v-if="index > 0"
            text
            data-test="flow-back"
            @click="goTo(index - 1)"
          >
            <v-icon left small>mdi-chevron-left</v-icon>
            {{ $t("bookable.flow.back") }}
          </v-btn>
          <v-btn
            v-if="onboarding"
            text
            color="primary"
            data-test="flow-skip"
            @click="$emit('skip')"
          >
            {{ $t("bookable.flow.skip") }}
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
              {{ $t("bookable.flow.save") }}
            </v-btn>
            <v-btn
              v-else
              color="primary"
              depressed
              data-test="flow-next"
              @click="goTo(index + 1)"
            >
              {{ $t("bookable.flow.next") }}
              <v-icon right small>mdi-chevron-right</v-icon>
            </v-btn>
          </div>
          <p v-if="last" class="flow-footer__note">
            {{ $t("bookable.flow.save-hint") }}
          </p>
        </div>
      </div>

      <BookableFlowSummary
        v-if="showOverview"
        class="bookable-flow__summary"
        :blocks="summaryBlocks"
        :current="step"
        @go="goTo(steps.indexOf($event))"
      />
    </template>
  </div>
</template>

<script>
import BookableFlowIdentity from "@/components/Bookable/Flow/BookableFlowIdentity.vue";
import BookableFlowAvailability from "@/components/Bookable/Flow/BookableFlowAvailability.vue";
import BookableFlowPrice from "@/components/Bookable/Flow/BookableFlowPrice.vue";
import BookableFlowAmount from "@/components/Bookable/Flow/BookableFlowAmount.vue";
import BookableFlowPermission from "@/components/Bookable/Flow/BookableFlowPermission.vue";
import BookableFlowApproval from "@/components/Bookable/Flow/BookableFlowApproval.vue";
import BookableEditPublication from "@/components/Bookable/Edit/BookableEditPublication.vue";
import BookableFlowMore from "@/components/Bookable/Flow/BookableFlowMore.vue";
import BookableFlowDone from "@/components/Bookable/Flow/BookableFlowDone.vue";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import { FLOW_STEPS, overviewBlocks } from "@/utils/bookableFlow";
import {
  cachedEventTitlesById,
  loadEventTitlesById,
} from "@/utils/eventTitles";

const STEP_COMPONENTS = {
  identity: "BookableFlowIdentity",
  availability: "BookableFlowAvailability",
  price: "BookableFlowPrice",
  amount: "BookableFlowAmount",
  permission: "BookableFlowPermission",
  approval: "BookableFlowApproval",
  more: "BookableFlowMore",
  publication: "BookableEditPublication",
};

/**
 * Where the flow starts, and starts over: at the identity. A step is done
 * once it was left forward and visited once it was current (only the
 * overview reads that); an existing bookable has been through all of them.
 */
function startingPoint(isNew) {
  return {
    index: 0,
    done: isNew ? [] : [...FLOW_STEPS],
    visited: isNew ? [FLOW_STEPS[0]] : [...FLOW_STEPS],
  };
}

/**
 * The guided flow of a bookable after the cloud variant (ECCdigital/
 * tickets#326): a centred column with the progress as dots, the step's
 * question beneath its title, and the way on in a footer. It edits the
 * editor's bookable and saves nothing itself - „Speichern“ on the last
 * step, the publication (ECCdigital/tickets#362), asks the editor to save
 * once, and the editor answers with the outcome the confirmation shows.
 *
 * The steps can be visited in any order; „Weiter“ never holds. What the
 * backend would refuse is checked on save (`bookableValidation`), and
 * `BookableEdit` opens the first step with an issue (`openStep`).
 * Right after a tenant's creation the flow may be skipped (`skip`).
 *
 * From Vuetify's lg (1264px) the column stands left with the overview of
 * the bookable beside it (ECCdigital/tickets#331); from xl (1904px) the
 * steps stand as a list left of it, in place of the dots (ECCdigital/
 * tickets#333).
 */
export default {
  name: "BookableFlow",
  components: {
    BookableFlowIdentity,
    BookableFlowAvailability,
    BookableFlowPrice,
    BookableFlowAmount,
    BookableFlowPermission,
    BookableFlowApproval,
    BookableFlowMore,
    BookableEditPublication,
    BookableFlowDone,
    BookableFlowSummary,
    OnboardingSupervisionNotice,
  },
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
    /** The first bookable of a tenant just created: it may be skipped. */
    onboarding: { type: Boolean, default: false },
    level: { type: String, default: null },
    inProgress: { type: Boolean, default: false },
    saveFailed: { type: Boolean, default: false },
    /** Set after the save: `published`, `draft` or `kept`. */
    outcome: { type: String, default: null },
  },
  data() {
    return {
      steps: FLOW_STEPS,
      ...startingPoint(this.isNew),
      eventTitlesById: cachedEventTitlesById() || {},
    };
  },
  computed: {
    step() {
      return this.steps[this.index];
    },
    stepComponent() {
      return STEP_COMPONENTS[this.step];
    },
    last() {
      return this.index === this.steps.length - 1;
    },
    /** What a step takes beside the bookable and `isNew`. */
    stepProps() {
      return this.step === "publication" ? { level: this.level } : {};
    },
    /** From Vuetify's lg the overview stands beside the step. */
    showOverview() {
      return !this.outcome && this.$vuetify.breakpoint.lgAndUp;
    },
    /** From Vuetify's xl the step list stands left, in place of the dots. */
    showStepList() {
      return this.showOverview && this.$vuetify.breakpoint.xl;
    },
    summaryBlocks() {
      return overviewBlocks(this.bookable, {
        visited: this.visited,
        eventTitlesById: this.eventTitlesById,
      });
    },
    needsEventTitles() {
      return this.showOverview && this.bookable.type === "ticket";
    },
  },
  watch: {
    needsEventTitles: {
      immediate: true,
      async handler(needed) {
        if (needed) this.eventTitlesById = await loadEventTitlesById();
      },
    },
    // „Weiteres Buchungsobjekt anlegen“ starts over on the same page.
    outcome(outcome) {
      if (!outcome) Object.assign(this, startingPoint(this.isNew));
    },
  },
  methods: {
    /** `current`, `done` or `upcoming`, for the dots and the step list. */
    stepState(idx) {
      if (idx === this.index) return "current";
      return this.done.includes(this.steps[idx]) ? "done" : "upcoming";
    },
    /**
     * Opens the step `step`, as its dot does: a refused save asks for it.
     * With `area`, the step „Weitere Einstellungen“ opens that area too - a
     * link of the confirmation leads there.
     */
    openStep(step, area = null) {
      this.goTo(this.steps.indexOf(step));
      if (area) this.$nextTick(() => this.$refs.step?.reveal?.(area));
    },
    goTo(idx) {
      if (idx < 0 || idx >= this.steps.length) return;
      if (idx > this.index && !this.done.includes(this.step)) {
        this.done.push(this.step);
      }
      this.index = idx;
      if (!this.visited.includes(this.step)) this.visited.push(this.step);
      this.$el
        .closest(".admin-page__body--scroll")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    },
  },
};
</script>

<style scoped>
.bookable-flow {
  max-width: var(--scb-editor-width-max);
  margin: 0 auto;
  padding-bottom: var(--scb-space-6);
}

.bookable-flow--with-overview {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
  max-width: none;
  margin: 0;
}

.bookable-flow--with-overview .bookable-flow__column {
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--scb-editor-width-max);
}

/* The side columns stick and scroll in themselves, as the editor's section
   nav and overview column do. */
.bookable-flow__steps,
.bookable-flow__summary {
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
}

.bookable-flow__summary {
  flex: 0 0 var(--scb-overview-width);
  max-width: var(--scb-overview-width-max);
}

/* The editor's section nav: its width and padding. */
.bookable-flow__steps {
  flex: 0 0 auto;
  min-width: var(--scb-nav-width-min);
  max-width: var(--scb-nav-width-max);
  padding: 2px 0;
}

/* An entry looks like a tab of the editor's section nav: the current one
   is a tinted pill, with no bar at its left edge. */
.bookable-flow__entry {
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

.bookable-flow__entry:hover {
  background-color: var(--scb-hover-tint);
}

.bookable-flow__entry:focus-visible {
  box-shadow: inset 0 0 0 2px var(--v-primary-base);
}

.bookable-flow__entry--current {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint);
  font-weight: var(--scb-font-weight-medium);
}

.bookable-flow__entry--upcoming {
  color: var(--scb-text-muted);
}

.bookable-flow__entry--flag {
  margin-top: var(--scb-space-2);
  padding-top: var(--scb-space-3);
  border-top: 1px solid var(--scb-rule);
  border-radius: 0;
  color: var(--scb-text-caption);
  cursor: default;
}

.bookable-flow__badge {
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

.bookable-flow__badge .v-icon {
  color: inherit;
}

.bookable-flow__entry-title {
  flex: 1 1 auto;
  min-width: 0;
  line-height: var(--scb-line-height-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookable-flow__notice {
  margin-bottom: var(--scb-space-4);
}

.bookable-flow__progress {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin: var(--scb-space-2) 0 var(--scb-space-5);
}

.bookable-flow__dot {
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

.bookable-flow__dot:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

/* An entry's badge takes the colours of its dot. */
.bookable-flow__dot--current,
.bookable-flow__entry--current .bookable-flow__badge {
  color: #fff;
  background-color: var(--v-primary-base);
}

.bookable-flow__dot--done,
.bookable-flow__entry--done .bookable-flow__badge {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint);
}

.bookable-flow__dot--done .v-icon {
  color: inherit;
}

.bookable-flow__dot--upcoming {
  color: var(--scb-text-muted);
  background-color: var(--scb-surface-tint);
}

.bookable-flow__dot--flag {
  cursor: default;
}

.bookable-flow__line {
  flex: 1 1 auto;
  height: 1px;
  background-color: var(--scb-rule);
}

.bookable-flow__header {
  margin-bottom: var(--scb-space-4);
}

.bookable-flow__title {
  margin: 0;

  font-size: 1.25rem;
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
}

.bookable-flow__why {
  margin: var(--scb-space-1) 0 0;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.bookable-flow__panel {
  padding: var(--scb-space-5);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

@media (max-width: 599px) {
  .bookable-flow__panel {
    padding: var(--scb-space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bookable-flow__dot,
  .bookable-flow__entry {
    transition: none;
  }
}
</style>

<style>
/* The pieces the steps share; the selectors are the flow's own, so the
   sheet is plain (not scoped). */
.bookable-flow .flow-field {
  margin-bottom: var(--scb-space-5);
}

.bookable-flow .flow-field__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.bookable-flow .flow-field__hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.bookable-flow .flow-field__hint--tight {
  margin-top: calc(-1 * var(--scb-space-4));
}

.bookable-flow .flow-question {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.bookable-flow .flow-caption {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-4);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.bookable-flow .flow-note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}

.bookable-flow .flow-note--warning {
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}

.bookable-flow .flow-note__title {
  margin-bottom: 2px;
  font-weight: var(--scb-font-weight-semibold);
}

.bookable-flow .flow-rule {
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}

.bookable-flow .flow-box {
  margin-top: var(--scb-space-5);
  padding: var(--scb-space-4);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.bookable-flow .flow-box:first-child {
  margin-top: 0;
}

.bookable-flow .flow-box__summary {
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

.bookable-flow .flow-box__total {
  font-size: 1.25rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--v-primary-base);
}

.bookable-flow .flow-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-3);
}

.bookable-flow .flow-inline__text {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
}

.bookable-flow .flow-switch {
  margin-top: 0;
  padding-top: 0;
  margin-bottom: var(--scb-space-4);
}

.bookable-flow .flow-vat-rate {
  max-width: 160px;
}

.bookable-flow .flow-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--scb-space-3);
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-4);
  border-top: 1px solid var(--scb-rule);
}

.bookable-flow .flow-footer__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2) var(--scb-space-3);
  margin-left: auto;
}

.bookable-flow .flow-footer__note {
  flex: 1 1 100%;
  margin: 0;
  text-align: right;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-caption);
}

/* The app's buttons capitalise every word (!important, variables.scss);
   the flow's labels are sentences. */
.bookable-flow .v-btn {
  text-transform: none !important;
  letter-spacing: normal;
}
</style>
