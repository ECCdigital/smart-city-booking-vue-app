<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-information</v-icon>
        <span class="text-h5">Buchung freigeben</span>
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <div>
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
        </div>
        <GroupBookingStatusSummary
          class="mt-4"
          :members="groupBookings"
          :series-allowed="canCommitGroup"
        />
        <v-alert v-if="error" type="error" border="left" class="mt-4 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end flex-wrap px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn
          v-if="canCommitGroup"
          color="primary"
          :loading="inProgress"
          @click="commitGroupBooking"
        >
          <v-icon left small>mdi-check-all</v-icon>
          Serie freigeben
        </v-btn>
        <v-btn
          v-if="!seriesOnly"
          color="primary"
          :loading="inProgress"
          @click="commitSingleBooking"
        >
          <v-icon left small>mdi-check</v-icon>
          Nur diese Buchung freigeben
        </v-btn>
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
