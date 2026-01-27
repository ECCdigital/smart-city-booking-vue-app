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
      dateMenu: false,
      timeMenu: false,
      selectedDate: null,
      selectedTime: null,
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
    timePaid() {
      if (!this.selectedDate) return null;

      const dateTime = new Date(this.selectedDate);
      if (this.selectedTime) {
        const [hours, minutes] = this.selectedTime.split(":");
        dateTime.setHours(parseInt(hours));
        dateTime.setMinutes(parseInt(minutes));
      }

      return dateTime.getTime();
    },
    formattedDateTime() {
      if (!this.selectedDate) return "";

      const date = new Date(this.selectedDate);
      if (this.selectedTime) {
        const [hours, minutes] = this.selectedTime.split(":");
        date.setHours(parseInt(hours));
        date.setMinutes(parseInt(minutes));
      }

      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: this.selectedTime ? "short" : undefined,
      }).format(date);
    },
  },
  methods: {
    paySingleBooking() {
      this.$emit("pay-single-booking", {
        id: this.bookingId,
        paymentMethod: this.selectedPaymentMethod,
        timePaid: this.timePaid,
      });
    },
    payGroupBooking() {
      this.$emit("pay-group-booking", {
        paymentMethod: this.selectedPaymentMethod,
        timePaid: this.timePaid,
      });
    },
    closeDialog() {
      this.$emit("close");
    },
    clearDateTime() {
      this.selectedDate = null;
      this.selectedTime = null;
    },
    setNow() {
      const now = new Date();
      this.selectedDate = now.toISOString().substr(0, 10);
      this.selectedTime = now.toTimeString().substr(0, 5);
    },
  },
};
</script>

<template>
  <v-dialog v-model="openDialog" persistent max-width="700px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-cash-check</v-icon>
        <span class="text-h5 font-weight-medium">
          Buchung als bezahlt markieren
        </span>
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

          <v-row>
            <v-col cols="12" sm="6">
              <v-menu
                v-model="dateMenu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    :value="
                      selectedDate
                        ? new Date(selectedDate).toLocaleDateString('de-DE')
                        : ''
                    "
                    label="Datum (optional)"
                    prepend-icon="mdi-calendar"
                    readonly
                    outlined
                    dense
                    clearable
                    @click:clear="selectedDate = null"
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="selectedDate"
                  locale="de-DE"
                  first-day-of-week="1"
                  @input="dateMenu = false"
                ></v-date-picker>
              </v-menu>
            </v-col>

            <v-col cols="12" sm="6">
              <v-menu
                v-model="timeMenu"
                :close-on-content-click="false"
                :nudge-right="40"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="selectedTime"
                    label="Uhrzeit (optional)"
                    prepend-icon="mdi-clock-outline"
                    readonly
                    outlined
                    dense
                    clearable
                    @click:clear="selectedTime = null"
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-if="timeMenu"
                  v-model="selectedTime"
                  format="24hr"
                  full-width
                  @click:minute="timeMenu = false"
                ></v-time-picker>
              </v-menu>
            </v-col>
          </v-row>

          <v-row v-if="selectedDate || selectedTime">
            <v-col cols="12" class="py-0">
              <div class="d-flex align-center">
                <v-chip small color="primary" outlined class="mr-2">
                  <v-icon small left>mdi-calendar-clock</v-icon>
                  {{ formattedDateTime }}
                </v-chip>
                <v-btn x-small text color="primary" @click="setNow">
                  <v-icon small left>mdi-clock-fast</v-icon>
                  Jetzt
                </v-btn>
                <v-btn x-small text color="error" @click="clearDateTime">
                  <v-icon small left>mdi-close</v-icon>
                  Löschen
                </v-btn>
              </div>
            </v-col>
          </v-row>

          <v-row v-else>
            <v-col cols="12" class="py-0">
              <v-btn x-small text color="primary" @click="setNow">
                <v-icon small left>mdi-clock-fast</v-icon>
                Aktuelles Datum/Uhrzeit verwenden
              </v-btn>
            </v-col>
          </v-row>

          <v-row v-if="hasGroupBooking">
            <v-col cols="12">
              <v-alert
                type="info"
                border="left"
                elevation="1"
                colored-border
                dense
              >
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
          Nur diese Buchung als bezahlt markieren
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
