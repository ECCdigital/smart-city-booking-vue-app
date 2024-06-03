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
    return {
      test: null,
      date: (new Date()).toISOString().split("T")[0],
      timePeriod: null,
      occupations: [],
      displayedMonth: null,
      loading: false,
    };
  },
  computed: {
  },
  methods: {
    allowedDates(val) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const date = new Date(val);
      date.setHours(0, 0, 0, 0);

      if (date < today) {
        return false;
      }

      return this.getTimePeriods(val).length > 0;
    },
    getTimePeriods(val) {
      if (val == null) {
        return [];
      }
      const weekday = new Date(val).getDay();
      const timePeriods = this.leadItem.bookable.timePeriods.filter(
        (timePeriod) => timePeriod.weekdays.includes(weekday)
      ).map((timePeriod) => {
        return {
          text: timePeriod.startTime + " - " + timePeriod.endTime,
          value: timePeriod,
          timeBegin: new Date(val).setHours(
            timePeriod.startTime.split(":")[0],
            timePeriod.startTime.split(":")[1]
          ),
          timeEnd: new Date(val).setHours(
            timePeriod.endTime.split(":")[0],
            timePeriod.endTime.split(":")[1]
          ),
        };
      })

      this.occupations.forEach((occupation) => {
        timePeriods.forEach((timePeriod, index) => {
          if (timePeriod.timeBegin >= occupation.timeBegin && timePeriod.timeEnd <= occupation.timeEnd) {
            timePeriods.splice(index, 1);
          }
        });
      });


      return timePeriods
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
      const dateObj = new Date(this.displayedMonth);
      const firstDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const lastDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);

      const timeBegin = firstDayOfMonth.toISOString();
      const timeEnd = lastDayOfMonth.toISOString();

      try {
        const response = await ApiBookablesService.getBookableAvailability(
          this.leadItem.bookable.id,
          this.leadItem.bookable.tenant,
          timeBegin,
          timeEnd,
          this.leadItem.amount
        )
        if (response.data) {
          this.occupations = response.data;
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    updateDisplayedMonth(val) {
      this.displayedMonth = val;
    },
  },
  watch: {
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
      full-width
      @update:picker-date="updateDisplayedMonth"
    >
    </v-date-picker>
    <v-row v-if="date" class="mt-10">
      <v-col>
        <span class="subtitle-1"
        >Welchen Zeitraum wollen Sie am <strong>{{ transformDate(this.date) }}</strong>
          buchen?</span
        >
      </v-col>
    </v-row>
    <v-row class="primary">
      <v-col
        class="col-12 col-md-4"
        v-for="timePeriod in getTimePeriods(date)"
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
  </div>
</template>

<style scoped></style>
