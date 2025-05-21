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
      v-if="!fetching"
      class="pa-4 rounded-sm"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center custom-card">
        <v-img
          src="/app-logo.png"
          max-width="150"
          class="mb-4 mx-auto"
        />
        <div v-if="bookingInfo">
          <div class="text-h5 font-weight-bold">
            {{ bookingInfo.title }}
          </div>
          <div class="text-subtitle1">
            {{ "#" + bookingInfo.bookingId }}
          </div>

          <v-icon
            v-if="activeStatus === 'pending' || activeStatus === 'expired'"
            class="my-4"
            size="70"
            color="warning"
          >
            mdi-timer-sand-empty
          </v-icon>

          <v-icon
            v-else-if="isBookingCompleted"
            class="my-4"
            size="70"
            color="success"
          >
            mdi-check-circle-outline
          </v-icon>

          <v-icon v-else class="my-4" size="70" color="error">
            mdi-alert-circle-outline
          </v-icon>

          <div class="text-h6">
            <span v-if="activeStatus === 'pending'">
              Die Buchung ist noch nicht aktiv.
            </span>
            <span v-else-if="activeStatus === 'expired'">
              Die Buchung ist abgelaufen.
            </span>
            <span v-else-if="isBookingCompleted">
              Die Buchung ist abgeschlossen.
            </span>
            <span v-else> Die Buchung ist noch nicht abgeschlossen. </span>
          </div>
          <div class="mt-1">
            <v-divider></v-divider>
            <div class="text-h6 font-weight-medium mt-4">Buchungszeitraum</div>
            <v-row align="center" class="mt-2">
              <v-col cols="12" class="text-center">
                <v-icon left>mdi-calendar-range</v-icon>
                {{
                  FormatService.fullDateTimeRange(
                    bookingInfo.timeBegin,
                    bookingInfo.timeEnd
                  )
                }}
              </v-col>
            </v-row>
          </div>
        </div>
        <div v-else class="text-h5 font-weight-medium">Buchungsstatus</div>
      </v-card-text>

      <v-card-text v-if="!bookingInfo">
        <div v-if="publicStatusViewEnabled">
          <v-form ref="form" v-model="formValid">
            <p v-if="preSetBookingNumber" class="text-center mt-4">
              Geben Sie Ihren vollständigen Namen ein, um den Status Ihrer
              Buchung abzurufen.
            </p>
            <p v-else class="text-center mt-4">
              Geben Sie Ihre Buchungsnummer und Ihren Nachnamen ein, um den
              Status Ihrer Buchung abzurufen.
            </p>

            <v-alert
              v-if="errorMessage"
              type="error"
              class="mt-5"
              border="left"
              colored
            >
              {{ errorMessage }}
            </v-alert>

            <v-text-field
              v-if="!preSetBookingNumber"
              v-model="bookingNumber"
              label="Buchungsnummer"
              prepend-icon="mdi-pound"
              :rules="[rules.required]"
            ></v-text-field>

            <v-text-field
              v-model="name"
              prepend-icon="mdi-account"
              label="Name"
              :rules="[rules.required]"
              @keyup.enter="submitForm"
            ></v-text-field>

            <v-btn
              block
              color="primary"
              @click="submitForm"
              class="mt-5"
              :loading="isLoading"
            >
              Status abrufen
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-form>
        </div>
        <div v-else>
          <v-alert type="info" border="left" colored>
            Die Abfrage des Buchungsstatus ist für diesen Mandanten nicht
            verfügbar.
          </v-alert>
        </div>
      </v-card-text>

      <v-card-text v-else>
        <v-divider class="mb-4"></v-divider>
        <v-list dense>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title class="text-subtitle1 font-weight-bold">
                Buchungsnummer
              </v-list-item-title>
              <v-list-item-subtitle>{{
                bookingInfo.bookingId
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item>
            <v-list-item-content>
              <v-list-item-title class="text-subtitle1 font-weight-bold">
                Name
              </v-list-item-title>
              <v-list-item-subtitle>{{
                bookingInfo.name
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item>
            <v-list-item-content>
              <v-list-item-title class="text-subtitle1 font-weight-bold">
                Gebucht am
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ FormatService.fullDateTime(bookingInfo.timeCreated) }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title class="text-subtitle1 font-weight-bold">
                Kommentar zur Buchung
              </v-list-item-title>
              <div class="grey--text text--darken-1">
                {{ bookingInfo.comment || "-" }}
              </div>
            </v-list-item-content>
          </v-list-item>
        </v-list>

        <v-divider class="my-4"></v-divider>

        <div class="text-center">
          <v-chip
            class="ma-2"
            color="green"
            text-color="white"
            v-if="bookingInfo.status.bookingStatus === 'confirmed'"
          >
            <v-icon left>mdi-check-circle</v-icon>
            Freigegeben
          </v-chip>

          <v-chip class="ma-2" color="red" text-color="white" v-else>
            <v-icon left>mdi-alert-circle</v-icon>
            Nicht freigegeben
          </v-chip>

          <v-chip
            class="ma-2"
            color="green"
            text-color="white"
            v-if="bookingInfo.status.paymentStatus === 'paid'"
          >
            <v-icon left>mdi-cash-check</v-icon>
            Bezahlt
          </v-chip>

          <v-chip class="ma-2" color="orange" text-color="white" v-else>
            <v-icon left>mdi-cash</v-icon>
            Zahlung ausstehend
          </v-chip>

          <v-chip
            v-if="activeStatus === 'active'"
            class="ma-2"
            color="green"
            text-color="white"
          >
            <v-icon left>mdi-calendar-clock</v-icon>
            Aktiv
          </v-chip>

          <v-chip
            v-else-if="activeStatus === 'expired'"
            class="ma-2"
            color="red"
            text-color="white"
          >
            <v-icon left>mdi-calendar-remove</v-icon>
            Abgelaufen
          </v-chip>

          <v-chip
            v-else-if="activeStatus === 'pending'"
            class="ma-2"
            color="orange"
            text-color="white"
          >
            <v-icon left>mdi-calendar-clock-outline</v-icon>
            Noch nicht aktiv
          </v-chip>
        </div>
      </v-card-text>
      <v-card-actions v-if="bookingInfo">
        <v-btn block color="primary" @click="back()">
          <v-icon left>mdi-arrow-left</v-icon>
          zurück</v-btn
        >
      </v-card-actions>
    </v-card>
    <v-progress-circular
      v-else
      indeterminate
      color="primary"
    ></v-progress-circular>
  </v-container>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import FormatService from "@/services/FormatService";

export default {
  name: "BookingStatus",
  props: {
    tenantId: {
      type: String,
    },
  },
  computed: {
    FormatService() {
      return FormatService;
    },
    isBookingCompleted() {
      return (
        this.bookingInfo &&
        this.bookingInfo.status.bookingStatus === "confirmed" &&
        this.bookingInfo.status.paymentStatus === "paid"
      );
    },
    activeStatus() {
      return this.bookingInfo && this.bookingInfo.status.activeStatus;
    },
  },
  data() {
    return {
      bookingNumber: "",
      name: "",
      formValid: false,
      bookingInfo: null,
      errorMessage: "",
      rules: {
        required: (value) => !!value || "Dieses Feld ist erforderlich",
      },
      isLoading: false,
      preSetBookingNumber: this.$route.query.id || "",
      preSetName: this.$route.query.name || "",
      currentTime: new Date(),
      publicStatusViewEnabled: false,
      fetching: false,
    };
  },
  methods: {
    submitForm() {
      if (this.$refs.form.validate()) {
        this.fetchBookingStatus();
      }
    },
    async fetchBookingStatus() {
      try {
        this.isLoading = true;
        const bookingId = this.preSetBookingNumber || this.bookingNumber;
        const name = this.preSetName || this.name;
        const response = await ApiBookingService.checkPublicBookingStatus(
          bookingId,
          name,
          this.tenantId
        );
        this.bookingInfo = response.data;
        this.errorMessage = "";
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.errorMessage = "Buchungsnummer ungültig";
        } else if (error.response && error.response.status === 401) {
          this.errorMessage = "Die angegebenen Daten sind nicht korrekt";
          this.preSetName = "";
        } else if (error.response && error.response.status === 405) {
          this.publicStatusViewEnabled = false;
          this.errorMessage =
            "Die Abfrage des Buchungsstatus ist nicht verfügbar.";
        } else {
          this.errorMessage = "Ein Fehler ist aufgetreten";
        }
      } finally {
        this.isLoading = false;
      }
    },
    back() {
      this.bookingInfo = null;
      this.bookingNumber = "";
      this.name = "";
      this.errorMessage = "";
      this.preSetName = "";
      this.preSetBookingNumber = "";
    },
  },
  async mounted() {
    try {
      this.fetching = true;

      this.errorMessage = "";
      this.publicStatusViewEnabled = true;
      if (this.preSetBookingNumber && this.preSetName) {
        await this.fetchBookingStatus();
      }
    } catch (error) {
      this.errorMessage = "Ein Fehler ist aufgetreten.";
    } finally {
      this.fetching = false;
    }
  },
};
</script>

<style scoped></style>
