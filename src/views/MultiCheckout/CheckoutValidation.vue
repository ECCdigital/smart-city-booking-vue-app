<template>
  <div>
    <p v-if="isAvailable == null">Wir prüfen die Verfügbarkeit ...</p>

    <v-alert type="warning" text v-if="isAvailable === false">
      Das Buchungsobjekt ist leider zurzeit nicht verfügbar.
    </v-alert>

    <v-alert type="success" text v-if="isAvailable === true">
      Das Buchungsobjekt ist verfügbar.
    </v-alert>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";

export default {
  name: "CheckoutValidation",

  props: ["bookingAttempt"],

  data() {
    return {
      isAvailable: null,
      inBookableTenant: null,
    }
  },

  created() {
    this.inBookableTenant = this.$route.query.tenant;
    this.$nextTick(() => this.submit());
  },

  methods: {
    submit() {
      ApiBookingService.checkoutBooking(this.bookingAttempt, true, this.inBookableTenant).then(() => {
        this.isAvailable = true;
        this.$emit("submit");
      }).catch((err) => {
        this.isAvailable = false;
        console.log(err);
      })
    },
  },
}
</script>

<style scoped>

</style>
