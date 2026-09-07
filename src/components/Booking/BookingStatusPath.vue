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

    <div v-if="path" class="booking-status-segments">
      <div
        v-for="step in path.steps"
        :key="step.status"
        class="booking-status-segment"
        :class="`booking-status-segment--${step.state}`"
      >
        <div class="booking-status-segment-bar" :class="barClass(step)" />
        <div class="booking-status-segment-label">{{ step.label }}</div>
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

    <div v-if="hint" class="booking-status-hint text-caption text--secondary">
      {{ hint }}
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
 * decide the actions themselves; the headline only reports the click.
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
    actionLabel,
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
.booking-status-hint {
  margin-top: calc(var(--gap) / 2);
}
.booking-status-reason {
  margin-top: var(--gap);
  border-left: 3px solid var(--v-error-base, #ff5252);
  padding-left: 12px;
}
</style>
