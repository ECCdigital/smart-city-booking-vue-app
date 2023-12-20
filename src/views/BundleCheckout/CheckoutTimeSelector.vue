<template>
  <div>
    <div class="d-flex mb-5">
      <v-spacer></v-spacer>
      <v-btn color="primary" class="px-10" small @click="submit">
        Weiter
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
    </div>

    <v-form v-model="valid" ref="form">
      <h2>Buchungszeitraum</h2>
      <p>Bitte wählen Sie den Zeitraum für Ihre Buchung.</p>

      <v-row v-if="selectionType === 'schedule'">
        <v-col>
          <v-menu
            ref="dateBeginMenu"
            :close-on-content-click="false"
            :return-value.sync="dateBeginModel"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="dateBeginModel"
                label="Startdatum"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.dateBegin"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="dateBeginModel"
              no-title
              scrollable
              color="primary"
              locale="de"
              :first-day-of-week="1"
              :show-current="minBookingDate"
              :max="maxBookingDate"
              :min="minBookingDate"
              @click:date="$refs.dateBeginMenu.save(dateBeginModel)"
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
                v-model="timeBeginModel"
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
              v-model="timeBeginModel"
              full-width
              format="24hr"
              @click:minute="$refs.timeBeginMenuRef.save(timeBeginModel)"
            ></v-time-picker>
          </v-menu>
        </v-col>
      </v-row>
      <v-row v-if="selectionType === 'schedule'">
        <v-col>
          <v-menu
            ref="dateEndMenu"
            v-model="dateEndMenu"
            :close-on-content-click="false"
            :return-value.sync="dateEndModel"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="dateEndModel"
                label="Enddatum"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.dateEnd"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="dateEndModel"
              no-title
              scrollable
              color="primary"
              locale="de"
              :first-day-of-week="1"
              :show-current="minBookingDate"
              :max="maxBookingDate"
              :min="dateBeginModel || minBookingDate"
              @click:date="$refs.dateEndMenu.save(dateEndModel)"
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
                v-model="timeEndModel"
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
              v-model="timeEndModel"
              :allowed-minutes="allowOnlyFullHours"
              :min="minBookingTime"
              :max="maxBookingTime"
              full-width
              @click:minute="$refs.timeEndMenuRef.save(timeEndModel)"
              format="24hr"
            ></v-time-picker>
          </v-menu>
        </v-col>
      </v-row>

      <v-row v-if="selectionType === 'time-period'">
        <v-col>
          <v-menu
            ref="dateBeginMenu"
            v-model="dateBeginMenu"
            :close-on-content-click="false"
            :return-value.sync="dateBeginModel"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="dateBeginModel"
                label="Datum"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="validationRules.dateBegin"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="dateBeginModel"
              :show-current="minBookingDate"
              :max="maxBookingDate"
              :min="minBookingDate"
              locale="de"
              :first-day-of-week="1"
              no-title
              scrollable
              @click:date="$refs.dateBeginMenu.save(dateBeginModel)"
            >
            </v-date-picker>
          </v-menu>
        </v-col>
        <v-col>
          <v-select
            v-model="timePeriodModel"
            :items="timePeriods"
            label="Zeitraum"
            prepend-icon="mdi-clock-outline"
            :rules="validationRules.required"
            no-data-text="Es sind keine Zeiträume verfügbar"
          >
          </v-select>
        </v-col>
      </v-row>

      <v-row v-if="selectionType === 'long-range-week'">
        <v-col>
          <v-select
            label="Kalenderwoche"
            hint="Bitte wählen Sie die gewünschte Kalenderwoche aus."
            persistent-hint
            :items="calendarWeeks"
            item-text="label"
            v-model="longRangeWeekModel"
            return-object
          ></v-select>
        </v-col>
      </v-row>
      <v-row v-if="selectionType === 'long-range-month'">
        <v-col>
          <v-select
            label="Monat"
            hint="Bitte wählen Sie den gewünschten Monat aus."
            persistent-hint
            :items="calendarMonths"
            item-text="label"
            v-model="longRangeMonthModel"
            return-object
          >
            <template v-slot:item="{ item }">
              <v-list-item-content>
                <v-list-item-title>
                  {{ item.label }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.year }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </template>
            <template v-slot:selection="{ item }">
              <v-list-item-content>
                <v-list-item-title>
                  {{ item.label }} / {{ item.year }}
                </v-list-item-title>
              </v-list-item-content>
            </template>
          </v-select>
        </v-col>
      </v-row>

      <booking-calendar
        v-if="leadItem.bookable"
        :bookableId="leadItem.bookable.id"
        :tenant="leadItem.bookable.tenant"
        :time-begin="timestampBegin"
        :time-end="timestampEnd"
        :date-begin="dateBeginModel"
      >
      </booking-calendar>
    </v-form>
  </div>
