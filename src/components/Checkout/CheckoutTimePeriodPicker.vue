<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";

export default {
  name: "CheckoutTimePeriodPicker",
  props: {
    leadItem: {
      type: Object,
      required: true,
    },
    value: {
      type: Object,
    },
  },
  data: function () {
    const todayStr = new Date().toISOString().split("T")[0];

    return {
      date: null,
      timePeriod: null,
      occupations: [],
      displayedMonth: todayStr,
      loading: false,
      availabilityLoaded: false,
    };
  },
  computed: {},
  methods: {
    allowedDates(val) {
      if (!this.availabilityLoaded || this.loading) {
        return false;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const date = new Date(val);
      date.setHours(0, 0, 0, 0);

      if (date < today) {
        return false;
      }

      return this.filterTimePeriods(val).length > 0;
    },
    filterTimePeriods(val) {
      if (val == null) {
        return [];
      }

      const date = new Date(val);
      const weekday = date.getDay();

      const periods = this.leadItem.bookable.timePeriods
        .filter((timePeriod) => timePeriod.weekdays.includes(weekday))
        .map((timePeriod) => {
          const [sh, sm] = timePeriod.startTime.split(":").map(Number);
          const [eh, em] = timePeriod.endTime.split(":").map(Number);
          const dateOnly = new Date(val);
          const timeBegin = new Date(
            dateOnly.getFullYear(),
            dateOnly.getMonth(),
            dateOnly.getDate(),
            sh,
            sm
          ).getTime();
          const timeEnd = new Date(
            dateOnly.getFullYear(),
            dateOnly.getMonth(),
            dateOnly.getDate(),
            eh,
            em
          ).getTime();
          return {
            text: `${timePeriod.startTime} - ${timePeriod.endTime}`,
            value: timePeriod,
            timeBegin,
            timeEnd,
          };
        });

      return periods.filter((period) =>
        this.occupations.every(
          (occ) =>
            occ.available === true ||
            !(
              period.timeBegin >= occ.timeBegin && period.timeEnd <= occ.timeEnd
            )
        )
      );
    },
    transformDate(date) {
      return date.split("-").reverse().join(".");
    },
    selectTimePeriod(timePeriod) {
      this.timePeriod = timePeriod;
      this.$emit("selectTimePeriod", timePeriod);
    },
    isSelected(timePeriod) {
      return JSON.stringify(this.timePeriod) === JSON.stringify(timePeriod);
    },

    async validateAvailability() {
      this.loading = true;
      this.availabilityLoaded = false;
      const dateObj = new Date(this.displayedMonth);
      const firstDayOfMonth = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        1
      );
      const lastDayOfMonth = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        0
      );

      const timeBegin = firstDayOfMonth.toISOString();
      const timeEnd = lastDayOfMonth.toISOString();

      try {
        const response = await ApiBookablesService.getBookableAvailability(
          this.leadItem.bookable.id,
          this.leadItem.bookable.tenantId,
          timeBegin,
          timeEnd,
          this.leadItem.amount
        );
        if (response.data) {
          this.occupations = response.data.map((occ) => ({
            ...occ,
            timeBegin: new Date(occ.timeBegin).getTime(),
            timeEnd: new Date(occ.timeEnd).getTime(),
          }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
        this.availabilityLoaded = true;
      }
    },
    updateDisplayedMonth(val) {
      this.displayedMonth = val;
    },
    scrollToElement(id) {
      const el = this.$refs[id];
      el.scrollIntoView({ behavior: "smooth" });
    },
  },
  watch: {
    date: {
      handler: function (old, val) {
        if (old && val) {
          this.scrollToElement("time-periods");
        }
      },
      immediate: true,
    },
    timePeriod: {
      handler: function (val) {
        this.$emit("input", val);
      },
      immediate: true,
    },
    displayedMonth: {
      handler: function () {
        this.validateAvailability();
      },
      immediate: true,
    },
  },
  mounted() {
    this.validateAvailability();
  },
};
</script>

<template>
  <div>
    <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
    <v-date-picker
      no-title
      v-model="date"
      locale="de"
      :allowed-dates="allowedDates"
      color="secondary"
      full-width
      @update:picker-date="updateDisplayedMonth"
    >
    </v-date-picker>
    <div ref="time-periods"></div>
    <v-row v-if="date" class="mt-10">
      <v-col>
        <span class="subtitle-1"
          >Welchen Zeitraum wollen Sie am
          <strong>{{ transformDate(this.date) }}</strong> buchen?</span
        >
      </v-col>
    </v-row>
    <div v-if="!loading">
      <div v-if="date">
        <v-row v-if="filterTimePeriods(date).length > 0" class="primary">
          <v-col
            class="col-12 col-md-4"
            v-for="timePeriod in filterTimePeriods(date)"
            :key="timePeriod.value.id"
          >
            <v-btn
              outlined
              small
              block
              :color="isSelected(timePeriod) ? 'secondary' : 'white'"
              @click="selectTimePeriod(timePeriod)"
              >{{ timePeriod.text }}
              <v-icon right dark> mdi-chevron-right </v-icon></v-btn
            >
          </v-col>
        </v-row>
        <v-row v-else class="primary">
          <v-col>
            <span class="subtitle-1 secondary--text"
              >Für den ausgewählten Tag sind keine Zeiträume verfügbar.</span
            >
          </v-col>
        </v-row>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
