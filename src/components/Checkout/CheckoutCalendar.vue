<template>
  <div class="checkout-calendar-wrapper">
    <v-card elevation="1" class="calendar-card">
      <v-card-title class="calendar-header py-3" :style="headerStyle">
        <v-row align="center" class="ma-0">
          <v-col>
            <h3
              class="text-subtitle-1 font-weight-medium"
              :style="{ color: textColor }"
            >
              <v-icon left :color="textColor" small>mdi-calendar-month</v-icon>
              {{ monthYear }}
            </h3>
          </v-col>
          <v-col class="col-auto">
            <v-btn-toggle
              dense
              :color="textColor"
              class="elevation-0 transparent"
            >
              <v-btn
                small
                outlined
                :color="textColor"
                @click="today()"
                class="today-btn"
              >
                <v-icon x-small left :color="textColor">mdi-calendar-today</v-icon>
                Heute
              </v-btn>
              <v-btn
                small
                outlined
                :color="textColor"
                @click="prev()"
                :disabled="loading || !allowPrevPage"
              >
                <v-icon small :color="textColor">mdi-chevron-left</v-icon>
              </v-btn>
              <v-btn
                small
                outlined
                :color="textColor"
                @click="next()"
                :disabled="loading"
              >
                <v-icon small :color="textColor">mdi-chevron-right</v-icon>
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-title>

      <v-progress-linear
        indeterminate
        v-if="loading"
        color="primary"
        height="2"
      ></v-progress-linear>

      <v-card-text class="pa-0">
        <v-sheet height="550">
          <v-calendar
            ref="checkoutCalendar"
            type="4day"
            color="primary"
            locale="de"
            weekdays="1,2,3,4,5,6,0"
            :events="events"
            :event-ripple="false"
            :interval-count="23"
            :interval-height="40"
            :start="startDate"
            v-model="focus"
            event-overlap-mode="column"
            class="custom-calendar"
          >
            <template v-slot:event="{ event }">
              <div
                class="custom-event"
                :class="event.color ? `${event.color}-event` : ''"
                :style="event.color === 'primary' ? primaryEventStyle : null"
              >
                <div class="event-title">{{ event.name }}</div>
                <div class="event-time">
                  {{ formatEventTime(event.start) }} -
                  {{ formatEventTime(event.end) }}
                </div>
              </div>
            </template>
          </v-calendar>
        </v-sheet>
      </v-card-text>

      <v-card-actions class="calendar-legend px-3 py-2">
        <v-chip x-small class="mr-2" color="primary" :text-color="textColor">
          <v-icon left x-small :color="textColor">mdi-bookmark</v-icon>
          Ihre Buchung
        </v-chip>
        <v-chip x-small color="grey" text-color="white">
          <v-icon left x-small>mdi-close-circle</v-icon>
          Nicht verfügbar
        </v-chip>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";

