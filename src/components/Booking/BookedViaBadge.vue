<template>
  <v-tooltip bottom>
    <template #activator="{ on, attrs }">
      <span class="booked-via-badge" tabindex="0" v-bind="attrs" v-on="on">
        {{ label }}
      </span>
    </template>
    <span>{{ hint }}</span>
  </v-tooltip>
</template>

<script>
import { bookedViaHint, bookedViaLabel } from "@/utils/bookedVia";

/**
 * The Buchungsweg as a small badge beside a booker's name, its tooltip
 * saying who made the booking. The booking list shows it for guest and
 * admin bookings only, the Buchungsseite for every booking.
 */
export default {
  name: "BookedViaBadge",
  props: {
    bookedVia: {
      type: String,
      default: undefined,
    },
  },
  computed: {
    label() {
      return bookedViaLabel(this.bookedVia);
    },
    hint() {
      return bookedViaHint(this.bookedVia);
    },
  },
};
</script>

<style scoped>
.booked-via-badge {
  display: inline-block;
  margin-left: var(--scb-space-1);
  padding: 0 var(--scb-space-1);
  border-radius: var(--scb-radius-badge);
  background: var(--scb-hover-tint-strong);
  color: var(--scb-text-muted);
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-medium);
  line-height: 16px;
  vertical-align: middle;
  cursor: default;
}
</style>
