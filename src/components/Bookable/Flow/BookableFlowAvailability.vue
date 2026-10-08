<template>
  <div data-test="flow-availability">
    <div v-if="external" class="flow-note flow-note--warning">
      <div class="flow-note__title">
        {{ $t("bookable.flow.availability.external-title") }}
      </div>
      {{ $t("bookable.flow.availability.external-text") }}
    </div>

    <template v-else>
      <div class="flow-field">
        <div class="flow-question">
          {{ $t("bookable.flow.availability.timed") }}
        </div>
        <FlowSegmented
          :value="timed ? 'yes' : 'no'"
          :options="timedOptions"
          :label="$t('bookable.flow.availability.timed')"
          test-id="flow-timed"
          @input="setTimed($event === 'yes')"
        />
      </div>

      <p v-if="!timed" class="flow-note mb-0" data-test="flow-untimed">
        {{ $t("bookable.flow.availability.untimed-info") }}
      </p>

      <template v-else>
        <div class="flow-field">
          <div class="flow-question">
            {{ $t("bookable.flow.availability.mode") }}
          </div>
          <FlowSegmented
            :value="timeMode"
            :options="modeOptions"
            :label="$t('bookable.flow.availability.mode')"
            test-id="flow-time-mode"
            @input="setTimeMode"
          />
          <div class="flow-field__hint">
            {{ $t(`bookable.flow.availability.explain.${bookingMode}`) }}
          </div>
        </div>

        <div v-if="timeMode === 'longRange'" class="flow-rule">
          <div class="flow-question">
            {{ $t("bookable.flow.availability.long-range") }}
          </div>
          <FlowSegmented
            :value="bookingMode"
            :options="longRangeOptions"
            :label="$t('bookable.flow.availability.long-range')"
            test-id="flow-long-range"
            @input="setMode"
          />
          <p class="flow-note mt-3 mb-0">
            {{ $t("bookable.flow.availability.long-range-info") }}
          </p>
        </div>

        <!-- The settings of the chosen type and the opening hours are the
             editor's own sections, as the booking type and opening hours
             tabs show them. -->
        <div v-if="showsTypeSettings" class="flow-rule">
          <BookableEditBookingType
            :key="bookingMode"
            :bookable="bookable"
            embedded
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
    </template>
  </div>
</template>

<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";
import bookableEditing from "@/mixins/bookableEditing";
import {
  applyBookingMode,
  bookingModeOf,
  handlesExternalAvailability,
  timeModeOf,
  usesOpeningHours,
} from "@/utils/bookableFlow";

/**
 * Step 2, Verfügbarkeit: two questions after the cloud variant - whether a
 * time is booked at all, then how - and beneath them the editor's sections
 * for the chosen type. Zeiträume and Langzeit are offered where the editor
 * offers them: in expert mode, or when the bookable already uses them.
 */
export default {
  name: "BookableFlowAvailability",
  components: {
    FlowSegmented,
    BookableEditBookingType,
    BookableEditOpeningHours,
  },
  mixins: [bookableEditing],
  computed: {
    external() {
      return handlesExternalAvailability(this.bookable);
    },
    bookingMode() {
      return bookingModeOf(this.bookable);
    },
    timeMode() {
      return timeModeOf(this.bookable);
    },
    timed() {
      return this.bookingMode !== "independent";
    },
    showsTypeSettings() {
      return ["schedule", "timePeriod", "blockPeriod"].includes(
        this.bookingMode
      );
    },
    showsOpeningHours() {
      return usesOpeningHours(this.bookable);
    },
    timedOptions() {
      return [
        { value: "no", label: this.$t("bookable.flow.availability.timed-no") },
        {
          value: "yes",
          label: this.$t("bookable.flow.availability.timed-yes"),
        },
      ];
    },
    modeOptions() {
      const modes = ["schedule", "timePeriod"];
      if (this.expertOptionShown("blockPeriod")) modes.push("blockPeriod");
      if (this.longRangeModes.length) modes.push("longRange");
      return modes.map((value) => ({
        value,
        label: this.$t(`bookable.flow.availability.modes.${value}`),
      }));
    },
    // Each its own expert option: one in use shows without the other.
    longRangeModes() {
      return ["week", "month"].filter((mode) => this.expertOptionShown(mode));
    },
    longRangeOptions() {
      return this.longRangeModes.map((value) => ({
        value,
        label: this.$t(`bookable.flow.availability.long-range-${value}`),
      }));
    },
  },
  methods: {
    setMode(mode) {
      this.apply((next) => applyBookingMode(next, mode));
    },
    setTimed(timed) {
      if (timed === this.timed) return;
      this.setMode(timed ? "schedule" : "independent");
    },
    setTimeMode(timeMode) {
      if (timeMode === this.timeMode) return;
      this.setMode(
        timeMode === "longRange" ? this.longRangeModes[0] : timeMode
      );
    },
  },
};
</script>
