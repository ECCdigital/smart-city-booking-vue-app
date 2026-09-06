<template>
  <v-sheet class="px-4 py-3 status-indicator" rounded>
    <div class="d-flex flex-wrap align-center">
      <span v-if="label" class="text-subtitle-2 mr-2 my-1">{{ label }}</span>
      <v-chip
        class="booking-status-chip mr-2 my-1"
        :color="statusColor(status)"
        text-color="white"
        small
      >
        <v-icon small left>{{ statusIcon(status) }}</v-icon>
        {{ statusLabel(status) }}
      </v-chip>
      <v-chip
        v-if="booking && isFree(booking)"
        class="booking-status-free mr-2 my-1"
        :color="freeMarker().color"
        :text-color="freeMarker().textColor"
        small
      >
        <v-icon small left>{{ freeMarker().icon }}</v-icon>
        {{ freeMarker().label }}
      </v-chip>
      <span
        v-if="paidAt"
        class="booking-status-paid-at text--secondary text-body-2 mr-2 my-1"
      >
        {{ $t("booking.status.paidAt", { date: paidAt }) }}
      </span>
      <v-spacer />
      <v-btn
        v-for="action in actions"
        :key="action"
        class="booking-action ml-2 my-1"
        :color="actionColor(action)"
        :disabled="disabled"
        small
        outlined
        @click="$emit('action', action)"
      >
        <v-icon small left>{{ actionIcon(action) }}</v-icon>
        {{ actionLabel(action, status) }}
      </v-btn>
    </div>
    <div
      v-if="hint"
      class="booking-status-hint text-caption text--secondary mt-1"
    >
      {{ hint }}
    </div>
  </v-sheet>
</template>

<script>
import {
  BOOKING_STATUS,
  actionColor,
  actionIcon,
  actionLabel,
  freeMarker,
  isFree,
  statusColor,
  statusIcon,
  statusLabel,
} from "@/utils/bookingStatus";

/**
 * The state as one chip beside the Kostenfrei marker and the paid date,
 * and one button per action the host offers (spec E4, E2). The three hosts
 * of `BookingTransitions` - the edit form, the detail drawer and the series
 * drawer - render this and decide the actions themselves; the bar only
 * reports the click.
 */
export default {
  name: "BookingStatusBar",
  props: {
    /** The state shown: a booking's `status`, or a series' derived one. */
    status: {
      type: String,
      default: null,
    },
    /** The booking behind the state, for the Kostenfrei marker and the paid date; a series hands none. */
    booking: {
      type: Object,
      default: null,
    },
    /** The `BOOKING_ACTION`s offered, one button each. */
    actions: {
      type: Array,
      default: () => [],
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    /** A line under the row, e.g. why the actions are locked. */
    hint: {
      type: String,
      default: null,
    },
    /** A leading label, e.g. "Zustand der Serie". */
    label: {
      type: String,
      default: null,
    },
  },
  computed: {
    /** The paid date is shown at Bestätigt only (glossary); a cancelled booking keeps it out of sight. */
    paidAt() {
      if (
        this.booking?.status !== BOOKING_STATUS.CONFIRMED ||
        !this.booking.timePaid
      ) {
        return null;
      }
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(this.booking.timePaid));
    },
  },
  methods: {
    actionColor,
    actionIcon,
    actionLabel,
    freeMarker,
    isFree,
    statusColor,
    statusIcon,
    statusLabel,
  },
};
</script>

<style scoped>
.status-indicator {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-indicator {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
