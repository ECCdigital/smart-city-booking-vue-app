<template>
  <v-container fill-height fluid>
    <v-row
      v-if="(bookingId || bookingIds) && !noBooking && !multibleBooking"
      align="center"
      justify="center"
    >
      <v-col class="col-12 text-center"
        ><v-icon size="75" color="secondary"
          >mdi-account-credit-card-outline</v-icon
        ><v-icon size="75" color="primary">mdi-arrow-right-bold</v-icon></v-col
      >
      <v-col class="text-center text-h5">
        Sie werden nun zur Zahlungsseite weitergeleitet...
      </v-col>
    </v-row>

    <v-row
      v-else-if="multibleBooking"
      align="start"
      justify="center"
      class="pa-4"
    >
      <v-col cols="12" md="8" lg="6">
        <v-data-table
          :headers="headers"
          :items="payments"
          disable-pagination
          hide-default-footer
          class="elevation-1"
        >
          <template v-slot:item.bookingId="{ item }">
            <strong>{{ item.bookingId }}</strong>
          </template>

          <template v-slot:item.timeRange="{ item }">
            <span v-if="item.timeBegin && item.timeEnd">
              {{ formatDate(item.timeBegin) }} - {{ formatDate(item.timeEnd) }}
            </span>
            <span v-else>-</span>
          </template>

          <template v-slot:item.price="{ item }">
            <span>
              {{
                item.priceEur != null ? item.priceEur.toFixed(2) + " €" : "-"
              }}
            </span>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-btn :href="item.url" target="_blank" color="primary" small>
              Jetzt bezahlen
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <v-row v-else align="center" justify="center">
      <v-col class="col-12 text-center"
        ><v-icon size="75" color="secondary"
          >mdi-alert-circle-outline</v-icon
        ></v-col
      >
      <v-col class="text-center text-h5">
        {{ errorMessage[errorCode] || "Es ist ein Fehler aufgetreten" }}
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ApiPaymentService from "@/services/api/ApiPaymentService";

export default {
  name: "PaymentRedirect",
  data() {
    return {
      bookingId: undefined,
      bookingIds: undefined,
      multibleBooking: false,
      noBooking: false,
      inBookingTenant: null,
      paymentData: [],
      payments: [],
      errorMessage: {
        0: "Die von Ihnen angeforderte Buchung konnte nicht gefunden werden.",
        1: "Die von Ihnen angeforderte Buchung ist nicht freigegeben.",
        2: "Die von Ihnen angeforderte Buchung ist bereits bezahlt.",
      },
      errorCode: null,
      headers: [
        { text: "Buchungs-ID", value: "bookingId", sortable: false },
        { text: "Zeitraum", value: "timeRange", sortable: false },
        { text: "Preis", value: "price", sortable: false },
        { text: "Aktionen", value: "actions", sortable: false },
      ],
    };
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp) return "-";
      return new Date(timestamp).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
  created() {
    if (
      (this.$route.query.id || this.$route.query.ids) &&
      this.$route.query.tenant
    ) {
      this.bookingId = this.$route.query.id;
      this.bookingIds = this.$route.query.ids;
      this.inBookingTenant = this.$route.query.tenant;
      const aggregated = this.$route.query.aggregated === "true";
      let aggregatedBookingIds = this.bookingIds
        ? this.bookingIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
      if (this.bookingId) {
        aggregatedBookingIds.push(this.bookingId);
      }
      aggregatedBookingIds = aggregatedBookingIds.filter((id) => !!id);
      ApiPaymentService.payments(
        aggregatedBookingIds,
        this.inBookingTenant,
        aggregated
      )
        .then((res) => {
          const paymentData = res.data?.paymentData;

          if (paymentData.length === 1 && paymentData[0].url) {
            window.location.href = paymentData[0].url;
          } else if (paymentData.length > 1) {
            const bookingData = res.data.bookings;
            this.payments = paymentData.map((item) => {
              const booking = bookingData.find(
                (booking) => booking.id === item.bookingId
              );
              return {
                ...item,
                timeBegin: booking?.timeBegin,
                timeEnd: booking?.timeEnd,
                priceEur: booking?.priceEur,
              };
            });
            this.paymentData = paymentData;
            this.multibleBooking = true;
          } else {
            this.noBooking = true;
          }
        })
        .catch((err) => {
          this.errorCode = err.response?.data?.code ?? null;
          this.noBooking = true;
        });
    } else {
      this.$router.push({ name: "home" });
    }
  },
};
</script>

<style scoped></style>
