<script>
import { statusColor, statusLabel } from "@/utils/bookingStatus";
import { HOLDING_STATUSES } from "@/utils/eventManagement";

/**
 * The tickets held against a limit as one rail: Bestätigt, Zahlung offen
 * and Angefragt side by side in their status colours, Angefragt striped -
 * held, not yet sure. Without a limit the held tickets fill the rail. More
 * than the limit fills it and turns its outline to the error colour.
 */
export default {
  name: "EventOccupancyRail",
  props: {
    byStatus: { type: Object, required: true },
    capacity: { type: Number, default: null },
    large: { type: Boolean, default: false },
  },
  computed: {
    booked() {
      return HOLDING_STATUSES.reduce(
        (sum, status) => sum + (this.byStatus[status] || 0),
        0
      );
    },
    scale() {
      return Math.max(this.capacity || 0, this.booked, 1);
    },
    overbooked() {
      return Boolean(this.capacity) && this.booked > this.capacity;
    },
    segments() {
      return HOLDING_STATUSES.filter((status) => this.byStatus[status] > 0).map(
        (status) => ({
          status,
          color: statusColor(status),
          width: `${(this.byStatus[status] / this.scale) * 100}%`,
        })
      );
    },
    ariaLabel() {
      const parts = HOLDING_STATUSES.map(
        (status) => `${statusLabel(status)}: ${this.byStatus[status] || 0}`
      );
      if (this.capacity) {
        parts.push(
          this.$t("event.manage.tickets.ofCapacity", {
            booked: this.booked,
            capacity: this.capacity,
          })
        );
      }
      return parts.join(", ");
    },
  },
};
</script>

<template>
  <div
    class="occupancy-rail"
    :class="{
      'occupancy-rail--large': large,
      'occupancy-rail--over': overbooked,
      'occupancy-rail--unlimited': !capacity,
    }"
    role="img"
    :aria-label="ariaLabel"
  >
    <span
      v-for="segment in segments"
      :key="segment.status"
      class="occupancy-rail__segment"
      :class="[
        segment.color,
        { 'occupancy-rail__segment--open': segment.status === 'requested' },
      ]"
      :style="{ width: segment.width }"
    />
  </div>
</template>

<style scoped>
.occupancy-rail {
  display: flex;
  height: 8px;
  overflow: hidden;
  border-radius: var(--scb-radius-control);
  background-color: var(--scb-hover-tint-strong);
  box-shadow: inset 0 0 0 1px var(--scb-rule);
}

.occupancy-rail--large {
  height: 14px;
}

/* Without a limit there is no free share to show. */
.occupancy-rail--unlimited {
  background-color: transparent;
}

.occupancy-rail--over {
  box-shadow: 0 0 0 2px var(--v-error-base);
}

.occupancy-rail__segment {
  height: 100%;
  transition: width var(--scb-motion-base);
}

.occupancy-rail__segment + .occupancy-rail__segment {
  border-left: 1px solid var(--scb-surface);
}

.occupancy-rail__segment--open {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.45) 0 3px,
    transparent 3px 6px
  );
}

@media (prefers-reduced-motion: reduce) {
  .occupancy-rail__segment {
    transition: none;
  }
}
</style>
