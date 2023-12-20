<template>
  <div>
    <v-container class="text-center mt-15">
      <div v-if="status === 'success'">
        <v-icon size="75" class="mb-5" color="primary">mdi-check</v-icon>
        <h1>Vielen Dank für Ihre Buchung</h1>
        <p class="lead mt-5">Ihre Buchung wurde von uns entgegengenommen und freigegeben.</p>
        <a elevation="0" outlined color="primary mt-15" href="https://diz.digital">Zurück zur Website</a>
      </div>

      <div v-if="status === 'await-approval'">
        <v-icon size="75" class="mb-5" color="primary">mdi-timer-sand-empty</v-icon>
        <h1>Vielen Dank für Ihre Anfrage</h1>
        <p class="lead mt-5">Ihre Buchungsanfrage ist bei uns eingegangen. Unsere Koordinator*innen prüfen ihre Anfrage und kommen so schnell wie möglich auf Sie zu.</p>
        <v-btn elevation="0" outlined color="primary mt-15" href="https://diz.digital">Zurück zur Website</v-btn>
      </div>

      <div v-if="status === 'no-payment'">
        <v-icon size="75" class="mb-5" color="warning">mdi-timer-sand-empty</v-icon>
        <h1 class="warning--text">Die Zahlung konnte nicht abgeschlossen werden</h1>
        <p class="lead mt-5">Leider konnte die Buchung nicht korrekt abgeschlossen werden. Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut oder wenden Sie sich an unsere Koordinator*innen.</p>
        <v-btn elevation="0" outlined class="mt-15" href="https://diz.digital">Zurück zur Website</v-btn>
      </div>

      <div v-if="status === 'not-found' && bookingStatus !== 'fail'">
        <v-icon size="75" class="mb-5" color="">mdi-help</v-icon>
        <h1>Keine Buchung gefunden</h1>
        <p class="lead mt-5">Leider konnten wir Ihre Buchung nicht finden. Bitte wenden Sie sich an unsere Koordinator*innen.</p>
        <v-btn elevation="0" outlined class="mt-15" href="https://diz.digital">Zurück zur Website</v-btn>
      </div>

      <div v-if="status === 'not-found' && bookingStatus === 'fail'">
        <v-icon size="75" class="mb-5" color="">mdi-alert</v-icon>
        <h1>Es ist ein Fehler aufgetreten.</h1>
        <p class="lead mt-5">Bitte versuchen Sie es später erneut. Wenn es dennoch nicht geht wenden Sie sich an unsere Koordinator*innen.</p>
        <v-btn elevation="0" outlined class="mt-15" href="https://diz.digital">Zurück zur Website</v-btn>
      </div>
    </v-container>

  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";

export default {
  name: "CheckoutSuccess",

  data() {
    return {
      bookingId: undefined,
      tenant: undefined,
      status: undefined,
      bookingStatus: undefined,
      booking: { }
    }
  },

  mounted() {
    this.bookingId = this.$route.query.id;
    this.tenant = this.$route.query.tenant;
    this.bookingStatus = this.$route.query.status;

    if (this.bookingId && this.tenant) {
      this.fetchBookingStatus();
    }
  },

  methods: {
    fetchBookingStatus: async function() {
      ApiBookingService.getBookingStatus(this.bookingId, this.tenant).then(response => {
        this.bookingStatus = response.data;

        if (!this.bookingStatus.bookingId) {
          this.status = "not-found";
        }
        else {
          if (this.bookingStatus.isCommitted === true && this.bookingStatus.isPayed === true) {
            this.status = "success";
          } else if (this.bookingStatus.isCommitted === false) {
            this.status = "await-approval";
          } else if (this.bookingStatus.isCommitted === true && this.bookingStatus.isPayed === false) {
            this.status = "no-payment";
          }
        }
      }).catch(err => console.log(err));
    }
  }
}
</script>

<style scoped>

</style>
