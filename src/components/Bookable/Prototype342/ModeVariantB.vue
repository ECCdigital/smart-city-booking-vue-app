<!-- PROTOTYPE (ECCdigital/tickets#342), throwaway: never merge.
     Variant B, „Fragen des Ablaufs“: up to three questions as segmented
     bars - a time at all, how, and for the long range weeks or months -
     with what the booker does beneath. -->
<template>
  <div class="proto-b">
    <div class="proto-b__field">
      <div class="proto-b__question">
        Wird dieses Objekt für eine Zeit gebucht?
      </div>
      <FlowSegmented
        :value="timed ? 'yes' : 'no'"
        :options="[
          { value: 'no', label: naming.labels.independent },
          { value: 'yes', label: 'Für eine Zeit' },
        ]"
        test-id="proto-b-timed"
        @input="setTimed($event === 'yes')"
      />
      <div v-if="!timed" class="proto-b__hint">{{ EXPLAIN.independent }}</div>
    </div>

    <template v-if="timed">
      <div class="proto-b__field">
        <div class="proto-b__question">Wie wird die Zeit gebucht?</div>
        <FlowSegmented
          :value="timeMode"
          :options="timeModeOptions"
          test-id="proto-b-time-mode"
          @input="setTimeMode"
        />
        <div v-if="timeMode !== 'longRange'" class="proto-b__hint">
          {{ EXPLAIN[mode] }}
        </div>
      </div>

      <div v-if="timeMode === 'longRange'" class="proto-b__field">
        <div class="proto-b__question">Wochen oder Monate?</div>
        <FlowSegmented
          :value="mode"
          :options="longRangeOptions"
          test-id="proto-b-long-range"
          @input="$emit('choose', $event)"
        />
        <div class="proto-b__hint">{{ EXPLAIN[mode] }}</div>
      </div>
    </template>
  </div>
</template>

<script>
import FlowSegmented from "@/components/Bookable/Flow/FlowSegmented.vue";
import { EXPLAIN } from "./bookingModeShared";

export default {
  name: "ModeVariantB",
  components: { FlowSegmented },
  props: {
    mode: { type: String, required: true },
    modes: { type: Array, required: true },
    naming: { type: Object, required: true },
  },
  data: () => ({ EXPLAIN }),
  computed: {
    timed() {
      return this.mode !== "independent";
    },
    timeMode() {
      return this.mode === "week" || this.mode === "month"
        ? "longRange"
        : this.mode;
    },
    timeModeOptions() {
      const options = ["schedule", "timePeriod", "blockPeriod"]
        .filter((m) => this.modes.includes(m))
        .map((m) => ({ value: m, label: this.naming.labels[m] }));
      if (this.modes.includes("week") || this.modes.includes("month")) {
        options.push({ value: "longRange", label: this.naming.longRange });
      }
      return options;
    },
    longRangeOptions() {
      return ["week", "month"]
        .filter((m) => this.modes.includes(m))
        .map((m) => ({ value: m, label: this.naming.labels[m] }));
    },
  },
  methods: {
    setTimed(timed) {
      if (timed === this.timed) return;
      this.$emit("choose", timed ? "schedule" : "independent");
    },
    setTimeMode(timeMode) {
      if (timeMode === this.timeMode) return;
      this.$emit("choose", timeMode === "longRange" ? "week" : timeMode);
    },
  },
};
</script>

<style scoped>
.proto-b__field + .proto-b__field {
  margin-top: var(--scb-space-5);
}
.proto-b__question {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.proto-b__hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>
