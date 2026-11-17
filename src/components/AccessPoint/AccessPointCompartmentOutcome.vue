<script>
// The look of the sentence by case: fitting, differing, or still to do.
const TONES = {
  empty: { tone: "neutral", icon: "mdi-gesture-tap" },
  unknown: { tone: "neutral", icon: "mdi-information-outline" },
  unassigned: { tone: "neutral", icon: "mdi-information-outline" },
  fits: { tone: "ok", icon: "mdi-check-circle-outline" },
  larger: { tone: "warn", icon: "mdi-alert-outline" },
  smaller: { tone: "warn", icon: "mdi-alert-outline" },
  unlimited: { tone: "warn", icon: "mdi-alert-outline" },
};

/**
 * „Was daraus wird“ beside the Fächer of an Open Locker Schließfachanlage
 * (ECCdigital/tickets#1166): three numbers - the Fächer, out of service among
 * them, the Anzahl of the bookable, and how many bookings run at the same
 * time - and the sentence of the case. It shows what `compartmentOutcome`
 * says; the default slot under the sentence takes what the dialog offers on
 * it, such as „Anzahl auf N setzen“.
 */
export default {
  name: "AccessPointCompartmentOutcome",
  props: {
    // What `compartmentOutcome` makes of the Fächer and the bookable.
    outcome: { type: Object, required: true },
  },
  computed: {
    look() {
      return TONES[this.outcome.kind] || TONES.empty;
    },
    // No bookable: a dash; unlimited: the word.
    amountText() {
      if (this.outcome.unlimited) {
        return this.$t("accessPoint.management.dialog.outcome.unlimitedAmount");
      }
      return this.outcome.amount == null ? "–" : String(this.outcome.amount);
    },
    // A dash while the assignment is unknown.
    concurrentText() {
      return this.outcome.concurrent == null
        ? "–"
        : String(this.outcome.concurrent);
    },
  },
};
</script>

<template>
  <div class="compartment-outcome" data-test="compartment-outcome">
    <div class="compartment-outcome__title">
      {{ $t("accessPoint.management.dialog.outcome.title") }}
    </div>
    <div class="compartment-outcome__numbers">
      <div data-test="outcome-compartments">
        <div class="compartment-outcome__value">{{ outcome.count }}</div>
        <div class="compartment-outcome__label">
          {{
            $tc(
              "accessPoint.management.dialog.outcome.compartments",
              outcome.count
            )
          }}
          <span v-if="outcome.outOfService">
            {{
              $t("accessPoint.management.dialog.outcome.outOfService", {
                count: outcome.outOfService,
              })
            }}
          </span>
        </div>
      </div>
      <div class="compartment-outcome__operator" aria-hidden="true">·</div>
      <div data-test="outcome-amount">
        <div
          class="compartment-outcome__value"
          :class="{ 'compartment-outcome__value--word': outcome.unlimited }"
        >
          {{ amountText }}
        </div>
        <div class="compartment-outcome__label">
          {{ $t("accessPoint.management.dialog.outcome.amount") }}
        </div>
      </div>
      <div class="compartment-outcome__operator" aria-hidden="true">→</div>
      <div data-test="outcome-concurrent">
        <div class="compartment-outcome__value">{{ concurrentText }}</div>
        <div class="compartment-outcome__label">
          {{ $t("accessPoint.management.dialog.outcome.concurrent") }}
        </div>
      </div>
    </div>
    <div
      class="compartment-outcome__verdict"
      :class="`compartment-outcome__verdict--${look.tone}`"
      aria-live="polite"
    >
      <v-icon small class="mr-2">{{ look.icon }}</v-icon>
      <span data-test="outcome-text">{{ outcome.text }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.compartment-outcome {
  position: sticky;
  top: 0;
  padding: var(--scb-space-4);
  border-radius: var(--scb-radius-surface);
  background: var(--scb-surface-tint);
}
.compartment-outcome__title {
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
  margin-bottom: var(--scb-space-2);
}
.compartment-outcome__numbers {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-3);
  margin-bottom: var(--scb-space-3);
}
.compartment-outcome__value {
  font-size: var(--scb-font-size-lead);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
}
/* A word in place of a number keeps the line of the numbers. */
.compartment-outcome__value--word {
  font-size: var(--scb-font-size-md);
  line-height: calc(var(--scb-font-size-lead) * var(--scb-line-height-tight));
}
.compartment-outcome__label {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.compartment-outcome__operator {
  font-size: var(--scb-font-size-lead);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text-caption);
}
.compartment-outcome__verdict {
  display: flex;
  align-items: flex-start;
  font-size: var(--scb-font-size-sm);
  padding: var(--scb-space-2) var(--scb-space-3);
  border-radius: var(--scb-radius-control);
  background: var(--scb-surface);
}
.compartment-outcome__verdict--ok {
  background: var(--scb-success-tint);
}
.compartment-outcome__verdict--warn {
  background: var(--scb-warning-tint);
}
</style>
