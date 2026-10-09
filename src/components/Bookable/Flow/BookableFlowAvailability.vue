<template>
  <div data-test="flow-availability">
    <BookableEditBookingMode
      :bookable="bookable"
      @update:bookable="$emit('update:bookable', $event)"
      @open-section="$emit('open-section', $event)"
    />

    <!-- The sections of the chosen mode as the editing page shows them; the
         opening hours, there a tab of their own, follow here. -->
    <template v-if="!external">
      <div v-if="showsTypeSettings" class="flow-rule">
        <BookableEditBookingType
          :bookable="bookable"
          @update:bookable="$emit('update:bookable', $event)"
        />
      </div>
      <div v-if="showsOpeningHours" class="flow-rule">
        <BookableEditOpeningHours
          :bookable="bookable"
          embedded
          @update:bookable="$emit('update:bookable', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script>
import BookableEditBookingMode from "@/components/Bookable/Edit/BookableEditBookingMode.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";
import bookableEditing from "@/mixins/bookableEditing";
import { bookingModeOf, usesOpeningHours } from "@/utils/bookableFlow";

/**
 * Step 2, Verfügbarkeit: the Buchungsart (`BookableEditBookingMode`, the
 * editing page's card), the sections of the chosen mode and the opening
 * hours. Where a provider handles the availability only its note shows.
 */
export default {
  name: "BookableFlowAvailability",
  components: {
    BookableEditBookingMode,
    BookableEditBookingType,
    BookableEditOpeningHours,
  },
  mixins: [bookableEditing],
  computed: {
    external() {
      return this.providerTakesOver("availability");
    },
    showsTypeSettings() {
      return ["schedule", "timePeriod", "blockPeriod"].includes(
        bookingModeOf(this.bookable)
      );
    },
    showsOpeningHours() {
      return usesOpeningHours(this.bookable);
    },
  },
};
</script>
