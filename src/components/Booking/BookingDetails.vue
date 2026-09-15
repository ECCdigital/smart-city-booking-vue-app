<template>
  <div>
    <v-card class="booking-details" elevation="0">
      <div class="px-6 py-5 d-flex align-center">
        <v-icon large class="mr-3">mdi-file-document-outline</v-icon>
        <span class="text-h5 font-weight-bold">Buchungsdetails</span>
      </div>

      <v-divider></v-divider>

      <v-card-text class="px-6 py-6">
        <BookingStatusPath
          class="mb-6"
          :status="booking.status"
          :path="path"
          :actions="[]"
        />
        <div class="text-body-2">
          <span class="font-weight-bold">#{{ booking.id }}</span>
          <template v-if="booking.name"> · {{ booking.name }}</template>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="px-6 py-4">
        <v-spacer></v-spacer>
        <v-btn color="primary" outlined @click="$emit('close')">
          <v-icon left>mdi-close</v-icon>
          Schließen
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import { pathOf } from "@/utils/bookingStatus";

/**
 * The retired details dialog, kept as a shell until the openers lead to the
 * Buchungsseite (CONTEXT.md): every action - transitions, receipt, invoice,
 * reprint, payment link, iCal - lives on `BookingPage` and its components.
 */
export default {
  name: "BookingDetails",
  components: {
    BookingStatusPath,
  },
  props: {
    booking: {
      type: Object,
      required: true,
    },
    groupBooking: {
      type: Object,
      default: () => {},
    },
  },
  computed: {
    path() {
      return pathOf(this.booking);
    },
  },
};
</script>
