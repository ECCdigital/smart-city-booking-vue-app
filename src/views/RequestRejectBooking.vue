<template>
  <v-container
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    "
  >
    <div v-if="bookingNumber">
      <v-card
        class="pa-4 rounded-sm"
        style="
          overflow: hidden;
          width: 100%;
          min-width: 350px;
          max-width: 500px;
        "
        v-if="!rejectSuccess"
      >
        <v-form ref="form" v-model="valid" @submit.prevent="sendRejectRequest">
          <v-card-text class="text-center custom-card">
            <v-alert
              v-if="showVerificationError"
              type="warning"
              class="mb-10"
              dense
            >
              Die eingegebene Name entspricht nicht der Buchung.
            </v-alert>

            <v-img src="/app-logo.png" max-width="150" class="mb-4 mx-auto" />

            <p>
              <strong
                >Möchten Sie die Buchung #{{ bookingNumber }} wirklich
                stornieren?</strong
              >
            </p>

            <v-text-field
              outlined
              v-model="verificationName"
              label="Ihr Name (wie in der Buchung)"
              hint="Bitte geben Sie Ihren Namen ein, so wie er auch in der Buchung hinterlegt wurde."
              :rules="[
                (v) => !!v || 'Bitte geben Sie Ihren Namen ein.',
              ]"
              persistent-hint
            ></v-text-field>
            <v-textarea
              outlined
              v-model="rejectReason"
              rows="3"
              label="Hinweis zur Stornierung"
              :rules="[
                (v) => !!v || 'Bitte geben Sie einen Grund für die Stornierung an.',
              ]"
              class="mt-3"
            ></v-textarea>
          </v-card-text>
          <v-card-actions>
            <v-btn
              :loading="fetching"
              block
              color="primary"
              type="submit"
              :disabled="!valid || fetching"
            >
              Buchung jetzt stornieren</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>

      <v-card
        class="pa-4 rounded-sm"
        style="
          overflow: hidden;
          width: 100%;
          min-width: 350px;
          max-width: 500px;
        "
        v-else
      >
        <v-card-text class="text-center">
          <v-icon size="45px" color="primary">mdi-email</v-icon>
          <p class="text-h6 font-weight-bold">Stornierung bestätigen</p>
          <p>
            Wir haben Ihnen eine E-Mail zur Bestätigung Ihrer Stornierung
            gesendet. Bitte überprüfen Sie Ihr Postfach und bestätigen Sie die
            Stornierung, um den Vorgang abzuschließen.
          </p>
        </v-card-text>
      </v-card>
    </div>
    <div v-else>
      <v-alert type="error" dense> Keine Buchungsnummer gefunden. </v-alert>
    </div>
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
  computed: {},
  data() {
    return {
      bookingNumber: this.$route.query.id,
      verificationName: null,
      rejectReason: null,
      showVerificationError: false,
      rejectSuccess: false,
      fetching: false,
      valid: false,
    };
  },
  methods: {
    async sendRejectRequest() {
      try {
        this.fetching = true;
        const bookingResponse = await ApiBookingService.verifyBookingOwnership(
          this.tenantId,
          this.bookingNumber,
          this.verificationName
        );

        if (bookingResponse.status === 200) {
          this.showVerificationError = false;
          const rejectResponse = await ApiBookingService.requestRejectBooking(
            this.bookingNumber,
            this.tenantId,
            this.rejectReason
          );

          if (rejectResponse.status === 201) {
            this.rejectSuccess = true;
          }
        }
      } catch (error) {
        this.showVerificationError = true;
      } finally {
        this.fetching = false;
      }
    },
  },
  async mounted() {},
};
</script>

<style scoped></style>
