<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import SectionCard from "@/components/commons/SectionCard.vue";
import bookableEditing from "@/mixins/bookableEditing";
import {
  bookableEditSectionElementId,
  getVisibleBookableEditSections,
} from "@/utils/bookableEditSections";

/**
 * A tab of the editing page made of cards (`BOOKABLE_EDIT_TABS`): the tab's
 * heading, then each card it shows - a component on `bookableEditing` in a
 * section card with its heading. The frame is the editing page's; the
 * component inside knows no mode, so the guided flow shows the same one in
 * its own frame. A card shows while its section and its expert option do.
 */
export default {
  name: "BookableEditTab",
  components: { BaseSection, SectionCard },
  mixins: [bookableEditing],
  props: {
    tab: { type: Object, required: true },
    sectionTarget: { type: String, default: null },
  },
  computed: {
    visibleSectionIds() {
      return getVisibleBookableEditSections(this.tab.key, {
        bookable: this.bookable,
        shown: this.expertOptionShown,
        accessPoints: this.bookableAccessPoints.list,
      }).map((section) => section.id);
    },
    cards() {
      return this.tab.cards.filter(
        (card) =>
          (!card.option || this.expertOptionShown(card.option)) &&
          (!card.section || this.visibleSectionIds.includes(card.section))
      );
    },
  },
  methods: {
    elementId(card) {
      return card.section ? bookableEditSectionElementId(card.section) : null;
    },
    cardProps(card) {
      return card.sectionTarget ? { sectionTarget: this.sectionTarget } : {};
    },
  },
};
</script>

<template>
  <div>
    <BaseSection :title="$t(tab.labelKey)" :icon="tab.icon" />
    <template v-for="card in cards">
      <component
        :is="card.comp"
        v-if="card.bare"
        :key="card.key"
        :bookable="bookable"
        v-bind="cardProps(card)"
        @update:bookable="$emit('update:bookable', $event)"
        @open-section="$emit('open-section', $event)"
      />
      <SectionCard
        v-else
        :id="elementId(card)"
        :key="card.key"
        :icon="card.icon"
        :title="$t(card.titleKey)"
      >
        <component
          :is="card.comp"
          :bookable="bookable"
          v-bind="cardProps(card)"
          @update:bookable="$emit('update:bookable', $event)"
          @open-section="$emit('open-section', $event)"
        />
      </SectionCard>
    </template>
  </div>
</template>
