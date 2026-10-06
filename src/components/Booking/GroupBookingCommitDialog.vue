<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="info">mdi-information</v-icon>
        <span class="text-h5">Buchung freigeben</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          <i18n
            v-if="!seriesOnly"
            path="group-booking.commit.member-of-series"
            tag="span"
          >
            <template #bookingId>
              <strong>{{ bookingId }}</strong>
            </template>
          </i18n>
          <template v-if="canCommitGroup">
            {{ $t("group-booking.commit.question") }}
          </template>
        </span>
      </v-card-text>
      <v-card-text>
        <GroupBookingStatusSummary
          :members="groupBookings"
          :series-allowed="canCommitGroup"
        />
      </v-card-text>
      <v-card-text v-if="error" class="text-center">
        <v-alert type="error" border="left" elevation="2">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-text class="d-flex justify-center">
        <v-col v-if="canCommitGroup" cols="auto">
          <v-btn
            large
            color="primary"
            :loading="inProgress"
            @click="commitGroupBooking"
            >Serie freigeben</v-btn
          >
        </v-col>
        <v-col v-if="!seriesOnly" cols="auto">
          <v-btn large color="primary" @click="commitSingleBooking" :loading="inProgress"
            >Nur diese Buchung freigeben</v-btn
          >
        </v-col>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import GroupBookingStatusSummary from "@/components/Booking/GroupBookingStatusSummary.vue";
import { BOOKING_ACTION, groupAllowsAction } from "@/utils/bookingStatus";

export default {
  name: "GroupBookingCommitDialog",
  components: { GroupBookingStatusSummary },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
    },
    /** The members of the series, for the derived state (spec E9). */
    groupBookings: {
      type: Array,
      default: () => [],
    },
    /** The host acts on the series as a whole: no "Nur diese Buchung" (spec E9). */
    seriesOnly: {
      type: Boolean,
      default: false,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    /**
     * The series is offered only while every member is Angefragt (spec E9).
     * A host that hands over no members leaves the dialog knowing nothing
     * about the series: it offers it as before, and the route refuses.
     */
    canCommitGroup() {
      return (
        !this.groupBookings.length ||
        groupAllowsAction(this.groupBookings, BOOKING_ACTION.CONFIRM)
      );
    },
  },
  methods: {
    commitGroupBooking() {
      this.$emit("commit-group-booking");
    },
    commitSingleBooking() {
      this.$emit("commit-single-booking");
    },
    closeDialog() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped></style>
