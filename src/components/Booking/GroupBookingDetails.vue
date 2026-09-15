<template>
  <div>
    <v-card class="booking-details" elevation="0">
      <div class="px-6 py-5 d-flex align-center">
        <v-icon large class="mr-3">mdi-book-multiple</v-icon>
        <span class="text-h5 font-weight-bold">Serienbuchung</span>
        <v-spacer />
        <v-chip outlined label>
          <v-icon left small>mdi-pound</v-icon>
          {{ groupBooking.id }}
        </v-chip>
      </div>

      <v-divider />

      <v-card-text class="px-6 py-6">
        <BookingStatusPath
          class="mb-6"
          :label="$t('group-booking.status.title')"
          :status="seriesStatus"
          :path="seriesPath"
          :actions="[]"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn outlined @click="$emit('close')">
          <v-icon left>mdi-close</v-icon>
          Schließen
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import { groupBookingStatus, seriesPathOf } from "@/utils/bookingStatus";

/**
 * The retired series dialog, kept as a shell until the openers lead to the
 * Serienbuchungsseite (CONTEXT.md): the series' state, the transitions, the
 * comment, the Sammelrechnung, the reprint and the iCal live on
 * `GroupBookingPage` and its components.
 */
export default {
  name: "GroupBookingDetails",
  components: {
    BookingStatusPath,
  },
  props: {
    groupBooking: {
      type: Object,
      required: true,
    },
  },
  computed: {
    members() {
      return (this.groupBooking.bookings || []).filter(Boolean);
    },
    seriesStatus() {
      return groupBookingStatus(this.members);
    },
    seriesPath() {
      return seriesPathOf(this.groupBooking, this.members);
    },
  },
};
</script>
