<template>
  <div
    class="bookable-flow"
    :class="{ 'bookable-flow--wide': wide }"
    data-test="bookable-flow"
  >
    <BookableFlowDone
      v-if="outcome"
      :bookable="bookable"
      :outcome="outcome"
      :level="level"
      @open-section="$emit('open-section', $event)"
      @another="$emit('another')"
      @overview="$emit('overview')"
    />

    <!-- One structure at every width: the breakpoint only adds the side
         column, so the kept-alive step survives a resize. -->
    <template v-else>
      <div class="bookable-flow__column">
        <!-- The tenant's first bookable, right after its creation: the level
             it started at stays in view (free shows none). -->
        <OnboardingSupervisionNotice
          v-if="onboarding"
          :level="level"
          class="bookable-flow__notice"
        />

        <nav
          class="bookable-flow__progress"
          :aria-label="$t('bookable.flow.progress')"
          data-test="flow-progress"
        >
          <button
            v-for="(step, idx) in steps"
            :key="step"
            type="button"
            class="bookable-flow__dot"
            :class="`bookable-flow__dot--${dotState(idx)}`"
            :disabled="idx > 0 && !named"
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
            <v-icon v-if="dotState(idx) === 'done'" x-small>mdi-check</v-icon>
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
          <div class="bookable-flow__count" data-test="flow-count">
            {{
              $t("bookable.flow.count", {
                index: index + 1,
                total: steps.length,
              })
            }}
          </div>
          <h2 class="bookable-flow__title" data-test="flow-title-heading">
            {{ $t(`bookable.flow.steps.${step}.title`) }}
          </h2>
          <p class="bookable-flow__why">
            {{ $t(`bookable.flow.steps.${step}.why`) }}
          </p>
        </header>

        <!-- Kept alive: a step's own choice (Tarife, Bestimmte Rollen) holds
             while the bookable cannot tell it yet. -->
        <div :class="{ 'bookable-flow__panel': step !== 'amount' }">
          <keep-alive>
            <component
              :is="stepComponent"
              :key="step"
              :bookable="bookable"
              :is-new="isNew"
              @update:bookable="$emit('update:bookable', $event)"
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
          <div class="flow-footer__right">
            <span
              v-if="!named"
              class="flow-field__hint mt-0"
              data-test="flow-name-missing"
            >
              {{ $t("bookable.flow.name-missing") }}
            </span>
            <template v-if="last">
              <v-btn
                outlined
                color="primary"
                :disabled="!named || inProgress"
                data-test="flow-save-only"
                @click="$emit('save', false)"
              >
                {{ $t("bookable.flow.save-only") }}
              </v-btn>
              <v-btn
                color="primary"
                depressed
                :disabled="!named"
                :loading="inProgress"
                data-test="flow-save-publish"
                @click="$emit('save', true)"
              >
                <v-icon left small>mdi-flag-outline</v-icon>
                {{ $t(`bookable.flow.save-and-publish.${variant}`) }}
              </v-btn>
            </template>
            <v-btn
              v-else
              color="primary"
              depressed
              :disabled="!named"
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
        v-if="wide"
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
import BookableFlowDone from "@/components/Bookable/Flow/BookableFlowDone.vue";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import ApiEventService from "@/services/api/ApiEventService";
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import {
  FLOW_STEPS,
  hasName,
  overviewBlocks,
  publishVariant,
} from "@/utils/bookableFlow";

const STEP_COMPONENTS = {
  identity: "BookableFlowIdentity",
  availability: "BookableFlowAvailability",
  price: "BookableFlowPrice",
  amount: "BookableFlowAmount",
  permission: "BookableFlowPermission",
  approval: "BookableFlowApproval",
};

/**
 * The guided flow of a bookable after the cloud variant (ECCdigital/
 * tickets#326): a centred column with the progress as dots, the step's
 * question beneath its title, and the way on in a footer. It edits the
 * editor's bookable and saves nothing itself - the last step asks the
 * editor to save, once, with or without the publication wish, and the
 * editor answers with the outcome the confirmation shows.
 *
 * The steps can be visited in any order once the bookable has a name.
 * Right after a tenant's creation the flow may be skipped (`skip`).
 *
 * From Vuetify's lg (1264px) the column stands left with the overview of
 * the bookable beside it (ECCdigital/tickets#331).
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
      index: 0,
      // A step is done once it was left forward; an existing bookable has
      // been through all of them.
      done: this.isNew ? [] : [...FLOW_STEPS],
      // A step is visited once it was current; only the overview reads it.
      visited: this.isNew ? [FLOW_STEPS[0]] : [...FLOW_STEPS],
      eventTitlesById: null,
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
    named() {
      return hasName(this.bookable);
    },
    variant() {
      return publishVariant(this.level);
    },
    /** From Vuetify's lg the overview stands beside the step. */
    wide() {
      return !this.outcome && this.$vuetify.breakpoint.lgAndUp;
    },
    summaryBlocks() {
      return overviewBlocks(this.bookable, {
        visited: this.visited,
        eventTitlesById: this.eventTitlesById || {},
      });
    },
    needsEventTitles() {
      return this.wide && this.bookable.type === "ticket";
    },
  },
  watch: {
    needsEventTitles: {
      immediate: true,
      handler(needed) {
        if (needed && !this.eventTitlesById) this.loadEventTitles();
      },
    },
    // „Weiteres Buchungsobjekt anlegen“ starts over on the same page.
    outcome(outcome) {
      if (!outcome) {
        this.index = 0;
        this.done = this.isNew ? [] : [...FLOW_STEPS];
        this.visited = this.isNew ? [FLOW_STEPS[0]] : [...FLOW_STEPS];
      }
    },
  },
  methods: {
    /** The titles of the tenant's events, for a ticket's event (once). */
    async loadEventTitles() {
      this.eventTitlesById = {};
      try {
        const response = await ApiEventService.getEvents(
          this.bookable.tenantId || undefined
        );
        this.eventTitlesById = Object.fromEntries(
          (response?.data || []).map((event) => [
            event.id,
            event.information?.name || event.id,
          ])
        );
      } catch (error) {
        console.error(error);
      }
    },
    dotState(idx) {
      if (idx === this.index) return "current";
      return this.done.includes(this.steps[idx]) ? "done" : "upcoming";
    },
    goTo(idx) {
      if (idx < 0 || idx >= this.steps.length) return;
      if (idx > 0 && !this.named) return;
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
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: var(--scb-space-6);
}

.bookable-flow--wide {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
  max-width: none;
  margin: 0;
}

.bookable-flow--wide .bookable-flow__column {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 720px;
}

/* Sticks and scrolls in itself as the editor's overview column does. */
.bookable-flow__summary {
  flex: 0 0 var(--scb-overview-width);
  max-width: var(--scb-overview-width-max);
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
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

.bookable-flow__dot:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.bookable-flow__dot--current {
  color: #fff;
  background-color: var(--v-primary-base);
}

.bookable-flow__dot--done {
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

.bookable-flow__count {
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--v-primary-base);
}

.bookable-flow__title {
  margin: 2px 0 0;
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
  .bookable-flow__dot {
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
