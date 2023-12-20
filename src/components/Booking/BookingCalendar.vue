<template>
  <div>
    <v-sheet height="400" class="my-15">
      <v-toolbar flat>
        <v-btn outlined class="mt-1" color="primary" @click="setToday">
          Heute
        </v-btn>
        <v-btn class="mt-1" fab text small color="primary" @click="prev">
          <v-icon small> mdi-arrow-left-circle-outline </v-icon>
        </v-btn>
        <v-btn class="mt-1" fab text small color="primary" @click="next">
          <v-icon small> mdi-arrow-right-circle-outline </v-icon>
        </v-btn>
        <v-spacer />
        <v-toolbar-title v-if="$refs.bookingCalendar" class="mt-1">
          {{ $refs.bookingCalendar.title }}
        </v-toolbar-title>
        <v-spacer />
      </v-toolbar>
      <v-calendar
        ref="bookingCalendar"
        :value="dateBegin"
        :events="calendarItems"
        color="primary"
        locale="de"
        interval-minutes="60"
        type="week"
        weekdays="1,2,3,4,5,6,0"
        show-week
        v-model="focus"
        @click:more="viewDay"
        @click:date="viewDay"
        @change="fetchRelatedBookings"
      ></v-calendar>
    </v-sheet>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import CheckoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { eachDayOfInterval } from "date-fns";
import _ from "lodash";

export default {
  props: {
    bookableId: {
      type: String,
      required: true,
    },
    tenant: {
      type: String,
      required: true,
    },
    timeBegin: {
      type: Number,
    },
    timeEnd: {
      type: Number,
    },
    dateBegin: {
      type: String,
    },
  },
  data: () => ({
    focus: "",
    type: "week",
    typeToLabel: {
      day: "Day",
      week: "Week",
      month: "Month",
      "4day": "4 Days",
    },
    bookable: null,
    bookings: [],
    openingHours: { specialOpeningHours: [], regularOpeningHours: {} },
  }),

  computed: {
    calendarItems() {
      let items = this.bookings.flatMap((b) => {
        const itemWithOpeningHours = this.getBookingItemsForCalendar(
          b.timeBegin,
          b.timeEnd,
          this.openingHours
        );
        const bookedItems = [];
        for (const item of itemWithOpeningHours) {
          if (item.start === item.end) {
            continue;
          }
          bookedItems.push({
            name: "Gebucht",
            start: item.start,
            end: item.end,
            color: "grey",
            timed: true,
          });
        }
        return bookedItems;
      });

      const bookingItems = this.getBookingItemsForCalendar(
        this.timeBegin,
        this.timeEnd,
        this.openingHours
      );

      for (const bookingItem of bookingItems) {
        items.push({
          name: "Ihr Wunschtermin",
          start: bookingItem.start,
          end: bookingItem.end,
          color: "red",
          timed: true,
        });
      }

      return items || [];
    },
  },

  watch: {
    dateBegin: function () {
      if (this.dateBegin != null) {
        this.viewDay({ date: this.dateBegin });
      }
    },

    timeBegin: function () {
      if (this.timeBegin != null) {
        this.$refs.bookingCalendar.scrollToTime(this.timeBegin);
      }
    },
  },

  methods: {
    viewDay({ date }) {
      this.focus = date;
      this.type = "day";
    },

    setToday() {
      this.focus = "";
    },

    prev() {
      this.$refs.bookingCalendar.prev();
    },

    next() {
      this.$refs.bookingCalendar.next();
    },

    fetchRelatedBookings() {
      ApiBookingService.getRelatedBookings(
        this.bookableId,
        this.tenant,
        true,
        true,
        true
      ).then((response) => {
        this.bookings = response.data;
      });
    },

    fetchOpeningHours() {
      ApiBookablesService.getReleatedOpeningHours(
        this.bookableId,
        this.tenant
      ).then((response) => {
        this.openingHours = response.data;
      });
    },

    hasOpeningHours(relatedBookables) {
      return relatedBookables.some(
        (b) => b.isOpeningHoursRelated || b.isSpecialOpeningHoursRelated
      );
    },

    getDaysfromBookingDuration(timeBegin, timeEnd) {
      if (!timeBegin || !timeEnd) {
        return [];
      }
      return eachDayOfInterval({
        start: new Date(timeBegin),
        end: new Date(timeEnd),
      });
    },

    getBookingItemsForCalendar(timeBegin, timeEnd, openingHours) {
      const bookingItems = [];
      const combinedOpeningHours = openingHours.regularOpeningHours || {};

      function getTimeFromString(timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        return new Date(0, 0, 0, hours, minutes);
      }

      const days = this.getDaysfromBookingDuration(timeBegin, timeEnd);

      if (days.length > 1) {
        for (const day of days) {
          const dayStringFormatted = day.toLocaleDateString("en-CA"); // Assuming 'en-CA' format gives "YYYY-MM-DD"

          const dateTimeBegin = new Date(day);
          const dateTimeEnd = new Date(day);

          dateTimeEnd.setHours(23, 59, 59, 999);

          const specialOpeningHours = openingHours.specialOpeningHours?.find(
            (specialOpeningHours) =>
              specialOpeningHours.date === dayStringFormatted
          );

          if (
            specialOpeningHours &&
            specialOpeningHours.startTime !== specialOpeningHours.endTime
          ) {
            dateTimeBegin.setHours(
              getTimeFromString(specialOpeningHours.startTime).getHours()
            );
            dateTimeBegin.setMinutes(
              getTimeFromString(specialOpeningHours.startTime).getMinutes()
            );
            dateTimeEnd.setHours(
              getTimeFromString(specialOpeningHours.endTime).getHours()
            );
            dateTimeEnd.setMinutes(
              getTimeFromString(specialOpeningHours.endTime).getMinutes()
            );
          } else if (!_.isEmpty(combinedOpeningHours)) {
            const weekday = day.getDay();
            const { startTime, endTime } = combinedOpeningHours[weekday] || {};

            if (!startTime || !endTime) {
              continue;
            }

            dateTimeBegin.setHours(getTimeFromString(startTime).getHours());
            dateTimeBegin.setMinutes(getTimeFromString(startTime).getMinutes());
            dateTimeEnd.setHours(getTimeFromString(endTime).getHours());
            dateTimeEnd.setMinutes(getTimeFromString(endTime).getMinutes());
          }

          bookingItems.push({
            start: CheckoutUtils.formatDateTime(dateTimeBegin),
            end: CheckoutUtils.formatDateTime(dateTimeEnd),
          });
        }
      } else {
        bookingItems.push({
          start: CheckoutUtils.formatDateTime(timeBegin),
          end: CheckoutUtils.formatDateTime(timeEnd),
        });
      }

      return bookingItems;
    },
  },

  mounted() {
    this.fetchRelatedBookings();
    this.fetchOpeningHours();
  },
};
</script>
