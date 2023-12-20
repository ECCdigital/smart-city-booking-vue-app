<template>
  <div>
    <v-form ref="form" v-model="valid">
      <h2>Buchungszeitraum</h2>
      <p>
        Bitte wählen Sie den Zeitraum aus, in welchem Sie ihre Buchung
        platzieren möchten.
      </p>

      <v-alert
        type="info"
        text
        v-if="
          bookable.minBookingDuration > 0 || bookable.maxBookingDuration > 0
        "
      >
        <p class="mb-2">
          <strong>Bitte beachten Sie die Buchungsdauer</strong>
        </p>
        <span v-if="bookable.minBookingDuration > 0"
          >Minimum: {{ bookable.minBookingDuration }} Stunden</span
        >
        <span
          v-if="
            bookable.minBookingDuration > 0 && bookable.maxBookingDuration > 0
          "
          >,
        </span>
        <span v-if="bookable.maxBookingDuration > 0"
          >Maximum: {{ bookable.maxBookingDuration }} Stunden</span
        >
      </v-alert>

      <v-alert type="info" text v-if="!bookable.autoCommitBooking">
        <p class="mb-0"><strong>Manuelle Freigabe erforderlich</strong></p>
        Zur Buchung von
        <span class="font-italic">{{ bookable.title }}</span> ist eine manuelle
        Freigabe durch einen Administrator erforderlich.
      </v-alert>

      <v-row v-if="!bookable.isTimePeriodRelated">
        <v-col>
          <v-menu
            ref="dateBeginMenu"
            :close-on-content-click="false"
            :return-value.sync="dateBegin"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="dateBegin"
                label="Startdatum"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.dateBegin"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="dateBegin"
              no-title
              scrollable
              color="primary"
              locale="de"
              :first-day-of-week="1"
              :show-current="minBookingDate"
              :max="maxBookingDate"
              :min="minBookingDate"
              @click:date="$refs.dateBeginMenu.save(dateBegin)"
            >
            </v-date-picker>
          </v-menu>
        </v-col>
        <v-col>
          <v-menu
            ref="timeBeginMenuRef"
            v-model="timeBeginMenu"
            :close-on-content-click="false"
            :nudge-right="40"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="290px"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="timeBegin"
                label="Startzeit"
                prepend-icon="mdi-clock-time-four-outline"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.required"
              ></v-text-field>
            </template>
            <v-time-picker
              v-if="timeBeginMenu"
              v-model="timeBegin"
              full-width
              format="24hr"
              @click:minute="$refs.timeBeginMenuRef.save(timeBegin)"
            ></v-time-picker>
          </v-menu>
        </v-col>
      </v-row>

      <v-row v-if="!bookable.isTimePeriodRelated">
        <v-col>
          <v-menu
            ref="dateEndMenu"
            v-model="dateEndMenu"
            :close-on-content-click="false"
            :return-value.sync="dateEnd"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="dateEnd"
                label="Enddatum"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.dateEnd"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="dateEnd"
              no-title
              scrollable
              color="primary"
              locale="de"
              :first-day-of-week="1"
              :show-current="minBookingDate"
              :max="maxBookingDate"
              :min="dateBegin || minBookingDate"
              @click:date="$refs.dateEndMenu.save(dateEnd)"
            >
            </v-date-picker>
          </v-menu>
        </v-col>
        <v-col>
          <v-menu
            ref="timeEndMenuRef"
            v-model="timeEndMenu"
            :close-on-content-click="false"
            :nudge-right="40"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="290px"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="timeEnd"
                label="Endzeit"
                prepend-icon="mdi-clock-time-four-outline"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.required"
              ></v-text-field>
            </template>
            <v-time-picker
              v-if="timeEndMenu"
              v-model="timeEnd"
              :allowed-minutes="allowOnlyFullHours"
              :min="minBookingTime"
              :max="maxBookingTime"
              full-width
              @click:minute="$refs.timeEndMenuRef.save(timeEnd)"
              format="24hr"
            ></v-time-picker>
          </v-menu>
        </v-col>
      </v-row>

      <v-row v-if="bookable.isTimePeriodRelated">
        <v-col>
          <v-menu
            ref="dateBeginMenu"
            v-model="dateBeginMenu"
            :close-on-content-click="false"
            :return-value.sync="dateBegin"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="dateBegin"
                label="Datum"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.dateBegin"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="dateBegin"
              :show-current="minBookingDate"
              :max="maxBookingDate"
              :min="minBookingDate"
              locale="de"
              :first-day-of-week="1"
              no-title
              scrollable
              @click:date="$refs.dateBeginMenu.save(dateBegin)"
            >
            </v-date-picker>
          </v-menu>
        </v-col>
        <v-col>
          <v-select
            v-model="timePeriod"
            :items="timePeriods"
            label="Zeitraum"
            prepend-icon="mdi-clock-outline"
            :rules="validationRules.required"
            no-data-text="Es sind keine Zeiträume verfügbar"
          >
          </v-select>
        </v-col>
      </v-row>

      <BookingCalendar
        :bookableId="bookable.id"
        :tenant="inBookableTenant"
        :time-begin="bookingAttempt.timeBegin"
        :time-end="bookingAttempt.timeEnd"
        :date-begin="dateBegin"
      >
      </BookingCalendar>

      <div class="d-flex">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          class="mt-10"
          @click="submit"
          :loading="isCheckingAvailability"
          :disabled="!valid"
        >
          Prüfen und Weiter
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import BookingCalendar from "@/components/Booking/BookingCalendar";

