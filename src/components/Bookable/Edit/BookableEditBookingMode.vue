<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import bookableEditing from "@/mixins/bookableEditing";
import { applyBookingMode, timeModeOf } from "@/utils/bookableFlow";
import { bookingModeOf } from "@/utils/bookableBookingMode";
import BookableExternalNote from "@/components/Bookable/Edit/BookableExternalNote.vue";

const LONG_RANGE_MODES = ["week", "month"];

/**
 * The Buchungsart, in both modes: up to three questions as segment bars -
 * whether a time is booked, how, and for „Langzeit“ weeks or months - with
 * what bookers do beneath the last one. An answer goes out through
 * `applyBookingMode`. Zeiträume, Ganze Wochen and Ganze Monate follow the
 * expert-mode rule, each on its own.
 *
 * Where a provider handles the availability, only a note shows, with a jump
 * to the provider's setting (`open-section` with `{ tabKey, sectionId }`).
 * The frame is the mode's: a card on the editing page, the step's panel in
 * the guided flow; the sections of the chosen mode follow in the frame.
 */
export default {
  name: "BookableEditBookingMode",
  components: { FlowSegmented, BookableExternalNote },
  mixins: [bookableEditing],
  computed: {
    external() {
      return this.providerTakesOver("availability");
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
    longRange() {
      return this.timeMode === "longRange";
    },
    timedOptions() {
      return [
        { value: "no", label: this.$t("bookable.availability.timed-no") },
        {
          value: "yes",
          label: this.$t("bookable.availability.timed-yes"),
        },
      ];
    },
    timeModeOptions() {
      const modes = ["schedule", "timePeriod"];
      if (this.expertOptionShown("blockPeriod")) modes.push("blockPeriod");
      if (this.longRangeModes.length) modes.push("longRange");
      return modes.map((value) => ({
        value,
        label: this.$t(`bookable.availability.modes.${value}`),
      }));
    },
    longRangeModes() {
      return LONG_RANGE_MODES.filter((mode) => this.expertOptionShown(mode));
    },
    longRangeOptions() {
      return this.longRangeModes.map((value) => ({
        value,
        label: this.$t(`bookable.availability.long-range-${value}`),
      }));
    },
  },
  methods: {
    choose(answer) {
      this.apply((next) =>
        applyBookingMode(next, answer, [
          ...this.timeModeOptions.map((option) => option.value),
          ...this.longRangeModes,
        ])
      );
    },
    setTimed(value) {
      if ((value === "yes") === this.timed) return;
      this.choose(value === "yes" ? "timed" : "independent");
    },
    setTimeMode(timeMode) {
      if (timeMode === this.timeMode) return;
      this.choose(timeMode);
    },
    setLongRange(mode) {
      if (mode === this.bookingMode) return;
      this.choose(mode);
    },
  },
};
</script>

<template>
  <div class="booking-mode" data-test="booking-mode" data-field="bookingMode">
    <BookableExternalNote
      v-if="external"
      :title="$t('bookable.availability.external-title')"
      :text="$t('bookable.availability.external-text')"
      test-id="booking-mode-external"
      @open-section="$emit('open-section', $event)"
    />

    <template v-else>
      <div class="booking-mode__question">
        <div class="booking-mode__label">
          {{ $t("bookable.availability.timed") }}
        </div>
        <FlowSegmented
          :value="timed ? 'yes' : 'no'"
          :options="timedOptions"
          :label="$t('bookable.availability.timed')"
          test-id="booking-mode-timed"
          @input="setTimed"
        />
      </div>

      <div v-if="timed" class="booking-mode__question">
        <div class="booking-mode__label">
          {{ $t("bookable.availability.mode") }}
        </div>
        <FlowSegmented
          :value="timeMode"
          :options="timeModeOptions"
          :label="$t('bookable.availability.mode')"
          test-id="booking-mode-time"
          @input="setTimeMode"
        />
      </div>

      <div v-if="longRange" class="booking-mode__question">
        <div class="booking-mode__label">
          {{ $t("bookable.availability.long-range") }}
        </div>
        <FlowSegmented
          :value="bookingMode"
          :options="longRangeOptions"
          :label="$t('bookable.availability.long-range')"
          test-id="booking-mode-long-range"
          @input="setLongRange"
        />
      </div>

      <p class="booking-mode__explain" data-test="booking-mode-explain">
        {{ $t(`bookable.availability.explain.${bookingMode}`) }}
      </p>
      <p
        v-if="longRange"
        class="booking-mode__note"
        data-test="booking-mode-long-range-info"
      >
        {{ $t("bookable.availability.long-range-info") }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.booking-mode__question + .booking-mode__question {
  margin-top: var(--scb-space-5);
}

.booking-mode__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.booking-mode__explain {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.booking-mode__note {
  margin: var(--scb-space-3) 0 0;
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}
</style>
