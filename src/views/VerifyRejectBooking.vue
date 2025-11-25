<template>
  <v-container
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    "
  >
    <v-card
      class="pa-4 rounded-sm"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center" v-if="fetching">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Bitte warten, Ihre Stornierung wird verarbeitet...</p>
      </v-card-text>

      <v-card-text class="text-center" v-else-if="rejectSuccess">
        <v-icon size="45px" color="success">mdi-check</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung bestätigt</p>
        <p>
          Ihre Stornierung wurde erfolgreich bestätigt. Sie erhalten in Kürze
          eine Bestätigung per E-Mail.
        </p>
      </v-card-text>

      <v-card-text class="text-center" v-else-if="rejectError">
        <v-icon size="45px" color="error">mdi-close</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung nicht möglich</p>
        <p>
          Die Stornierung konnte nicht durchgeführt werden. Bitte versuchen Sie
          es erneut oder kontaktieren Sie Ihren Ansprechpartner.
        </p>

        <v-btn
          color="primary"
          class="mt-4"
          @click="releaseRejectHook"
          :disabled="fetching"
        >
          Erneut versuchen
        </v-btn>
      </v-card-text>

      <v-card-text class="text-center" v-else>
        <v-icon size="45px" color="warning">mdi-help-circle-outline</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung bestätigen</p>
        <p>
          Möchten Sie die Buchung mit der Nummer
          <strong>{{ bookingNumber }}</strong> wirklich stornieren?
        </p>

        <div class="mt-4" style="display: flex; justify-content: center; gap: 8px">
          <v-btn
            color="primary"
            @click="releaseRejectHook"
            :disabled="fetching"
          >
            Stornierung bestätigen
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";

export default {
  name: "RequestRejectBooking",
  props: {
    tenantId: {
      type: String,
    },
  },
  data() {
    return {
      bookingNumber: this.$route.query.id,
      hookId: this.$route.query.hookId,
      rejectSuccess: false,
      rejectError: false,
      fetching: false,
    };
  },
  methods: {
    async releaseRejectHook() {
      this.fetching = true;
      this.rejectError = false;

      try {
        const response = await ApiBookingService.releaseBookingHook(
          this.bookingNumber,
          this.tenantId,
          this.hookId
        );

        if (response.status === 200) {
          this.rejectSuccess = true;
        } else {
          this.rejectError = true;
        }
      } catch (error) {
        console.error(error);
        this.rejectError = true;
      } finally {
        this.fetching = false;
      }
    },
  },
  mounted() {
  },
};
</script>

<style scoped></style>