export default {
  name: "CheckoutValidation",
  components: { BookingCalendar },
  props: ["bookable", "bookings", "bookingAttempt"],

  data() {
    return {
      isCheckingAvailability: false,
      valid: null,
      parentBookingAttempt: this.bookingAttempt,
      timePeriod: null,
      dateBegin: null,
      dateBeginMenu: false,
      timeBegin: null,
      timeBeginMenu: false,
      dateEnd: null,
      dateEndMenu: false,
      timeEnd: null,
      timeEndMenu: false,
      inBookableTenant: null,
      validationRules: {
        required: [(v) => !!v],
        dateBegin: [
          (v) => !!v || "Bitte wählen Sie ein Datum aus",
          (v) =>
            new Date(v) >= new Date("2022-10-10") ||
            "Buchungen sind ab dem 10.10.2022 möglich",
          (v) =>
            new Date(v) >= new Date() ||
            "Startdatum muss in der Zukunft liegen",
          (v) =>
            new Date(v) <= new Date().setMonth(new Date().getMonth() + 6) ||
            "Startdatum darf maximal sechs Monate in der Zukunft liegen",
        ],
        dateEnd: [
          (v) => !!v || "Bitte wählen Sie ein Datum aus",
          (v) =>
            new Date(v) >= new Date(this.dateBegin) ||
            "Enddatum muss nach dem Startdatum liegen",
        ],
      },
    };
  },

  watch: {
    dateBegin: function () {
      this.setBookingTime();

      // set dateEnd if dateBegin is higher
      if (this.dateBegin > this.dateEnd || this.dateEnd == null) {
        this.dateEnd = this.dateBegin;
      }

      if (this.bookable.isTimePeriodRelated) {
        this.timePeriod = null;
        this.dateEnd = this.dateBegin;
      }
    },

    timeBegin: function () {
      this.setBookingTime();

      if (
        this.bookable.minBookingDuration > 0 ||
        this.timeEnd < this.timeBegin
      ) {
        this.timeEnd = checkoutUtils.addHoursToTime(
          this.timeBegin,
          this.bookable.minBookingDuration
        );
      }
    },

    timePeriod: function () {
      this.timeBegin = this.timePeriod?.startTime;
      this.timeEnd = this.timePeriod?.endTime;
    },

    dateEnd: function () {
      this.setBookingTime();
    },

    timeEnd: function () {
      this.setBookingTime();
    },
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),

    checkBookingParameters() {
      let valid = true;

      if (
        !!this.bookable.minBookingDuration &&
        this.timestampEnd - this.timestampBegin <
          this.bookable.minBookingDuration * 1000 * 60 * 60
      ) {
        this.addToast(
          ToastService.createToast(
            "checkout.warning.min-booking-duration",
            "error"
          )
        );
        valid = false;
      }

      if (
        !!this.bookable.maxBookingDuration &&
        this.timestampEnd - this.timestampBegin >
          this.bookable.maxBookingDuration * 1000 * 60 * 60
      ) {
        this.addToast(
          ToastService.createToast(
            "checkout.warning.max-booking-duration",
            "error"
          )
        );
        valid = false;
      }

      return valid;
    },

    submit() {
      this.isCheckingAvailability = true;
      if (this.checkBookingParameters()) {
        ApiBookingService.checkoutBooking(
          this.parentBookingAttempt,
          true,
          this.inBookableTenant
        )
          .then((response) => {
            this.isCheckingAvailability = false;
            if (response.status === 200) {
              this.$emit("submit");
            }
          })
          .catch((err) => {
            this.isCheckingAvailability = false;
            console.log(err);
            if (err.response.status === 409) {
              this.addToast(
                ToastService.createToast(
                  "checkout.error.booking-conflict",
                  "error"
                )
              );
            } else {
              this.addToast(
                ToastService.createToast("checkout.error.unexpected", "error")
              );
            }
          });
      }
    },
    setBookingTime() {
      this.parentBookingAttempt.timeBegin = this.timestampBegin;
      this.parentBookingAttempt.timeEnd = this.timestampEnd;
    },
    allowOnlyFullHours(m) {
      const minutes = new Date(`01/01/1970 ${this.timeBegin}`).getMinutes();
      return minutes === m;
    },
  },

  computed: {
    timestampBegin() {
      const d = new Date(this.dateBegin + " " + this.timeBegin);
      return d.getTime();
    },

    timestampEnd() {
      const d = new Date(this.dateEnd + " " + this.timeEnd);
      return d.getTime();
    },
    timePeriods() {
      if (this.dateBegin == null) {
        return [];
      }
      const weekday = new Date(this.dateBegin).getDay();
      // get all time periods for the selected weekday included in the bookable
      const timePeriods = this.bookable.timePeriods.filter((timePeriod) =>
        timePeriod.weekdays.includes(weekday)
      );
      // return startTime and endTime as string
      return timePeriods.map((timePeriod) => {
        return {
          text: timePeriod.startTime + " - " + timePeriod.endTime,
          value: timePeriod,
        };
      });
    },
    minBookingTime() {
      if (
        this.bookable.minBookingDuration > 0 &&
        this.dateBegin === this.dateEnd &&
        this.dateBegin != null
      ) {
        return checkoutUtils.addHoursToTime(
          this.timeBegin,
          this.bookable.minBookingDuration
        );
      } else if (
        !this.bookable.minBookingDuration > 0 &&
        this.bookable.maxBookingDuration > 0 &&
        this.dateBegin === this.dateEnd &&
        this.dateBegin != null
      ) {
        return this.timeBegin;
      } else {
        return null;
      }
    },
    maxBookingTime() {
      if (
        this.bookable.maxBookingDuration > 0 &&
        this.dateBegin === this.dateEnd &&
        this.dateBegin != null
      ) {
        return checkoutUtils.addHoursToTime(
          this.timeBegin,
          this.bookable.maxBookingDuration
        );
      }
      return null;
    },
    maxBookingDate() {
      const maxDate = new Date().setMonth(new Date().getMonth() + 6);
      // return maxDate in ISO 8601 format
      return new Date(maxDate).toISOString().split("T")[0];
    },
    minBookingDate() {
      return new Date().toISOString().split("T")[0];
    },
  },
  created() {
    this.inBookableTenant = this.$route.query.tenant;
  },
};
</script>

<style scoped></style>
