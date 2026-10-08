<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import bookableEditing from "@/mixins/bookableEditing";
import {
  applyBookingMode,
  bookingModeOf,
  handlesExternalAvailability,
  timeModeOf,
} from "@/utils/bookableFlow";
import { EXTERNAL_PROVIDER_SETTING } from "@/utils/bookableEditSections";

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
  components: { FlowSegmented },
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
    longRange() {
      return this.timeMode === "longRange";
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
    timeModeOptions() {
      const modes = ["schedule", "timePeriod"];
      if (this.expertOptionShown("blockPeriod")) modes.push("blockPeriod");
      if (this.longRangeModes.length) modes.push("longRange");
      return modes.map((value) => ({
        value,
        label: this.$t(`bookable.flow.availability.modes.${value}`),
      }));
    },
    longRangeModes() {
      return LONG_RANGE_MODES.filter((mode) => this.expertOptionShown(mode));
    },
    longRangeOptions() {
      return this.longRangeModes.map((value) => ({
        value,
        label: this.$t(`bookable.flow.availability.long-range-${value}`),
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
    openSetting() {
      this.$emit("open-section", { ...EXTERNAL_PROVIDER_SETTING });
    },
  },
};
</script>

<template>
  <div class="booking-mode" data-test="booking-mode" data-field="bookingMode">
    <div
      v-if="external"
      class="booking-mode__note booking-mode__note--warning"
      data-test="booking-mode-external"
    >
      <div class="booking-mode__note-title">
        {{ $t("bookable.flow.availability.external-title") }}
      </div>
      <p class="mb-2">
        {{ $t("bookable.flow.availability.external-text") }}
      </p>
      <button
        type="button"
        class="booking-mode__link"
        data-test="booking-mode-external-link"
        @click="openSetting"
      >
        {{ $t("bookable.flow.availability.external-link") }}
        <v-icon small color="primary">mdi-arrow-right</v-icon>
      </button>
    </div>

    <template v-else>
      <div class="booking-mode__question">
        <div class="booking-mode__label">
          {{ $t("bookable.flow.availability.timed") }}
        </div>
        <FlowSegmented
          :value="timed ? 'yes' : 'no'"
          :options="timedOptions"
          :label="$t('bookable.flow.availability.timed')"
          test-id="booking-mode-timed"
          @input="setTimed"
        />
      </div>

      <div v-if="timed" class="booking-mode__question">
        <div class="booking-mode__label">
          {{ $t("bookable.flow.availability.mode") }}
        </div>
        <FlowSegmented
          :value="timeMode"
          :options="timeModeOptions"
          :label="$t('bookable.flow.availability.mode')"
          test-id="booking-mode-time"
          @input="setTimeMode"
        />
      </div>

      <div v-if="longRange" class="booking-mode__question">
        <div class="booking-mode__label">
          {{ $t("bookable.flow.availability.long-range") }}
        </div>
        <FlowSegmented
          :value="bookingMode"
          :options="longRangeOptions"
          :label="$t('bookable.flow.availability.long-range')"
          test-id="booking-mode-long-range"
          @input="setLongRange"
        />
      </div>

      <p class="booking-mode__explain" data-test="booking-mode-explain">
        {{ $t(`bookable.flow.availability.explain.${bookingMode}`) }}
      </p>
      <p
        v-if="longRange"
        class="booking-mode__note"
        data-test="booking-mode-long-range-info"
      >
        {{ $t("bookable.flow.availability.long-range-info") }}
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

.booking-mode__note--warning {
  margin-top: 0;
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}

.booking-mode__note-title {
  margin-bottom: 2px;
  font-weight: var(--scb-font-weight-semibold);
}

.booking-mode__link {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-1);
  padding: 0;
  font: inherit;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-link);
  background: none;
  border: 0;
  cursor: pointer;
}

.booking-mode__link:hover,
.booking-mode__link:focus-visible {
  text-decoration: underline;
}
</style>
