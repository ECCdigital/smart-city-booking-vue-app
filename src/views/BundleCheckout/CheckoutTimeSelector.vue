<template>
  <div>
    <TimezoneWarning system-timezone="Europe/Berlin" />

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
        class="px-10"
        small
        @click="submit"
      >
        Weiter
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
    <v-form v-model="valid" ref="form">
      <h2>Buchungszeitraum</h2>
      <p>
        {{
          selectionType === 'block-period'
            ? 'Bitte wählen Sie einen verfügbaren Zeitraum aus.'
            : 'Bitte wählen Sie den Zeitraum für Ihre Buchung.'
        }}
      </p>

      <v-row v-if="selectionType === 'schedule'">
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
                v-model="dateBeginDisplay"
                v-bind="attrs"
                v-on="on"
                label="Startdatum"
                prepend-icon="mdi-calendar"
                type="text"
                v-mask="'##.##.####'"
                inputmode="numeric"
                placeholder="DD.MM.YYYY"
                :rules="validationRules.dateBegin"
                @click:prepend="dateBeginMenu = true"
                @change="$refs.dateBeginMenu.save(dateBeginModel)"
              />
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
            />
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
                v-bind="attrs"
                v-on="on"
                label="Startzeit"
                prepend-icon="mdi-clock-time-four-outline"
                type="text"
                v-mask="'##:##'"
                inputmode="numeric"
                placeholder="HH:mm"
                :rules="validationRules.time"
                @click:prepend="timeBeginMenu = true"
              />
            </template>
            <v-time-picker
              v-if="timeBeginMenu"
              v-model="timeBeginModel"
              full-width
              format="24hr"
              :allowed-minutes="[0,5,10,15,20,25,30,35,40,45,50,55]"
              @click:minute="$refs.timeBeginMenuRef.save(timeBeginModel)"
            />
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
                v-model="dateEndDisplay"
                v-bind="attrs"
                v-on="on"
                label="Enddatum"
                prepend-icon="mdi-calendar"
                type="text"
                v-mask="'##.##.####'"
                inputmode="numeric"
                placeholder="DD.MM.YYYY"
                :rules="validationRules.dateBegin"
                @click:prepend="dateEndMenu = true"
                @change="$refs.dateEndMenu.save(dateEndModel)"
              />
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
            />
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
                v-bind="attrs"
                v-on="on"
                label="Endzeit"
                prepend-icon="mdi-clock-time-four-outline"
                type="text"
                v-mask="'##:##'"
                inputmode="numeric"
                placeholder="HH:mm"
                :rules="validationRules.time"
                @click:prepend="timeEndMenu = true"
              />
            </template>
            <v-time-picker
              v-if="timeEndMenu"
              v-model="timeEndModel"
              :min="minBookingTime"
              :max="maxBookingTime"
              full-width
              format="24hr"
              :allowed-minutes="[0,5,10,15,20,25,30,35,40,45,50,55]"
              @click:minute="$refs.timeEndMenuRef.save(timeEndModel)"
            />
          </v-menu>
        </v-col>
      </v-row>
      <v-row v-if="selectionType === 'time-period'">
        <v-col>
          <checkout-time-period-picker
            v-model="selectedTimePeriod"
            :lead-item="leadItem"
          />
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
          />
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

      <v-row v-if="selectionType === 'block-period'">
        <v-col>
          <checkout-block-period-picker
            v-model="selectedBlockPeriod"
            :lead-item="leadItem"
            :amount="amount"
          />
        </v-col>
      </v-row>

      <v-btn
        v-if="showSeries && selectionType !== 'block-period'"
        outlined
        small
        class="mt-2"
        :disabled="!timestampBegin || !timestampEnd"
        @click="onGroupBooking"
      >
        Serie erstellen
      </v-btn>

      <checkout-calendar
        v-if="
          leadItem.bookable &&
          selectionType !== 'time-period' &&
          selectionType !== 'block-period'
        "
        :bookableId="leadItem.bookable.id"
        :tenant="leadItem.bookable.tenantId"
        :booking-time-begin="timestampBegin"
        :booking-time-end="timestampEnd"
        :amount="amount"
        class="mt-10 mb-15"
      />
    </v-form>
  </div>
</template>

