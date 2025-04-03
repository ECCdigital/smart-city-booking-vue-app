<template>
  <v-card>
    <v-card-title class="">
      <span class="text-h5">Buchungsdetails</span>
    </v-card-title>

    <v-card-text >
      <span class="text-h6">Buchungsinformationen</span>
      <v-divider />
      <v-row no-gutters>
        <v-col cols="12" md="6">
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Buchungsnummer
              </v-list-item-title>
              <v-list-item-subtitle>{{ groupBooking.id }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Buchungsdatum
              </v-list-item-title>
              <v-list-item-subtitle>{{
                Intl.DateTimeFormat("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(groupBooking.timeCreated))
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Gesamtpreis
              </v-list-item-title>
              <v-list-item-subtitle>{{
                Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(totalPriceEur)
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <span> Einzelbuchungen: </span>
      <v-row>
        <v-col
          ><BookingTable
            :bookings="groupBooking.bookings"
            :show-group-booking="false"
        /></v-col>
      </v-row>
    </v-card-text><v-card-actions>
    <v-spacer />
    <v-btn class="mb-5 mr-5" outlined @click="closeDialog"> Schließen </v-btn>
  </v-card-actions>
  </v-card>
</template>

<script>
import BookingTable from "@/components/Booking/BookingTable.vue";

export default {
  name: "GroupBookingDetails",
  components: { BookingTable },
  props: {
    groupBooking: {
      type: Object,
      required: true,
    },
  },
  computed: {
    totalPriceEur() {
      return this.groupBooking.bookings.reduce((acc, booking) => {
        return acc + booking.priceEur;
      }, 0);
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped></style>
