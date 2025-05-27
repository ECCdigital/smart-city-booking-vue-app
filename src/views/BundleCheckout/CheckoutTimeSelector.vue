<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn v-if="showBack" outlined small @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-if="showContinue"
        :disabled="isNextButtonDisabled"
        color="primary"
        small
        @click="submit"
      >
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
          <checkout-time-period-picker
            v-model="selectedTimePeriod"
            :lead-item="leadItem"
          ></checkout-time-period-picker>
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

      <v-btn
        v-if="showSeries"
        outlined
        small
        class="mt-2"
        :disabled="!timestampBegin || !timestampEnd"
        @click="onGroupBooking"
      >
        Serie erstellen
      </v-btn>

      <checkout-calendar
        v-if="leadItem.bookable && selectionType !== 'time-period'"
        :bookableId="leadItem.bookable.id"
        :tenant="leadItem.bookable.tenantId"
        :booking-time-begin="timestampBegin"
        :booking-time-end="timestampEnd"
        :amount="amount"
        class="mt-10 mb-15"
      >
      </checkout-calendar>
    </v-form>
  </div>
</template>

<script>
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import CheckoutCalendar from "@/components/Checkout/CheckoutCalendar.vue";
import CheckoutTimePeriodPicker from "@/components/Checkout/CheckoutTimePeriodPicker.vue";

export default {
  name: "CheckoutTimeSelector",
  components: { CheckoutTimePeriodPicker, CheckoutCalendar },

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
    amount: {
      type: Number,
    },
    showBack: {
      type: Boolean,
      default: true,
    },
    showContinue: {
      type: Boolean,
      default: true,
    },
    showSeries: {
      type: Boolean,
      default: false,
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
      selectedTimePeriod: null,

      validationRules: {
        required: [(v) => !!v],
        dateBegin: [(v) => !!v || "Bitte wählen Sie ein Datum aus"],
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
      this.$emit("booking-time-selected", {
        begin: this.timestampBegin,
        end: this.timestampEnd,
      });
    },

    submit() {
      if (this.$refs.form.validate()) {
        if (
          !this.dateBeginModel ||
          !this.timeBeginModel ||
          !this.dateEndModel ||
          !this.timeEndModel
        ) {
          return;
        }
        this.$emit("submit");
      }
    },
    back() {
      this.$emit("back");
    },
    onGroupBooking() {
      this.$emit("group-booking");
    },
  },

  computed: {
    isNextButtonDisabled() {
      return !this.leadItem.valid;
    },
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

    minBookingTime() {
      let minDateTime = new Date(this.timestampBegin);
      minDateTime.setHours(
        new Date(this.timestampBegin).getHours() +
          (this.leadItem.bookable.minBookingDuration || 0)
      );

      const minDate = minDateTime.toLocaleDateString("sv-SE");

      if (this.dateEndModel !== minDate) {
        return null;
      }

      return minDateTime.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    maxBookingTime() {
      if (this.leadItem.bookable.maxBookingDuration == null) {
        return null;
      }

      let startDateTime = new Date(this.timestampBegin);

      let maxDateTime = new Date(this.timestampBegin);
      maxDateTime.setHours(
        startDateTime.getHours() + this.leadItem.bookable.maxBookingDuration
      );

      let minDateTime = new Date(this.timestampBegin);
      minDateTime.setHours(
        startDateTime.getHours() + this.leadItem.bookable.minBookingDuration
      );

      const formatDate = (date) => date.toLocaleDateString("sv-SE");

      const maxDate = formatDate(maxDateTime);
      const minDate = formatDate(minDateTime);

      if (this.dateEndModel > maxDate || this.dateEndModel < minDate) {
        return "-1";
      }

      if (this.dateEndModel !== maxDate) {
        return null;
      }

      return maxDateTime.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    minBookingDate() {
      return new Date().toISOString().split("T")[0];
    },
    selectionType() {
      if (this.leadItem.bookable?.isScheduleRelated === true) {
        return "schedule";
      }
      if (this.leadItem.bookable?.isTimePeriodRelated === true) {
        return "time-period";
      }
      if (this.leadItem.bookable?.isLongRange === true) {
        if (this.leadItem.bookable?.longRangeOptions?.type === "week") {
          return "long-range-week";
        } else if (this.leadItem.bookable?.longRangeOptions?.type === "month") {
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
          label: month.toLocaleDateString("de-DE", { month: "long" }),
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
      const dateBegin = new Date(this.dateBeginModel).getTime();
      const dateEnd = new Date(this.dateEndModel).getTime();

      if (dateBegin > dateEnd || this.dateEndModel == null) {
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
        new Date("1970-01-01T" + this.timeBeginModel).getTime() >
          new Date("1970-01-01T" + this.timeEndModel).getTime()
      ) {
        this.timeEndModel = checkoutUtils.addHoursToTime(
          this.timeBeginModel,
          this.leadItem.bookable.minBookingDuration
        );

        const hoursToAdd = Number(this.leadItem.bookable.minBookingDuration);
        const startHours = Number(this.timeBeginModel.split(":")[0]);
        const newTimestamp = new Date(
          this.dateBeginModel + "T" + this.timeBeginModel
        ).setHours(startHours + hoursToAdd);

        // Erstellung eines neuen Date-Objekts für den Vergleich
        const newDate = new Date(newTimestamp);

        // Vergleich der neuen Datumswerte
        if (newDate > new Date(this.dateEndModel + "T" + this.timeEndModel)) {
          this.dateEndModel = newDate.toLocaleDateString("sv-SE");
        }
      }

      this.notifyBookingTimeSelected();
    },

    timePeriodModel: function () {
      this.timeBeginModel = this.timePeriodModel?.startTime;
      this.timeEndModel = this.timePeriodModel?.endTime;
    },

    selectedTimePeriod: function () {
      if (!this.selectedTimePeriod) {
        this.dateBeginModel = null;
        this.timeBeginModel = null;
        this.dateEndModel = null;
        this.timeEndModel = null;
        return;
      }
      const dateBegin = new Date(this.selectedTimePeriod.timeBegin);
      const dateEnd = new Date(this.selectedTimePeriod.timeEnd);
      this.dateBeginModel = dateBegin.toISOString().split("T")[0];
      this.timeBeginModel = dateBegin.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      this.dateEndModel = dateEnd.toISOString().split("T")[0];
      this.timeEndModel = dateEnd.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
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
