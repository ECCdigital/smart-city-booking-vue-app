<template>
  <div>
    <v-container class="text-center mt-15">
      <div v-if="status === 'success'">
        <v-icon size="75" class="mb-5" color="primary">mdi-check</v-icon>
        <h1>Vielen Dank für Ihre Buchung</h1>
        <p class="lead mt-5">
          Ihre Buchung wurde von uns entgegengenommen und freigegeben.
        </p>
        <a
          v-if="!!websiteLink"
          elevation="0"
          outlined
          color="primary mt-15"
          :href="websiteLink"
          >Zurück zur Website</a
        >
      </div>

      <div v-if="status === 'await-approval'">
        <v-icon size="75" class="mb-5" color="primary"
          >mdi-timer-sand-empty</v-icon
        >
        <h1>Vielen Dank für Ihre Anfrage</h1>
        <p class="lead mt-5">
          Ihre Buchungsanfrage ist bei uns eingegangen. Unsere Koordinator*innen
          prüfen ihre Anfrage und kommen so schnell wie möglich auf Sie zu.
        </p>
        <v-btn
          v-if="!!websiteLink"
          elevation="0"
          outlined
          color="primary mt-15"
          :href="websiteLink"
          >Zurück zur Website</v-btn
        >
      </div>

      <div v-if="status === 'no-payment'">
        <v-icon size="75" class="mb-5" color="warning"
          >mdi-timer-sand-empty</v-icon
        >
        <h1 class="warning--text">
          Die Zahlung konnte nicht abgeschlossen werden
        </h1>
        <p class="lead mt-5">
          Leider konnte die Buchung nicht korrekt abgeschlossen werden. Bitte
          versuchen Sie es zu einem späteren Zeitpunkt erneut oder wenden Sie
          sich an unsere Koordinator*innen.
        </p>
        <v-btn
          v-if="!!websiteLink"
          elevation="0"
          outlined
          class="mt-15"
          :href="websiteLink"
          >Zurück zur Website</v-btn
        >
      </div>

      <div v-if="status === 'not-found' && bookingStatus !== 'fail'">
        <v-icon size="75" class="mb-5" color="">mdi-help</v-icon>
        <h1>Keine Buchung gefunden</h1>
        <p class="lead mt-5">
          Leider konnten wir Ihre Buchung nicht finden. Bitte wenden Sie sich an
          unsere Koordinator*innen.
        </p>
        <v-btn
          v-if="!!websiteLink"
          elevation="0"
          outlined
          class="mt-15"
          :href="websiteLink"
          >Zurück zur Website</v-btn
        >
      </div>

      <div v-if="status === 'not-found' && bookingStatus === 'fail'">
        <v-icon size="75" class="mb-5" color="">mdi-alert</v-icon>
        <h1>Es ist ein Fehler aufgetreten.</h1>
        <p class="lead mt-5">
          Bitte versuchen Sie es später erneut. Wenn es dennoch nicht geht
          wenden Sie sich an unsere Koordinator*innen.
        </p>
        <v-btn
          v-if="!!websiteLink"
          elevation="0"
          outlined
          class="mt-15"
          :href="websiteLink"
          >Zurück zur Website</v-btn
        >
      </div>

      <div v-if="status === 'await-payment'">
        <v-icon size="75" class="mb-5" color="primary">mdi-check</v-icon>
        <h1>Ihre Buchung ist bei uns eingegangen</h1>
        <p class="lead mt-5">
          In Kürze werden Sie von uns eine Email mit der Zahlungsaufforderung
          erhalten.
        </p>
        <v-btn
          v-if="!!websiteLink"
          elevation="0"
          outlined
          class="mt-15"
          :href="websiteLink"
          >Zurück zur Website</v-btn
        >
      </div>
    </v-container>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "CheckoutSuccess",

  data() {
    return {
      bookingId: undefined,
      tenant: undefined,
      status: undefined,
      bookingStatus: undefined,
      websiteLink: undefined,
      booking: {},
    };
  },

  async mounted() {
    this.bookingId = this.$route.query.id;
    this.tenant = this.$route.query.tenant;
    this.bookingStatus = this.$route.query.status;
    this.paymentProvider = this.$route.query.paymentProvider;

    try {
      const tenantObj = await ApiTenantService.getTenant(this.tenant);
      this.websiteLink = tenantObj?.data?.website;
    } catch (err) {
      console.error("Error fetching tenant:", err);
    }


    if (this.bookingId && this.tenant) {
      this.fetchBookingStatus();
    }
  },

  methods: {
    fetchBookingStatus: async function () {
      try {
        const response = await ApiBookingService.getBookingStatus(
          this.bookingId,
          this.tenant
        );
        this.bookingStatus = response.data;

        if (!this.bookingStatus.bookingId) {
          this.status = "not-found";
        } else {
          this.determineStatus();
        }
      } catch (err) {
        console.error("Error fetching booking status:", err);
        this.status = "error";
      }
    },
    determineStatus: function () {
      const { isCommitted, isPayed } = this.bookingStatus;

      if (isCommitted && isPayed) {
        this.status = "success";
      } else if (!isCommitted) {
        this.status = "await-approval";
      } else if (isCommitted && !isPayed) {
        if (this.paymentProvider === "invoice") {
          this.status = "await-payment";
        } else {
          this.status = "no-payment";
        }
      }
    },
  },
};
</script>

<style scoped></style>
