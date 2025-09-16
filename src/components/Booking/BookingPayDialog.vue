<script>
export default {
  name: "BookingPayDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
    },
    hasGroupBooking: {
      type: Boolean,
      default: false,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      selectedPaymentMethod: null,
      paymentMethods: [
        { text: "Bar", value: "CASH" },
        { text: "Überweisung", value: "TRANSFER" },
        { text: "Kreditkarte", value: "CREDIT_CARD" },
        { text: "EC-Karte", value: "DEBIT_CARD" },
        { text: "PayPal", value: "PAYPAL" },
        { text: "Sonstiges", value: "OTHER" },
        { text: "Giropay", value: "GIROPAY" },
        { text: "Apple Pay", value: "APPLE_PAY" },
        { text: "Google Pay", value: "GOOGLE_PAY" },
        { text: "EPS", value: "EPS" },
        { text: "iDEAL", value: "IDEAL" },
        { text: "Maestro", value: "MAESTRO" },
        { text: "paydirekt", value: "PAYDIRECT" },
        { text: "SOFORT-Überweisung", value: "SOFORT" },
        { text: "Bluecode", value: "BLUECODE" },
      ],
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    paySingleBooking() {
      this.$emit("pay-single-booking", {
        id: this.bookingId,
        paymentMethod: this.selectedPaymentMethod,
      });
    },
    payGroupBooking() {
      this.$emit("pay-group-booking", this.selectedPaymentMethod);
    },
    closeDialog() {
      this.$emit("close");
    },
  },
};
</script>

<template>
  <v-dialog v-model="openDialog" persistent max-width="700px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-cash-check</v-icon>
        <span class="text-h5 font-weight-medium"
          >Buchung als bezahlt markieren</span
        >
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="selectedPaymentMethod"
                :items="paymentMethods"
                item-text="text"
                item-value="value"
                label="Zahlungsmethode auswählen"
                hint="Bitte wählen Sie die Zahlungsmethode"
                persistent-hint
                clearable
                outlined
                dense
                required
              ></v-select>
            </v-col>
          </v-row>

          <v-row v-if="hasGroupBooking">
            <v-col cols="12">
              <v-alert type="info" border="left" elevation="1" colored-border dense>
                <span class="text-subtitle-1">
                  Die Buchung <strong>{{ bookingId }}</strong> ist Teil einer
                  Serienbuchung.<br />
                  Möchten Sie die gesamte Serie freigeben?
                </span>
              </v-alert>
            </v-col>
          </v-row>

          <v-row v-if="error">
            <v-col cols="12">
              <v-alert type="error" border="left" elevation="2" prominent dense>
                {{ error }}
              </v-alert>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-text v-if="hasGroupBooking" class="d-flex justify-center">
        <v-btn
          color="primary"
          class="ma-2"
          large
          :loading="inProgress"
          @click="payGroupBooking"
        >
          Serie als bezahlt markieren
        </v-btn>
        <v-btn
          color="secondary"
          class="ma-2"
          large
          :loading="inProgress"
          @click="paySingleBooking"
        >
          Nur diese Buchung alt bezahlt markieren
        </v-btn>
      </v-card-text>

      <v-card-actions class="d-flex justify-end">
        <v-btn outlined @click="closeDialog"> Abbrechen </v-btn>
        <v-btn
          v-if="!hasGroupBooking"
          color="primary"
          :disabled="!selectedPaymentMethod"
          :loading="inProgress"
          @click="paySingleBooking"
        >
          Als bezahlt markieren
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
