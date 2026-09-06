<script>
import {
  MIXED,
  groupBookingStatus,
  statusColor,
  statusIcon,
  statusLabel,
} from "@/utils/bookingStatus";

/**
 * The state of a series as the group dialogs show it (spec E9): one derived
 * chip - the shared state or "Gemischt" - the members with their own, and,
 * where the dialog does not offer the series-wide action, the reason. The
 * dialog decides what it offers (`seriesAllowed`); this only says why.
 * Without members there is nothing to say, and nothing is rendered.
 */
export default {
  name: "GroupBookingStatusSummary",
  props: {
    members: {
      type: Array,
      default: () => [],
    },
    seriesAllowed: {
      type: Boolean,
      required: true,
    },
  },
  computed: {
    status() {
      return groupBookingStatus(this.members);
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

<template>
  <div v-if="members.length" class="group-booking-status-summary">
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
      v-if="!seriesAllowed"
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

<style scoped>
.group-booking-status-summary__members {
  max-height: 200px;
  overflow-y: auto;
}
</style>
