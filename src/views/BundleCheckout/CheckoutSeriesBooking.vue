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
          <v-col cols="12" md="6">
            <v-select
              v-model="seriesFrequency"
              :items="frequencyOptions"
              label="Häufigkeit"
              item-text="text"
              item-value="value"
              prepend-icon="mdi-calendar-sync"
            ></v-select>
          </v-col>
        </v-row>
        <v-btn color="primary" @click="generateSeriesBookings" class="mt-4">
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
      frequencyOptions: [{ text: "Wöchentlich", value: "weekly" }],
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
  },
  methods: {
    generateSeriesBookings() {
      this.$emit("generate-series-bookings", {
        seriesStartDate: this.seriesStartDate,
        seriesEndDate: this.seriesEndDate,
        seriesFrequency: this.seriesFrequency,
      });
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
    formatCurrency(value) {
      return checkoutUtils.formatCurrency(value);
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
</style>
