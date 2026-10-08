<script>
import BaseSection from "@/components/commons/BaseSection.vue";
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
  components: { BaseSection },
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
    <BaseSection :title="tab.label" :icon="tab.icon" />
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
      <v-card
        v-else
        :id="elementId(card)"
        :key="card.key"
        class="mb-6 section-card"
        outlined
      >
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">{{ card.icon }}</v-icon>
          <span class="text-h6 font-weight-bold">{{ $t(card.titleKey) }}</span>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <component
            :is="card.comp"
            :bookable="bookable"
            v-bind="cardProps(card)"
            @update:bookable="$emit('update:bookable', $event)"
            @open-section="$emit('open-section', $event)"
          />
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>
