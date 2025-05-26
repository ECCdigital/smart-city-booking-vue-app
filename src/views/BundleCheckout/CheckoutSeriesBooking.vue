<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn outlined small @click="$emit('back')">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        :disabled="!allValid || bookingAttempts.length < 1"
        small
        @click="validateAndContinue"
      >
        Weiter
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
    </div>

    <v-card outlined class="rounded-sm mb-6">
      <v-card-title class="d-flex justify-space-between">
        <span v-if="leadItem.bookable">
          {{ leadItem.bookable.title }}
        </span>
        <v-btn v-if="!changeBooking" outlined small @click="onChangeBooking">
          ändern
        </v-btn>
        <div v-else>
          <v-btn outlined @click="discardBookingTime"> abbrechen </v-btn>
          <v-btn color="primary" class="ml-2" @click="confirmBookingTime">
            übernehmen
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text v-if="!changeBooking">
        <v-row>
          <v-col>
            <v-text-field
              v-model="localDateBeginModel"
              label="Startdatum"
              prepend-icon="mdi-calendar"
              disabled
            ></v-text-field>
          </v-col>
          <v-col>
            <v-text-field
              v-model="localTimeBeginModel"
              label="Startzeit"
              prepend-icon="mdi-clock-time-four-outline"
              disabled
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              v-model="localDateEndModel"
              label="Enddatum"
              prepend-icon="mdi-calendar"
              disabled
            ></v-text-field>
          </v-col>
          <v-col>
            <v-text-field
              v-model="localTimeEndModel"
              label="Endzeit"
              prepend-icon="mdi-clock-time-four-outline"
              disabled
            ></v-text-field>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-text v-else>
        <checkout-time-selector
          :lead-item="leadItem"
          :show-back="false"
          :show-continue="false"
          :show-series="false"
          :time-begin="getTimeStamp(localDateBeginModel, localTimeBeginModel)"
          :time-end="getTimeStamp(localDateEndModel, localTimeEndModel)"
          @booking-time-selected="changeBookingTime"
        >
        </checkout-time-selector>
      </v-card-text>
    </v-card>

    <v-card outlined class="rounded-sm mb-6">
      <v-card-title>Serienbuchung erstellen</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-menu
              ref="startDateMenu"
              v-model="startDateMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="seriesStartDate"
                  label="Startdatum"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                  :rules="[(v) => !!v || 'Startdatum ist erforderlich']"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="seriesStartDate"
                no-title
                scrollable
                color="primary"
                locale="de"
                :first-day-of-week="1"
                :min="minBookingDate"
                @input="startDateMenu = false"
              >
              </v-date-picker>
            </v-menu>
          </v-col>
          <v-col cols="12" md="6">
            <v-menu
              ref="endDateMenu"
              v-model="endDateMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="seriesEndDate"
                  label="Enddatum"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                  :rules="[
                    (v) => !!v || 'Enddatum ist erforderlich',
                    (v) =>
                      new Date(v) >= new Date(seriesStartDate) ||
                      'Enddatum muss nach dem Startdatum liegen',
                  ]"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="seriesEndDate"
                no-title
                scrollable
                color="primary"
                locale="de"
                :first-day-of-week="1"
                :min="seriesStartDate"
                @input="endDateMenu = false"
              >
              </v-date-picker>
            </v-menu>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field
              label="Intervall"
              v-model.number="seriesInterval"
              type="number"
              min="1"
              step="1"
              :rules="intervalRules"
              prepend-icon="mdi-calendar-range"
            >
            </v-text-field>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="seriesFrequency"
              :items="frequencyOptions"
              label="Häufigkeit"
              item-text="text"
              item-value="value"
              prepend-icon="mdi-calendar-sync"
            ></v-select>
          </v-col>
          <template v-if="seriesFrequency === 'monthly'">
            <v-col cols="12" md="6">
              <v-select
                v-model="monthlyOptionType"
                :items="monthlyOptionTypes"
                label="Monatliche Wiederholung"
                item-text="text"
                item-value="value"
                prepend-icon="mdi-calendar-month"
              ></v-select>
            </v-col>
          </template>

          <template v-if="seriesFrequency === 'weekly'">
            <v-col cols="12" md="6" class="d-flex align-center justify-center">
              <v-icon> mdi-calendar-range </v-icon>
              <v-row class="ml-2">
                <v-col
                  v-for="day in weekdays"
                  :key="day.value"
                  cols="auto"
                  class="pa-1"
                >
                  <v-btn
                    :color="
                      selectedWeekdays.includes(day.value) ? 'primary' : ''
                    "
                    :outlined="!selectedWeekdays.includes(day.value)"
                    @click="toggleWeekday(day.value)"
                    class="weekday-btn"
                    small
                  >
                    {{ day.text.charAt(0) }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-col>
          </template>
        </v-row>

        <template v-if="seriesFrequency === 'monthly'">
          <v-row v-if="monthlyOptionType === 'day'">
            <v-col cols="12" md="6">
              <v-select
                v-model="selectedDayOfMonth"
                :items="daysOfMonth"
                label="Tag des Monats"
                item-text="text"
                item-value="value"
                prepend-icon="mdi-calendar-today"
              ></v-select>
            </v-col>
          </v-row>

          <v-row v-if="monthlyOptionType === 'weekday'">
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedWeekdayOption"
                :items="weekdayOptions"
                label="Welcher"
                item-text="text"
                item-value="value"
                prepend-icon="mdi-calendar-week"
              ></v-select>
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedWeekday"
                :items="weekdays"
                label="Wochentag"
                item-text="text"
                item-value="value"
                prepend-icon="mdi-calendar-weekend"
              ></v-select>
            </v-col>
          </v-row>
        </template>

        <v-btn
          color="primary"
          @click="validateAndGenerateSeriesBookings"
          class="mt-4"
          :disabled="!isFormValid"
        >
          <v-icon left>mdi-calendar-multiple</v-icon>
          Serie generieren
        </v-btn>
      </v-card-text>
    </v-card>

    <div v-if="bookingAttempts.length > 0">
      <v-card outlined class="rounded-sm mb-6">
        <v-card-title> Serie </v-card-title>
        <v-card-text>
          <v-simple-table class="rounded-sm">
            <template v-slot:default>
              <thead class="rounded-sm">
                <tr>
                  <th>Zeitraum</th>
                  <th>Preis</th>
                  <th>Buchbar</th>
                  <th class="text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(attempt, index) in bookingAttempts">
                  <tr :key="index" :class="{ error: attempt.valid === false }">
                    <td>
                      <span v-if="attempt.timeBegin && attempt.timeEnd">
                        {{ formatDateTime(attempt.timeBegin) }} –
                        {{ formatDateTime(attempt.timeEnd) }}
                      </span>
                    </td>
                    <td>
                      {{ attempt.userPriceEur | currency }}
                    </td>
                    <td>
                      <v-icon
                        v-if="attempt.valid"
                        color="green"
                        size="24"
                        class="mr-2"
                      >
                        mdi-check-circle
                      </v-icon>
                      <v-icon v-else color="black" size="24" class="mr-2">
                        mdi-alert-circle
                      </v-icon>
                      <span v-if="attempt.valid">verfügbar</span>
                      <span v-else
                        ><span
                          v-for="(error, idx) in attempt.error"
                          :key="idx"
                          >{{ error }}</span
                        ></span
                      >
                    </td>
                    <td class="text-right">
                      <v-btn icon @click="removeBookingAttempt(index)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </template>
              </tbody>
            </template>
          </v-simple-table>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script>
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import CheckoutTimeSelector from "@/views/BundleCheckout/CheckoutTimeSelector.vue";

export default {
  name: "CheckoutSeriesBooking",
  components: { CheckoutTimeSelector },
  props: {
    leadItem: {
      type: Object,
      required: true,
    },
    bookingAttempts: {
      type: Array,
      required: true,
    },
    dateBeginModel: {
      type: String,
      default: null,
    },
    dateEndModel: {
      type: String,
      default: null,
    },
    timeBeginModel: {
      type: String,
      default: null,
    },
    timeEndModel: {
      type: String,
      default: null,
    },
    firstBookingDate: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      startDateMenu: false,
      endDateMenu: false,
      seriesStartDate: null,
      seriesEndDate: null,
      seriesFrequency: "weekly",
      seriesInterval: 1,
      intervalRules: [
        (v) => (v !== null && v > 0) || "Bitte eine Zahl größer 0 eingeben",
      ],
      frequencyOptions: [
        { text: "Wöchentlich", value: "weekly" },
        { text: "Monatlich", value: "monthly" },
      ],
      intervalOptions: [
        { text: "Jede(n)", value: 1 },
        { text: "Alle 2", value: 2 },
        { text: "Alle 3", value: 3 },
        { text: "Alle 4", value: 4 },
        { text: "Alle 5", value: 5 },
        { text: "Alle 6", value: 6 },
        { text: "Alle 7", value: 7 },
        { text: "Alle 8", value: 8 },
        { text: "Alle 9", value: 9 },
        { text: "Alle 10", value: 10 },
        { text: "Alle 11", value: 11 },
        { text: "Alle 12", value: 12 },
      ],
      monthlyOptionType: "day",
      monthlyOptionTypes: [
        { text: "Tag des Monats", value: "day" },
        { text: "Wochentag", value: "weekday" },
      ],
      selectedDayOfMonth: 1,
      daysOfMonth: Array.from({ length: 31 }, (_, i) => ({
        text: `${i + 1}.`,
        value: i + 1,
      })),
      selectedWeekdayOption: "first",
      weekdayOptions: [
        { text: "Ersten", value: "first" },
        { text: "Zweiten", value: "second" },
        { text: "Dritten", value: "third" },
        { text: "Vierten", value: "fourth" },
        { text: "Letzten", value: "last" },
      ],
      selectedWeekday: 1,
      weekdays: [
        { text: "Montag", value: 1 },
        { text: "Dienstag", value: 2 },
        { text: "Mittwoch", value: 3 },
        { text: "Donnerstag", value: 4 },
        { text: "Freitag", value: 5 },
        { text: "Samstag", value: 6 },
        { text: "Sonntag", value: 0 },
      ],
      selectedWeekdays: [],
      localDateBeginModel: null,
      localTimeBeginModel: null,
      localDateEndModel: null,
      localTimeEndModel: null,
      changeBooking: false,
      tmpBegin: null,
      tmpEnd: null,
    };
  },
  computed: {
    minBookingDate() {
      return new Date().toISOString().split("T")[0];
    },
    allValid() {
      return this.bookingAttempts.every((attempt) => attempt.valid);
    },
    isFormValid() {
      const isIntervalValid =
        this.seriesInterval !== null && this.seriesInterval > 0;

      const isStartDateValid = !!this.seriesStartDate;
      const isEndDateValid =
        !!this.seriesEndDate &&
        new Date(this.seriesEndDate) >= new Date(this.seriesStartDate);

      const isWeekdayValid =
        this.seriesFrequency !== "weekly" || this.selectedWeekdays.length > 0;

      return (
        isIntervalValid && isStartDateValid && isEndDateValid && isWeekdayValid
      );
    },
  },
  methods: {
    toggleWeekday(dayValue) {
      const index = this.selectedWeekdays.indexOf(dayValue);
      if (index === -1) {
        this.selectedWeekdays.push(dayValue);
      } else {
        this.selectedWeekdays.splice(index, 1);
      }
    },
    validateAndGenerateSeriesBookings() {
      if (this.isFormValid) {
        this.generateSeriesBookings();
      }
    },
    generateSeriesBookings() {
      const seriesData = {
        seriesStartDate: this.seriesStartDate,
        seriesEndDate: this.seriesEndDate,
        seriesFrequency: this.seriesFrequency,
        seriesInterval: this.seriesInterval,
      };

      if (this.seriesFrequency === "weekly") {
        if (this.selectedWeekdays.length === 0) {
          this.preSelectFirstBookingDay();
        }
        seriesData.selectedWeekdays = this.selectedWeekdays;
      } else if (this.seriesFrequency === "monthly") {
        seriesData.monthlyOptionType = this.monthlyOptionType;

        if (this.monthlyOptionType === "day") {
          seriesData.selectedDayOfMonth = this.selectedDayOfMonth;
        } else if (this.monthlyOptionType === "weekday") {
          seriesData.selectedWeekdayOption = this.selectedWeekdayOption;
          seriesData.selectedWeekday = this.selectedWeekday;
        }
      }

      this.$emit("generate-series-bookings", seriesData);
    },
    removeBookingAttempt(index) {
      this.$emit("remove-booking-attempt", index);
    },
    validateAndContinue() {
      this.$emit("validate-and-continue");
    },
    formatDateTime(timestamp) {
      return checkoutUtils.dateToLocaleString(timestamp);
    },
    onChangeBooking() {
      this.changeBooking = !this.changeBooking;
    },
    getTimeStamp(date, time) {
      const dateParts = date.split("-");
      const timeParts = time.split(":");
      return new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        timeParts[0],
        timeParts[1]
      ).getTime();
    },
    changeBookingTime(time) {
      this.tmpBegin = time.begin;
      this.tmpEnd = time.end;
    },
    discardBookingTime() {
      this.tmpBegin = null;
      this.tmpEnd = null;
      this.changeBooking = false;
    },
    confirmBookingTime() {
      this.$emit("change-booking-time", {
        timeBegin: this.tmpBegin,
        timeEnd: this.tmpEnd,
      });
      this.changeBooking = false;
    },
    preSelectFirstBookingDay() {
      if (this.firstBookingDate) {
        const firstDate = new Date(this.firstBookingDate);
        const dayOfWeek = firstDate.getDay(); // 0 for Sunday, 1 for Monday, etc.

        // Clear the array and add the day of the first booking
        this.selectedWeekdays = [dayOfWeek];
      }
    },
  },
  watch: {
    dateBeginModel(newVal) {
      this.localDateBeginModel = newVal;
    },
    timeBeginModel(newVal) {
      this.localTimeBeginModel = newVal;
    },
    dateEndModel(newVal) {
      this.localDateEndModel = newVal;
    },
    timeEndModel(newVal) {
      this.localTimeEndModel = newVal;
    },
    firstBookingDate(newVal) {
      if (newVal) {
        this.seriesStartDate = new Date(newVal).toISOString().split("T")[0];
        const endDate = new Date(newVal || new Date());
        endDate.setMonth(endDate.getMonth() + 1);
        this.seriesEndDate = endDate.toISOString().split("T")[0];

        // Pre-select the day of the first booking
        this.preSelectFirstBookingDay();
      }
    },
    seriesFrequency(newVal) {
      if (newVal === "weekly") {
        this.preSelectFirstBookingDay();
      }
    },
  },
  mounted() {
    // Initialize local form fields from props

    this.localDateBeginModel = this.dateBeginModel;
    this.localTimeBeginModel = this.timeBeginModel;
    this.localDateEndModel = this.dateEndModel;
    this.localTimeEndModel = this.timeEndModel;

    // Initialize dates from props
    if (this.dateBeginModel) {
      this.seriesStartDate = this.dateBeginModel;
    } else {
      this.seriesStartDate = new Date().toISOString().split("T")[0];
    }

    const endDate = new Date(this.firstBookingDate || new Date());
    endDate.setMonth(endDate.getMonth() + 1);
    this.seriesEndDate = endDate.toISOString().split("T")[0];

    // Pre-select the day of the first booking
    this.preSelectFirstBookingDay();
  },
};
</script>

<style scoped>
.theme--light.v-data-table thead th {
  background-color: transparent !important;
  &:first-child {
    border-radius: 0 0 0 0;
  }
  &:last-child {
    border-radius: 0 0 0 0;
  }
}
.theme--dark.v-data-table thead th {
  background-color: transparent !important;
  &:first-child {
    border-radius: 0 0 0 0;
  }
  &:last-child {
    border-radius: 0 0 0 0;
  }
}

.v-data-table table tr:last-child:hover td:first-child {
  border-bottom-left-radius: 0 !important;
}

.v-data-table table tr:last-child:hover td:last-child {
  border-bottom-right-radius: 0 !important;
}

.weekday-btn {
  min-width: 36px !important;
  width: 36px;
  height: 36px;
  font-weight: bold;
}
</style>
