<template>
  <div class="group-booking-status-summary">
    <div class="d-flex align-center flex-wrap mb-2">
      <span class="text-subtitle-2 mr-2">{{
        $t("group-booking.status.title")
      }}</span>
      <v-chip
        small
        :color="statusColor(status)"
        text-color="white"
        class="font-weight-medium"
      >
        <v-icon left x-small>{{ statusIcon(status) }}</v-icon>
        {{ statusLabel(status) }}
      </v-chip>
    </div>
    <v-alert
      v-if="!seriesActionAllowed"
      type="info"
      border="left"
      colored-border
      dense
      class="mb-2"
    >
      {{ seriesActionHint }}
    </v-alert>
    <p class="text-caption mb-1">{{ $t("group-booking.status.members") }}</p>
    <div class="group-booking-status-summary__members">
      <div
        v-for="member in members"
        :key="member.id"
        class="d-flex align-center py-1"
      >
        <span class="mr-2">{{ member.id }}</span>
        <v-chip
          x-small
          :color="statusColor(member.status)"
          text-color="white"
          class="font-weight-medium"
        >
          <v-icon left x-small>{{ statusIcon(member.status) }}</v-icon>
          {{ statusLabel(member.status) }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script>
import {
  MIXED,
  groupAllowsAction,
  groupBookingStatus,
  statusColor,
  statusIcon,
  statusLabel,
} from "@/utils/bookingStatus";

/**
 * The state of a series as the group dialogs show it (spec E9): one derived
 * chip - the shared state or "Gemischt" - the members with their own, and,
 * where the series-wide `action` is not on, the reason. The dialog decides
 * what to offer with `groupAllowsAction` itself; this only says why.
 */
export default {
  name: "GroupBookingStatusSummary",
  props: {
    members: {
      type: Array,
      default: () => [],
    },
    /** The `BOOKING_ACTION` the dialog asks for the whole series. */
    action: {
      type: String,
      required: true,
    },
  },
  computed: {
    status() {
      return groupBookingStatus(this.members);
    },
    seriesActionAllowed() {
      return groupAllowsAction(this.members, this.action);
    },
    seriesActionHint() {
      return this.status === MIXED
        ? this.$t("group-booking.transition.mixed.message")
        : this.$t("group-booking.transition.not-allowed.message");
    },
  },
  methods: {
    statusColor,
    statusIcon,
    statusLabel,
  },
};
</script>

<style scoped>
.group-booking-status-summary__members {
  max-height: 200px;
  overflow-y: auto;
}
</style>
