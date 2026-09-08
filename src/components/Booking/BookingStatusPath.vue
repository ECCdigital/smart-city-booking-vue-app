<template>
  <v-sheet class="booking-status-path px-4 py-3" outlined rounded>
    <div class="d-flex align-center flex-wrap">
      <v-avatar :color="current.color" size="32" class="mr-3 my-1">
        <v-icon dark small>{{ current.icon }}</v-icon>
      </v-avatar>
      <div class="flex-grow-1 d-flex align-center flex-wrap mr-2">
        <span
          v-if="label"
          class="booking-status-label text-caption text--secondary mr-2"
          >{{ label }}</span
        >
        <span
          class="booking-status-word text-h6 font-weight-bold"
          :class="`${current.color}--text`"
          >{{ current.label }}</span
        >
        <v-chip
          v-if="path && path.free"
          class="booking-status-free ml-2"
          :color="freeMarker().color"
          :text-color="freeMarker().textColor"
          x-small
          label
        >
          <v-icon x-small left>{{ freeMarker().icon }}</v-icon>
          {{ freeMarker().label }}
        </v-chip>
      </div>
      <div
        v-if="split.primary || split.secondary.length"
        class="d-flex align-center my-1"
      >
        <v-btn
          v-if="split.primary"
          class="booking-action booking-action-primary"
          :color="actionColor(split.primary)"
          :disabled="disabled"
          small
          depressed
          @click="$emit('action', split.primary)"
        >
          <v-icon small left>{{ actionIcon(split.primary) }}</v-icon>
          {{ actionLabel(split.primary, status) }}
        </v-btn>
        <v-menu v-if="split.secondary.length" offset-y left>
          <template #activator="{ on, attrs }">
            <v-btn
              class="booking-action-menu ml-1"
              :disabled="disabled"
              icon
              small
              v-bind="attrs"
              v-on="on"
            >
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item
              v-for="action in split.secondary"
              :key="action"
              class="booking-action booking-action-secondary"
              @click="$emit('action', action)"
            >
              <v-list-item-icon class="mr-2">
                <v-icon small :color="actionColor(action)">{{
                  actionIcon(action)
                }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>{{
                actionLabel(action, status)
              }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <div
      v-if="path"
      class="booking-status-segments"
      :role="chooser ? 'radiogroup' : null"
      :aria-label="chooser ? label : null"
    >
      <div
        v-for="step in path.steps"
        :key="step.status"
        class="booking-status-segment"
        :class="[
          `booking-status-segment--${step.state}`,
          { 'booking-status-segment--pickable': chooser },
        ]"
        :role="chooser ? 'radio' : null"
        :aria-checked="chooser ? String(step.status === value) : null"
        :tabindex="chooser ? 0 : null"
        @click="choose(step)"
        @keydown.enter.space.prevent="choose(step)"
      >
        <div class="booking-status-segment-bar" :class="barClass(step)" />
        <div class="booking-status-segment-label">
          <v-icon
            v-if="chooser"
            class="booking-status-segment-radio"
            size="13"
            :color="step.status === value ? step.color : null"
            >{{
              step.status === value
                ? "mdi-radiobox-marked"
                : "mdi-radiobox-blank"
            }}</v-icon
          >{{ step.label }}
        </div>
        <div v-if="stepDate(step)" class="booking-status-segment-date">
          {{ stepDate(step) }}
        </div>
      </div>
      <div
        v-if="path.end"
        class="booking-status-segment booking-status-segment--end"
      >
        <div class="booking-status-segment-bar error" />
        <div class="booking-status-segment-label error--text">
          {{ path.end.label }}
        </div>
        <div v-if="path.end.date" class="booking-status-segment-date">
          {{ formatDateTime(path.end.date) }}
        </div>
      </div>
    </div>

    <div v-if="!path && $scopedSlots.default" class="booking-status-body">
      <slot />
    </div>

    <div v-if="hint" class="booking-status-hint text-caption text--secondary">
      {{ hint }}
    </div>

    <div v-if="$scopedSlots.payment" class="booking-status-payment">
      <slot name="payment" />
    </div>

    <div v-if="$scopedSlots.reason" class="booking-status-reason">
      <slot name="reason" />
    </div>
  </v-sheet>
</template>

<script>
import {
  BOOKING_STATUS,
  STEP_STATE,
  actionColor,
  actionIcon,
  actionLabel,
  freeMarker,
  splitActions,
  statusColor,
  statusIcon,
  statusLabel,
} from "@/utils/bookingStatus";

/**
 * The state as a headline over its path (spec N3): an avatar and the state
 * word in the state's colour, the Kostenfrei marker, the one action along
 * the path as a button and the side ways in a menu; under it the path's
 * steps as segments with their dates, and the host's reason block. The
 * hosts of `BookingTransitions` render this with `pathOf(booking)` and
 * decide the actions themselves; the headline only reports the click. A
 * host may word the actions itself (`actionLabel`, the series drawer's
 * "Serie freigeben"), and without a `path` it may fill the default slot
 * with a line of its own where the segments would stand (spec N5).
 *
 * As a `chooser` (spec N6) the same headline is the choice of the state a
 * booking is created in: each segment is a radio - a click, Enter or the
 * space bar reports its state as `input` - the one equal to `value` is
 * checked, and the host's payment fields ride in the `payment` slot under
 * the line. The host builds the draft's path so that the chosen step is
 * current, the ones before done and the rest upcoming.
 */
export default {
  name: "BookingStatusPath",
  props: {
    /** The state shown: a booking's `status`, or a series' derived one. */
    status: {
      type: String,
      default: null,
    },
    /** The path from `pathOf()`; without one only the headline is drawn. */
    path: {
      type: Object,
      default: null,
    },
    /** The `BOOKING_ACTION`s offered: the first primary one as a button, the rest in the menu. */
    actions: {
      type: Array,
      default: () => [],
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    /** A line under the segments, e.g. why the actions are locked. */
    hint: {
      type: String,
      default: null,
    },
    /** A caption before the word, e.g. "Zustand der Serie". */
    label: {
      type: String,
      default: null,
    },
    /** The verb of an action, `(action, status) => word`; the glossary's by default. */
    actionLabel: {
      type: Function,
      default: actionLabel,
    },
    /** Chooser mode: the segments are radios reporting their state as `input`. */
    chooser: {
      type: Boolean,
      default: false,
    },
    /** Chooser mode: the status of the checked segment. */
    value: {
      type: String,
      default: null,
    },
  },
  computed: {
    /** What the headline names: the end of a cut path, else the current step, else the bare status. */
    current() {
      return (
        this.path?.current || {
          label: statusLabel(this.status),
          color: statusColor(this.status),
          icon: statusIcon(this.status),
        }
      );
    },
    split() {
      return splitActions(this.actions);
    },
  },
  methods: {
    actionColor,
    actionIcon,
    freeMarker,
    formatDateTime(value) {
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    },
    /** The line under a segment: the request date at Angefragt, "bezahlt …" at Bestätigt. */
    stepDate(step) {
      if (step.date == null) {
        return null;
      }
      const date = this.formatDateTime(step.date);
      return step.status === BOOKING_STATUS.CONFIRMED
        ? `${this.$t("booking.status.paidShort")} ${date}`
        : date;
    },
    barClass(step) {
      if (step.state === STEP_STATE.DONE) return "success";
      if (step.state === STEP_STATE.CURRENT) return step.color;
      return "booking-status-segment-bar--empty";
    },
    choose(step) {
      if (this.chooser) {
        this.$emit("input", step.status);
      }
    },
  },
};
</script>

<style scoped>
.booking-status-path {
  --gap: 12px;
  --bar-height: 4px;
}
.booking-status-segments {
  display: flex;
  gap: 6px;
  margin-top: var(--gap);
}
.booking-status-segment {
  flex: 1 1 0;
  min-width: 0;
}
.booking-status-segment--end {
  flex: 0 0 22%;
}
.booking-status-segment-bar {
  height: var(--bar-height);
  border-radius: calc(var(--bar-height) / 2);
}
.booking-status-segment-bar--empty {
  background: rgba(0, 0, 0, 0.12);
}
.booking-status-segment--void .booking-status-segment-bar--empty {
  background: repeating-linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.12) 0 4px,
    transparent 4px 8px
  );
}
.booking-status-segment-label {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.6);
}
.booking-status-segment-date {
  font-size: 11px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.38);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.booking-status-segment--current .booking-status-segment-label {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.87);
}
.booking-status-segment--void .booking-status-segment-label {
  text-decoration: line-through;
  color: rgba(0, 0, 0, 0.38);
}
.theme--dark .booking-status-segment-bar--empty {
  background: rgba(255, 255, 255, 0.16);
}
.theme--dark .booking-status-segment--void .booking-status-segment-bar--empty {
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.16) 0 4px,
    transparent 4px 8px
  );
}
.theme--dark .booking-status-segment-label {
  color: rgba(255, 255, 255, 0.7);
}
.theme--dark .booking-status-segment-date {
  color: rgba(255, 255, 255, 0.5);
}
.theme--dark .booking-status-segment--current .booking-status-segment-label {
  color: #fff;
}
.theme--dark .booking-status-segment--void .booking-status-segment-label {
  color: rgba(255, 255, 255, 0.38);
}
.booking-status-segment--pickable {
  cursor: pointer;
  border-radius: 4px;
  padding: 4px 6px 2px;
  margin: -4px -6px -2px;
  outline: none;
  transition: background-color 0.15s;
}
.booking-status-segment--pickable:hover,
.booking-status-segment--pickable:focus-visible {
  background-color: rgba(0, 0, 0, 0.04);
}
.booking-status-segment--pickable:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base) inset;
}
.booking-status-segment--pickable:hover .booking-status-segment-label {
  color: rgba(0, 0, 0, 0.87);
}
.booking-status-segment--pickable:hover .booking-status-segment-bar--empty {
  background: rgba(0, 0, 0, 0.24);
}
.booking-status-segment-radio {
  vertical-align: -2px;
  margin-right: 3px;
}
.theme--dark .booking-status-segment--pickable:hover,
.theme--dark .booking-status-segment--pickable:focus-visible {
  background-color: rgba(255, 255, 255, 0.06);
}
.theme--dark
  .booking-status-segment--pickable:hover
  .booking-status-segment-label {
  color: #fff;
}
.theme--dark
  .booking-status-segment--pickable:hover
  .booking-status-segment-bar--empty {
  background: rgba(255, 255, 255, 0.28);
}
.booking-status-body {
  margin-top: var(--gap);
}
.booking-status-hint {
  margin-top: calc(var(--gap) / 2);
}
.booking-status-payment {
  margin-top: var(--gap);
}
.booking-status-reason {
  margin-top: var(--gap);
  border-left: 3px solid var(--v-error-base, #ff5252);
  padding-left: 12px;
}
</style>