<script>
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import CheckoutCalendar from "@/components/Checkout/CheckoutCalendar.vue";
import CheckoutTimePeriodPicker from "@/components/Checkout/CheckoutTimePeriodPicker.vue";
import CheckoutBlockPeriodPicker from "@/components/Checkout/CheckoutBlockPeriodPicker.vue";
import TimezoneWarning from "@/components/TimezoneWarning.vue";

export default {
  name: "CheckoutTimeSelector",
  components: {
    TimezoneWarning,
    CheckoutTimePeriodPicker,
    CheckoutBlockPeriodPicker,
    CheckoutCalendar,
  },

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
      selectedBlockPeriod: null,

      validationRules: {
        dateBegin: [
          (v) => !!v || "Bitte wählen Sie ein Datum aus",
          (v) => !!this.parseDeToIso(v) || "Ungültiges Datum",
        ],
        dateEnd: [
          (v) => !!v || "Bitte wählen Sie ein Datum aus",
          (v) => !!this.parseDeToIso(v) || "Ungültiges Datum",
          () =>
            !this.dateBeginModel ||
            !this.dateEndModel ||
            this.dateEndModel >= this.dateBeginModel ||
            "Enddatum muss nach dem Startdatum liegen",
        ],
        time: [
          (v) => !!v || "Pflichtfeld",
          (v) =>
            this.isValidTime(v) || "Ungültige Zeit",
        ],
      },
    };
  },

  methods: {
    notifyBookingTimeSelected() {
      this.$emit("booking-time-selected", {
        begin: this.timestampBegin,
        end: this.timestampEnd,
      });
    },

    submit() {
      if (this.selectionType === "block-period") {
        if (this.selectedBlockPeriod) {
          this.$emit("submit");
        }
        return;
      }

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
    formatIsoToDe(iso) {
      if (!iso) return null;
      const [y, m, d] = iso.split("-");
      if (!y || !m || !d) return iso;
      return `${d}.${m}.${y}`;
    },

    parseDeToIso(de) {
      if (!de) return null;

      const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(de);
      if (!m) return null;

      const d = Number(m[1]);
      const mo = Number(m[2]);
      const y = Number(m[3]);

      const dt = new Date(y, mo - 1, d);
      const valid =
        dt.getFullYear() === y &&
        dt.getMonth() === mo - 1 &&
        dt.getDate() === d;

      if (!valid) return null;

      const iso = `${String(y).padStart(4, "0")}-${String(mo).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;

      return iso;
    },
    isValidTime(v) {
      if (!v) return false;
      if (!/^\d{2}:\d{2}$/.test(v)) return false;

      const [hh, mm] = v.split(":").map(Number);
      if (Number.isNaN(hh) || Number.isNaN(mm)) return false;

      return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
    },
  },

  computed: {
    dateBeginDisplay: {
      get() {
        return this.formatIsoToDe(this.dateBeginModel);
      },
      set(v) {
        const iso = this.parseDeToIso(v);
        if (iso) this.dateBeginModel = iso;
      },
    },

    dateEndDisplay: {
      get() {
        return this.formatIsoToDe(this.dateEndModel);
      },
      set(v) {
        const iso = this.parseDeToIso(v);
        if (iso) this.dateEndModel = iso;
      },
    },
    isNextButtonDisabled() {
      if (this.selectionType === "block-period") {
        return !this.selectedBlockPeriod || !this.leadItem.valid;
      }
      return !this.leadItem.valid;
    },
    timestampBegin() {
      if (!this.dateBeginModel || !this.timeBeginModel) return null;
      return new Date(`${this.dateBeginModel}T${this.timeBeginModel}:00`).getTime();
    },

    timestampEnd() {
      if (!this.dateEndModel || !this.timeEndModel) return null;
      return new Date(`${this.dateEndModel}T${this.timeEndModel}:00`).getTime();
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
      if (this.leadItem.bookable?.isBlockPeriodRelated === true) {
        return "block-period";
      }
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

    selectedBlockPeriod() {
      if (!this.selectedBlockPeriod) {
        this.$emit("booking-time-selected", { begin: null, end: null });
        return;
      }
      this.$emit("booking-time-selected", {
        begin: this.selectedBlockPeriod.timeBegin,
        end: this.selectedBlockPeriod.timeEnd,
      });
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
    if (
      this.leadItem.bookable?.isBlockPeriodRelated &&
      this.timeBegin != null &&
      this.timeEnd != null
    ) {
      this.selectedBlockPeriod = {
        timeBegin: this.timeBegin,
        timeEnd: this.timeEnd,
      };
      return;
    }

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
