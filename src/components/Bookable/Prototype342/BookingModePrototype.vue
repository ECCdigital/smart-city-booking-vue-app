<!-- PROTOTYPE (ECCdigital/tickets#342), throwaway: never merge.
     Three variants of one booking-mode choice for the editor's tab
     „Buchungstyp“ and the flow's step „Verfügbarkeit“, switchable via
     `?variant=A|B|C` (`0` = today's component) on the existing bookable
     routes; the names via `?namen=E|A|N`. Beneath the choice the shared
     sections stay as they are (BookableEditBookingType `embedded`; in the
     flow also the opening hours, which the editor keeps in its own tab).
     One rule in both modes: an external provider replaces the choice with a
     note, expert modes per #339, a choice lands via `applyBookingMode`. -->
<template>
  <div>
    <component
      :is="todayComp"
      v-if="variantKey === '0'"
      v-bind="$attrs"
      :bookable="bookable"
      @update:bookable="$emit('update:bookable', $event)"
    />

    <component
      :is="flow ? 'div' : 'BaseSection'"
      v-else
      :title="naming.title"
      icon="mdi-calendar-clock"
      class="proto-342"
    >
      <div v-if="external" class="proto-342__note proto-342__note--warning">
        <div class="proto-342__note-title">{{ EXTERNAL.title }}</div>
        {{ EXTERNAL.text }}
      </div>

      <template v-else>
        <component
          :is="current.comp"
          :mode="mode"
          :modes="modes"
          :naming="naming"
          @choose="choose"
        />

        <p
          v-if="mode === 'week' || mode === 'month'"
          class="proto-342__note mt-4 mb-0"
        >
          {{ LONG_RANGE_INFO }}
        </p>

        <div v-if="showsTypeSettings" class="proto-342__rule">
          <BookableEditBookingType
            :key="mode"
            :bookable="bookable"
            embedded
            @update:bookable="$emit('update:bookable', $event)"
          />
        </div>
        <div v-if="flow && showsOpeningHours" class="proto-342__rule">
          <BookableEditOpeningHours
            :bookable="bookable"
            embedded
            @update:bookable="$emit('update:bookable', $event)"
          />
        </div>
      </template>
    </component>

    <PrototypeSwitcher
      :variants="variants"
      :current="variantKey"
      :namings="namingList"
      :naming="namingKey"
    />
  </div>
</template>

<script>
import _ from "lodash";
import BaseSection from "@/components/commons/BaseSection.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";
import BookableFlowAvailability from "@/components/Bookable/Flow/BookableFlowAvailability.vue";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import { isFlowMode, usesOpeningHours } from "@/utils/bookableFlow";
import ModeVariantA from "./ModeVariantA.vue";
import ModeVariantB from "./ModeVariantB.vue";
import ModeVariantC from "./ModeVariantC.vue";
import PrototypeSwitcher from "./PrototypeSwitcher.vue";
import {
  EXTERNAL,
  LONG_RANGE_INFO,
  NAMINGS,
  applyBookingMode,
  bookingModeOf,
  handlesExternalAvailability,
  offeredModes,
} from "./bookingModeShared";

export default {
  name: "BookingModePrototype",
  components: {
    BaseSection,
    BookableEditBookingType,
    BookableEditOpeningHours,
    PrototypeSwitcher,
  },
  mixins: [bookableExpertMode],
  inheritAttrs: false,
  props: {
    bookable: { type: Object, required: true },
  },
  data: () => ({ EXTERNAL, LONG_RANGE_INFO }),
  computed: {
    flow() {
      return isFlowMode({
        bookableId: this.$route.query.id,
        mode: this.$route.query.mode,
      });
    },
    todayComp() {
      return this.flow ? BookableFlowAvailability : BookableEditBookingType;
    },
    variants() {
      return [
        { key: "A", name: "Radio-Liste des Editors", comp: ModeVariantA },
        { key: "B", name: "Fragen des Ablaufs", comp: ModeVariantB },
        { key: "C", name: "Neu: Kacheln mit Vorschau", comp: ModeVariantC },
        { key: "0", name: "Heute", comp: null },
      ];
    },
    variantKey() {
      const key = String(this.$route.query.variant || "A").toUpperCase();
      return this.variants.some((v) => v.key === key) ? key : "A";
    },
    current() {
      return this.variants.find((v) => v.key === this.variantKey);
    },
    namingList() {
      return Object.keys(NAMINGS).map((key) => ({
        key,
        name: NAMINGS[key].name,
      }));
    },
    namingKey() {
      const key = String(this.$route.query.namen || "N").toUpperCase();
      return NAMINGS[key] ? key : "N";
    },
    naming() {
      return NAMINGS[this.namingKey];
    },
    external() {
      return handlesExternalAvailability(this.bookable);
    },
    mode() {
      return bookingModeOf(this.bookable);
    },
    modes() {
      return offeredModes(this.bookable, this.expertMode);
    },
    showsTypeSettings() {
      return ["schedule", "timePeriod", "blockPeriod"].includes(this.mode);
    },
    showsOpeningHours() {
      return usesOpeningHours(this.bookable);
    },
  },
  methods: {
    choose(mode) {
      if (mode === this.mode) return;
      const next = _.cloneDeep(this.bookable);
      applyBookingMode(next, mode);
      this.$emit("update:bookable", next);
    },
  },
};
</script>

<style scoped>
.proto-342__rule {
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}
.proto-342__note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}
.proto-342__note--warning {
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}
.proto-342__note-title {
  margin-bottom: 2px;
  font-weight: var(--scb-font-weight-semibold);
}
</style>