</template>

<script>
import CheckoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import BookingCalendar from "@/components/Booking/BookingCalendar.vue";

export default {
  name: "CheckoutTimeSelector",
  components: { BookingCalendar },

  props: {
    trace: {
      type: Boolean,
    },
    leadItem: {
      type: Object,
      required: true,
    },
    subsequentItems: {
      type: Array,
    },
    timeBegin: {
      type: Number,
    },
    timeEnd: {
      type: Number,
    },
  },

  data() {
    return {
      valid: true,
      validating: false,

      // Menu Models
      dateBeginMenu: false,
      timeBeginMenu: false,
      dateEndMenu: false,
      timeEndMenu: false,

      // DateTime Models
      dateBeginModel: null,
      timeBeginModel: null,
      dateEndModel: null,
      timeEndModel: null,
      timePeriodModel: null,
      longRangeWeekModel: null,
      longRangeMonthModel: null,

      validationRules: {
        required: [(v) => !!v],
        dateBegin: [
          (v) => !!v || "Bitte wählen Sie ein Datum aus",
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
            new Date(v) >= new Date(this.dateBeginModel) ||
            "Enddatum muss nach dem Startdatum liegen",
        ],
      },
    };
  },

  methods: {
    allowOnlyFullHours(m) {
      return true;
      //This prevents date end dialog from selecting minutes
      const minutes = new Date(`01/01/1970 ${this.timeBegin}`).getMinutes();
      return minutes === m;
    },
    notifyBookingTimeSelected() {
      if (
        this.timeBeginModel != null &&
        this.timeEndModel != null &&
        this.dateBeginModel != null &&
        this.dateEndModel != null
      ) {
        this.$emit("booking-time-selected", {
          begin: this.timestampBegin,
          end: this.timestampEnd,
        });
      }
    },

    submit() {
      if (this.$refs.form.validate()) {
        this.$emit("submit");
      }
    },
  },

  computed: {
    timestampBegin() {
      if (this.dateBeginModel == null || this.timeBeginModel == null) {
        return 0;
      }
      const d = new Date(this.dateBeginModel + " " + this.timeBeginModel);
      return d.getTime();
    },

    timestampEnd() {
      if (this.dateEndModel == null || this.timeEndModel == null) {
        return 0;
      }
      const d = new Date(this.dateEndModel + " " + this.timeEndModel);
      return d.getTime();
    },

    timePeriods() {
      if (this.dateBeginModel == null) {
        return [];
      }
      const weekday = new Date(this.dateBeginModel).getDay();
      // get all time periods for the selected weekday included in the bookable
      const timePeriods = this.leadItem.bookable.timePeriods.filter(
        (timePeriod) => timePeriod.weekdays.includes(weekday)
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
        this.leadItem.bookable.minBookingDuration > 0 &&
        this.dateBeginModel === this.dateEndModel &&
        this.dateBeginModel != null
      ) {
        return CheckoutUtils.addHoursToTime(
          this.timeBeginModel,
          this.leadItem.bookable.minBookingDuration
        );
      } else if (
        !this.leadItem.bookable.minBookingDuration > 0 &&
        this.leadItem.bookable.maxBookingDuration > 0 &&
        this.dateBeginModel === this.dateEndModel &&
        this.dateBeginModel != null
      ) {
        return this.timeBeginModel;
      } else {
        return null;
      }
    },
    maxBookingTime() {
      if (
        this.leadItem.bookable.maxBookingDuration > 0 &&
        this.dateBeginModel === this.dateEndModel &&
        this.dateBeginModel != null
      ) {
        return CheckoutUtils.addHoursToTime(
          this.timeBeginModel,
          this.leadItem.bookable.maxBookingDuration
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
    selectionType() {
      if (this.leadItem.bookable.isScheduleRelated === true) {
        return "schedule";
      }
      if (this.leadItem.bookable.isTimePeriodRelated === true) {
        return "time-period";
      }
      if (this.leadItem.bookable.isLongRange === true) {
        if (this.leadItem.bookable.longRangeOptions?.type === "week") {
          return "long-range-week";
        } else if (this.leadItem.bookable.longRangeOptions?.type === "month") {
          return "long-range-month";
        }
      }

      return undefined;
    },
    calendarWeeks() {
      let calendarWeeks = [];

      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7)
      );

      for (let i = 0; i < 25; i++) {
        const monday = new Date(nextMonday);
        monday.setDate(monday.getDate() + i * 7);
        const friday = new Date(monday);
        friday.setDate(friday.getDate() + 4);
        calendarWeeks.push({
          label:
            monday.toLocaleDateString() + " - " + friday.toLocaleDateString(),
          startDate: monday.toISOString().split("T")[0],
          endDate: friday.toISOString().split("T")[0],
        });
      }

      return calendarWeeks;
    },
    calendarMonths() {
      let calendarMonths = [];

      const nextMonth = new Date();
      nextMonth.setDate(1);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      for (let i = 0; i < 6; i++) {
        const month = new Date(nextMonth);
        month.setMonth(month.getMonth() + i);
        calendarMonths.push({
          label: month.toLocaleDateString("de-DE", { month: "long"}),
          year: month.getFullYear(),
          startDate: month.toISOString().split("T")[0],
          endDate: new Date(month.getFullYear(), month.getMonth() + 1, 1)
            .toISOString()
            .split("T")[0],
        });
      }
      return calendarMonths;
    },
  },

  watch: {
    dateBeginModel: function () {
      // set dateEnd if dateBegin is higher
      if (
        new Date(this.timeBeginModel) > new Date(this.timeEndModel) ||
        this.dateEndModel == null
      ) {
        this.dateEndModel = this.dateBeginModel;
      }

      if (this.leadItem.bookable.isTimePeriodRelated) {
        this.timePeriod = null;
        this.dateEndModel = this.dateBeginModel;
      }

      this.notifyBookingTimeSelected();
    },

    timeBeginModel: function () {
      if (
        this.leadItem.bookable.minBookingDuration > 0 ||
        new Date(this.timeEndModel) < new Date(this.timeBeginModel)
      ) {
        this.timeEndModel = checkoutUtils.addHoursToTime(
          this.timeBeginModel,
          this.leadItem.bookable.minBookingDuration
        );
      }

      this.notifyBookingTimeSelected();
    },

    timePeriodModel: function () {
      this.timeBeginModel = this.timePeriodModel?.startTime;
      this.timeEndModel = this.timePeriodModel?.endTime;
    },

    dateEndModel: function () {
      this.notifyBookingTimeSelected();
    },

    timeEndModel: function () {
      this.notifyBookingTimeSelected();
    },

    longRangeWeekModel: function () {
      this.dateBeginModel = this.longRangeWeekModel?.startDate;
      this.timeBeginModel = "08:00";
      this.dateEndModel = this.longRangeWeekModel?.endDate;
      this.timeEndModel = "18:00";
    },
    longRangeMonthModel: function () {
      this.dateBeginModel = this.longRangeMonthModel?.startDate;
      this.timeBeginModel = "08:00";
      this.dateEndModel = this.longRangeMonthModel?.endDate;
      this.timeEndModel = "18:00";
    },
  },

  mounted() {
    if (this.timeBegin != null) {
      this.dateBeginModel = new Date(this.timeBegin)
        .toISOString()
        .split("T")[0];
      this.timeBeginModel = new Date(this.timeBegin).toLocaleTimeString(
        "de-DE",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }

    if (this.timeEnd != null) {
      this.dateEndModel = new Date(this.timeEnd).toISOString().split("T")[0];
      this.timeEndModel = new Date(this.timeEnd).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  },
};
</script>

<style scoped></style>
