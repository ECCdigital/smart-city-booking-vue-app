<template>
  <div class="bookable-flow" data-test="bookable-flow">
    <div v-if="outcome" class="flow-frame bookable-flow__done">
      <BookableFlowDone
        :bookable="bookable"
        :outcome="outcome"
        :level="level"
        @open-area="$emit('open-area', $event)"
        @another="$emit('another')"
        @leave="$emit('leave')"
      />
    </div>

    <FlowFrame
      v-else
      :steps="frameSteps"
      :index="index"
      :done="done"
      :title="$t(`bookable.flow.steps.${step}.title`)"
      :why="$t(`bookable.flow.steps.${step}.why`)"
      :panel="step !== 'amount'"
      :in-progress="inProgress"
      :save-failed="saveFailed"
      :save-failed-text="$t('bookable.flow.save-failed')"
      :save-hint="$t('bookable.flow.save-hint')"
      @go="goTo"
      @save="$emit('save')"
    >
      <p
        v-if="stepQuestion"
        class="flow-question"
        data-test="flow-step-question"
      >
        {{ $t(stepQuestion) }}
      </p>
      <!-- Kept alive as a cache only: a step reads everything from the
           bookable, and a choice it cannot show yet (Tarife, Bestimmte
           Rollen) may be lost when it unmounts. -->
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

      <template #overview>
        <BookableFlowSummary
          :bookable="bookable"
          :visited="visited"
          :current="step"
          @go="openField"
        />
      </template>
    </FlowFrame>
  </div>
</template>

<script>
import BookableEditIdentity from "@/components/Bookable/Edit/BookableEditIdentity.vue";
import BookableFlowAvailability from "@/components/Bookable/Flow/BookableFlowAvailability.vue";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import BookableEditAmount from "@/components/Bookable/Edit/BookableEditAmount.vue";
import BookableEditPermission from "@/components/Bookable/Edit/BookableEditPermission.vue";
import BookableEditConfirmation from "@/components/Bookable/Edit/BookableEditConfirmation.vue";
import BookableEditPublication from "@/components/Bookable/Edit/BookableEditPublication.vue";
import BookableFlowMore from "@/components/Bookable/Flow/BookableFlowMore.vue";
import BookableFlowDone from "@/components/Bookable/Flow/BookableFlowDone.vue";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import FlowFrame from "@/components/commons/FlowFrame.vue";
import { FLOW_STEPS } from "@/utils/bookableFlow";
import { revealField } from "@/utils/bookableFieldAnchor";

/** The question of a step whose component asks none itself, by step. */
const STEP_QUESTIONS = {
  permission: "bookable.permission.who",
};

const STEP_COMPONENTS = {
  identity: "BookableEditIdentity",
  availability: "BookableFlowAvailability",
  price: "BookableEditPrice",
  amount: "BookableEditAmount",
  permission: "BookableEditPermission",
  approval: "BookableEditConfirmation",
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
 *
 * The frame - dots or step list, heading, panel, footer and the overview
 * beside it - is `FlowFrame`, shared with the event's flow.
 */
export default {
  name: "BookableFlow",
  components: {
    BookableEditIdentity,
    BookableFlowAvailability,
    BookableEditPrice,
    BookableEditAmount,
    BookableEditPermission,
    BookableEditConfirmation,
    BookableFlowMore,
    BookableEditPublication,
    BookableFlowDone,
    BookableFlowSummary,
    FlowFrame,
  },
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
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
    // The question the panel asks, where the step's component leaves it to
    // the frame - as the card's heading does on the editing page.
    stepQuestion() {
      return STEP_QUESTIONS[this.step] || null;
    },
    stepProps() {
      return this.step === "publication" ? { level: this.level } : {};
    },
    /** The steps as the frame shows them. */
    frameSteps() {
      return this.steps.map((key) => ({
        key,
        title: this.$t(`bookable.flow.steps.${key}.title`),
      }));
    },
  },
  watch: {
    // „Weiteres Buchungsobjekt anlegen“ starts over on the same page.
    outcome(outcome) {
      if (!outcome) Object.assign(this, startingPoint(this.isNew));
    },
  },
  methods: {
    /**
     * Opens the step `step`, as its dot does: a refused save asks for it.
     * With `area`, the step „Weitere Einstellungen“ opens that area too - a
     * link of the confirmation leads there.
     */
    openStep(step, area = null) {
      this.goTo(this.steps.indexOf(step));
      if (area) this.$nextTick(() => this.$refs.step?.reveal?.(area));
    },
    /**
     * A row of the overview: its step, there its area of „Weitere
     * Einstellungen“ or its field (`{ step, field, area }`).
     */
    openField({ step, field, area }) {
      this.openStep(step, area);
      if (field) this.$nextTick(() => revealField(this.$el, field));
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
.bookable-flow__done {
  max-width: var(--scb-editor-width-max);
  margin: 0 auto;
  padding-bottom: var(--scb-space-6);
}
</style>