export default {
  props: {
    bookableId: { type: String, required: true },
    tenant: { type: String, required: true },
    bookingTimeBegin: { type: Number },
    bookingTimeEnd: { type: Number },
    amount: { type: Number, default: 1 },
  },

  data: () => ({
    loading: false,
    availabilityItems: [],
    startDate: undefined,
    focus: new Date().toISOString().split("T")[0],
    fetchedUntil: undefined,
  }),

  computed: {
    primaryColor() {
      return this.$vuetify.theme.themes.light.primary || "#1976D2";
    },

    textColor() {
      return this.getContrastColor(this.primaryColor);
    },

    headerStyle() {
      return {
        backgroundColor: this.primaryColor,
      };
    },

    primaryEventStyle() {
      return {
        backgroundColor: this.primaryColor,
        color: this.textColor,
      };
    },

    monthYear() {
      return new Date(this.focus).toLocaleString("de-DE", {
        month: "long",
        year: "numeric",
      });
    },

    events() {
      const av = this.availabilityItems
        .filter((ai) => ai.available === false)
        .map((item) => ({
          name: "Nicht verfügbar",
          start: new Date(item.timeBegin),
          end: new Date(item.timeEnd),
          timed: true,
          color: "grey",
        }));

      if (this.bookingTimeBegin && this.bookingTimeEnd) {
        av.push({
          name: "Ihre Buchung",
          start: new Date(this.bookingTimeBegin),
          end: new Date(this.bookingTimeEnd),
          timed: true,
          color: "primary",
        });
      }

      return av;
    },

    allowPrevPage() {
      return new Date(this.focus) > new Date();
    },
  },

  watch: {
    bookingTimeBegin() {
      if (this.bookingTimeBegin) {
        this.focus = new Date(this.bookingTimeBegin)
          .toISOString()
          .split("T")[0];
        this.$nextTick(() => {
          this.$refs.checkoutCalendar?.scrollToTime(
            new Date(this.bookingTimeBegin).toISOString().split("T")[1]
          );
        });
      }
    },
    amount() {
      this.fetchedUntil = undefined;
      this.availabilityItems = [];
      this.fetchEvents();
    },
    async focus() {
      await this.fetchEvents();
    },
  },

  methods: {
    /**
     * Calculates whether black or white text has better contrast on the given background color.
     * Uses the relative luminance formula.
     * @param {string} hexColor - Hex color
     * @returns {string} - "white" or "black"
     */
    getContrastColor(hexColor) {
      const hex = hexColor.replace("#", "");

      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const luminance = this.calculateLuminance(r, g, b);

      return luminance > 0.5 ? "black" : "white";
    },

    /**
     * Calculates the relative luminance of a color
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {number} - Relative luminance (0.0 - 1.0)
     */
    calculateLuminance(r, g, b) {
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;

      const rLinear =
        rsRGB <= 0.03928
          ? rsRGB / 12.92
          : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
      const gLinear =
        gsRGB <= 0.03928
          ? gsRGB / 12.92
          : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
      const bLinear =
        bsRGB <= 0.03928
          ? bsRGB / 12.92
          : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    },

    formatEventTime(date) {
      return new Date(date).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    fetchEvents() {
      let dateBegin = new Date(this.focus || new Date());
      const dateEnd = new Date(this.focus);
      dateEnd.setTime(dateEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

      if (this.loading || dateBegin >= dateEnd) return;

      this.loading = true;
      ApiBookablesService.getBookableAvailability(
        this.bookableId,
        this.tenant,
        dateBegin.toISOString().split("T")[0],
        dateEnd.toISOString().split("T")[0],
        this.amount
      )
        .then((response) => {
          this.availabilityItems = response.data;
          this.fetchedUntil = dateEnd.toISOString().split("T")[0];
        })
        .finally(() => {
          this.loading = false;
        });
    },

    next() {
      this.$refs.checkoutCalendar.next();
    },
    prev() {
      if (this.allowPrevPage) {
        this.$refs.checkoutCalendar.prev();
      }
    },
    today() {
      this.focus = new Date().toISOString().split("T")[0];
    },
  },

  async mounted() {
    await this.fetchEvents();
    this.$nextTick(() => {
      this.$refs.checkoutCalendar?.scrollToTime("09:00");
    });
  },
};
</script>

<style scoped>
.checkout-calendar-wrapper {
  margin: 16px 0;
}

.calendar-card {
  border-radius: 8px !important;
  overflow: hidden;
}

.calendar-header {
  padding: 12px 16px !important;
}

.today-btn {
  margin-right: 4px;
}

.custom-calendar {
  border: none !important;
}

.custom-calendar >>> .v-calendar-daily__scroll-area {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.custom-calendar >>> .v-calendar-daily__scroll-area::-webkit-scrollbar {
  width: 6px;
}

.custom-calendar >>> .v-calendar-daily__scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.custom-calendar >>> .v-calendar-daily__scroll-area::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.custom-calendar >>> .v-calendar-daily__interval-text {
  font-size: 10px;
}

.custom-calendar >>> .v-calendar-daily_head-day-label {
  font-size: 11px;
}

.custom-calendar >>> .v-event {
  border-radius: 4px;
  overflow: hidden;
  border-left: 3px solid currentColor !important;
  margin: 1px 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.custom-event {
  padding: 4px 6px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.event-title {
  font-weight: 600;
  font-size: 10px;
  margin-bottom: 2px;
  line-height: 1.2;
}

.event-time {
  font-size: 9px;
  opacity: 0.9;
  line-height: 1.2;
}

.grey-event {
  background: #e0e0e0;
  color: #424242;
}

.theme--dark .grey-event {
  background: #616161;
  color: #e0e0e0;
}

.calendar-legend {
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.theme--dark .calendar-legend {
  background-color: #424242;
  border-top: 1px solid #616161;
}

@media (max-width: 960px) {
  .calendar-header {
    padding: 10px 12px !important;
  }

  .custom-calendar >>> .v-calendar-daily__interval-text {
    font-size: 9px;
  }
}
</style>
