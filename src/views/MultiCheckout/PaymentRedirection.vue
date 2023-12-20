<template>
<v-container fill-height fluid>
  <v-row v-if="bookingId && !noBooking" align="center" justify="center">
    <v-col class="col-12 text-center"><v-icon size="75" color="secondary">mdi-account-credit-card-outline</v-icon><v-icon size="75" color="primary">mdi-arrow-right-bold</v-icon></v-col>
  <v-col class="text-center text-h5">
    Sie werden nun zur Zahlungsseite weitergeleitet...
  </v-col>
  </v-row>
  <v-row v-if="noBooking" align="center" justify="center">
    <v-col class="col-12 text-center"><v-icon size="75" color="secondary">mdi-alert-circle-outline</v-icon></v-col>
    <v-col class="text-center text-h5">
      Es konnte keine Buchung gefunden werden.
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
      noBooking: false,
      inBookingTenant: null,
    }
  },
  created() {
    this.inBookingTenant = "diz"; //this.$route.query.tenant;
    if(this.$route.query.id) {
      this.bookingId = this.$route.query.id;
      ApiPaymentService.payments(this.bookingId, this.inBookingTenant).then((res) => {
        const paymentUrl = res.data?.paymentUrl
        if (paymentUrl) {
          window.location.href = paymentUrl
        }
      }).catch((err) => {
        this.noBooking = true;
        console.log(err)
      })
    }else{
      this.$router.push({ name: "home" })
    }
  }
}
</script>

<style scoped>

</style>
