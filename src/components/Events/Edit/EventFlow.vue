<script>
import FlowFrame from "@/components/commons/FlowFrame.vue";
import EventEditPublication from "./EventEditPublication.vue";
import EventEditOverview from "./EventEditOverview.vue";
import { EVENT_EDIT_TABS } from "./eventEditTabs";

const PUBLICATION = "publication";

// The steps: the tabs of the editing page in their order, then the
// publication, where the flow saves.
const STEPS = Object.freeze([
  ...EVENT_EDIT_TABS.map((tab) => ({ key: tab.key, comp: tab.comp })),
  { key: PUBLICATION, comp: null },
]);

/**
 * The guided flow of an event, in the frame of the bookable's
 * (`FlowFrame`): one step per tab of the editing page, each asking its
 * question, the same cards in it, and the publication last, where „Speichern“
 * saves once. It edits the form of the `events` store and saves nothing
 * itself: `save` asks `EventEdit`, which answers a refused save with
 * `openIssue`. The steps can be visited in any order; „Weiter“ never holds.
 */
export default {
  name: "EventFlow",
  components: { FlowFrame, EventEditPublication, EventEditOverview },
  props: {
    isNew: { type: Boolean, default: false },
    // The issues of the event (`eventIssues`).
    issues: { type: Array, default: () => [] },
    inProgress: { type: Boolean, default: false },
    saveFailed: { type: Boolean, default: false },
    // What the publication band takes (`EventEditPublication`).
    allowPublic: { type: Boolean, default: true },
    review: { type: Object, default: null },
    supervisionLevel: { type: String, default: null },
    tenantId: { type: String, default: null },
  },
  data() {
    const keys = STEPS.map((step) => step.key);
    return {
      index: 0,
      // A new event has been through no step yet, an existing one through all.
      done: this.isNew ? [] : [...keys],
      visited: this.isNew ? [keys[0]] : [...keys],
    };
  },
  computed: {
    step() {
      return STEPS[this.index];
    },
    frameSteps() {
      return STEPS.map(({ key }) => ({
        key,
        title: this.$t(`event.flow.steps.${key}.title`),
      }));
    },
    // The overview lists the tabs; the publication has its own band.
    tabs() {
      return EVENT_EDIT_TABS;
    },
    /** A step left with a missing required field turns red. */
    alertKeys() {
      const keys = this.issues.map((issue) => issue.tab);
      return this.visited.filter(
        (key) => key !== this.step.key && keys.includes(key)
      );
    },
  },
  methods: {
    goTo(idx) {
      if (idx < 0 || idx >= STEPS.length) return;
      if (idx > this.index && !this.done.includes(this.step.key)) {
        this.done.push(this.step.key);
      }
      this.index = idx;
      if (!this.visited.includes(this.step.key)) {
        this.visited.push(this.step.key);
      }
      this.$el
        .closest(".admin-page__body--scroll")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    },
    /** Opens the step of `tab` and in it `field`, as a refused save asks. */
    openIssue({ tab, field = null }) {
      this.goTo(STEPS.findIndex((step) => step.key === tab));
      if (!field) return;
      this.$nextTick(() => {
        const el = this.$el.querySelector(`[data-field="${field}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.matches("input, textarea")
          ? el
          : el.querySelector("input, textarea");
        input?.focus({ preventScroll: true });
      });
    },
  },
};
</script>

<template>
  <FlowFrame
    :steps="frameSteps"
    :index="index"
    :done="done"
    :alert-keys="alertKeys"
    :title="$t(`event.flow.steps.${step.key}.question`)"
    :why="$t(`event.flow.steps.${step.key}.why`)"
    :panel="false"
    :in-progress="inProgress"
    :save-failed="saveFailed"
    :save-failed-text="$t('event.flow.save-failed')"
    :save-hint="$t('event.flow.save-hint')"
    data-test="event-flow"
    @go="goTo"
    @save="$emit('save')"
  >
    <v-sheet
      v-if="step.key === 'publication'"
      class="px-4 py-3 event-flow__band"
      rounded
    >
      <EventEditPublication
        :allow-public="allowPublic"
        :review="review"
        :supervision-level="supervisionLevel"
        :tenant-id="tenantId"
        @update:review="$emit('update:review', $event)"
      />
    </v-sheet>
    <keep-alive v-else>
      <component :is="step.comp" :key="step.key" />
    </keep-alive>

    <template #overview>
      <EventEditOverview :issues="issues" :tabs="tabs" @go="openIssue" />
    </template>
  </FlowFrame>
</template>

<style scoped>
.event-flow__band {
  background-color: var(--scb-surface-raised) !important;
}
</style>
