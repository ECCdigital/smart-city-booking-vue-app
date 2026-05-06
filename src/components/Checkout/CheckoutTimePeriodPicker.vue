<template>
  <div class="checkout-time-period-picker">
    <v-card elevation="1" class="calendar-card mb-6">
      <v-card-title class="calendar-header py-3" :style="headerStyle">
        <v-row align="center" class="ma-0">
          <v-col>
            <h3
              class="text-subtitle-1 font-weight-medium"
              :style="{ color: textColor }"
            >
              <v-icon left :color="textColor" small>mdi-calendar-month</v-icon>
              {{ monthYearDisplay }}
            </h3>
          </v-col>
          <v-col class="col-auto">
            <v-btn
              small
              outlined
              :color="textColor"
              @click="jumpToNextAvailable"
              :loading="loading"
              class="mr-2"
            >
              <v-icon left>mdi-skip-next</v-icon>
              Nächster freier Termin
            </v-btn>
          </v-col>
        </v-row>
      </v-card-title>

      <v-progress-linear
        v-if="loading"
        indeterminate
        :color="primaryColor"
        height="3"
      />

      <v-card-text class="pa-4">
        <v-date-picker
          v-model="date"
          no-title
          locale="de"
          :allowed-dates="allowedDates"
          :color="primaryColor"
          full-width
          first-day-of-week="1"
          class="elevation-0 custom-date-picker"
          @update:picker-date="updateDisplayedMonth"
        />
      </v-card-text>

      <v-card-actions class="calendar-legend px-4 py-3">
        <v-chip
          x-small
          class="mr-2"
          :color="primaryColor"
          :text-color="textColor"
        >
          <v-icon left x-small :color="textColor">mdi-check-circle</v-icon>
          Verfügbar
        </v-chip>
        <v-chip x-small color="grey lighten-1" text-color="white">
          <v-icon left x-small>mdi-close-circle</v-icon>
          Belegt
        </v-chip>
      </v-card-actions>
    </v-card>

    <div ref="time-periods" />

    <v-expand-transition>
      <div v-if="date">
        <v-card elevation="1" class="selected-date-card mb-4">
          <v-card-text class="py-3">
            <v-row align="center" class="ma-0">
              <v-col class="py-0">
                <div class="text-caption grey--text text--darken-1">
                  Ausgewähltes Datum
                </div>
                <div class="text-h6 font-weight-medium">
                  {{ formatSelectedDate(date) }}
                </div>
              </v-col>
              <v-col class="col-auto py-0">
                <v-chip
                  small
                  :color="
                    selectedDatePeriods.length > 0 ? 'success' : 'warning'
                  "
                  text-color="white"
                >
                  <v-icon left small>
                    {{
                      selectedDatePeriods.length > 0
                        ? "mdi-clock-check"
                        : "mdi-clock-alert"
                    }}
                  </v-icon>
                  {{ selectedDatePeriods.length }} Zeiträume
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <div v-if="!loading">
          <v-card
            v-if="selectedDatePeriods.length > 0"
            elevation="1"
            class="time-periods-card"
          >
            <v-card-title class="pb-2">
              <v-icon left :color="primaryColor">mdi-clock-outline</v-icon>
              Verfügbare Zeiträume
            </v-card-title>

            <v-card-text class="pa-3">
              <v-row>
                <v-col
                  v-for="timePeriod in selectedDatePeriods"
                  :key="timePeriod.value.id"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <v-card
                    :outlined="!isSelected(timePeriod)"
                    :elevation="isSelected(timePeriod) ? 4 : 0"
                    :color="isSelected(timePeriod) ? primaryColor : 'white'"
                    class="time-period-card"
                    :class="{ 'selected-card': isSelected(timePeriod) }"
                    @click="selectTimePeriod(timePeriod)"
                    hover
                  >
                    <v-card-text class="pa-4">
                      <div class="d-flex align-center justify-space-between">
                        <div>
                          <div
                            class="text-overline mb-1"
                            :style="{
                              color: isSelected(timePeriod)
                                ? textColor
                                : 'rgba(0,0,0,0.6)',
                            }"
                          >
                            Zeitraum
                          </div>
                          <div
                            class="text-h6 font-weight-bold"
                            :style="{
                              color: isSelected(timePeriod)
                                ? textColor
                                : primaryColor,
                            }"
                          >
                            {{ timePeriod.text }}
                          </div>
                          <div
                            class="text-caption mt-1"
                            :style="{
                              color: isSelected(timePeriod)
                                ? textColor
                                : 'rgba(0,0,0,0.6)',
                            }"
                          >
                            {{ calculateDuration(timePeriod) }}
                          </div>
                        </div>
                        <div>
                          <v-icon
                            large
                            :color="
                              isSelected(timePeriod) ? textColor : primaryColor
                            "
                          >
                            {{
                              isSelected(timePeriod)
                                ? "mdi-check-circle"
                                : "mdi-circle-outline"
                            }}
                          </v-icon>
                        </div>
                      </div>
                    </v-card-text>

                    <v-fade-transition>
                      <v-overlay
                        v-if="isSelected(timePeriod)"
                        absolute
                        :opacity="0.1"
                        :color="textColor"
                      />
                    </v-fade-transition>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card v-else elevation="1" class="no-availability-card">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="warning" class="mb-4">
                mdi-calendar-remove
              </v-icon>
              <div class="text-h6 mb-2">Keine Zeiträume verfügbar</div>
              <div class="text-body-2 grey--text text--darken-1 mb-4">
                Für den {{ formatSelectedDate(date) }} sind leider keine
                Zeiträume verfügbar.
              </div>
              <v-btn
                :color="primaryColor"
                outlined
                @click="jumpToNextAvailable"
                :loading="loading"
              >
                <v-icon left>mdi-lightning-bolt</v-icon>
                Nächsten freien Termin finden
              </v-btn>
            </v-card-text>
          </v-card>
        </div>

        <v-card v-else elevation="1" class="loading-card">
          <v-card-text class="text-center py-8">
            <v-progress-circular
              indeterminate
              :color="primaryColor"
              size="48"
              width="3"
            />
            <div class="text-body-1 mt-4 grey--text">
              Lade verfügbare Zeiträume...
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-expand-transition>

    <v-card
      v-if="!date && !loading && !noAvailabilityFound"
      elevation="1"
      class="initial-state-card"
    >
      <v-card-text class="text-center py-8">
        <v-icon size="80" color="info" class="mb-4">
          mdi-calendar-clock
        </v-icon>
        <div class="text-h6 mb-2">Wählen Sie ein Datum</div>
        <div class="text-body-2 grey--text text--darken-1">
          Klicken Sie auf einen verfügbaren Tag im Kalender oben
        </div>
      </v-card-text>
    </v-card>
    <v-expand-transition>
      <v-card
        v-if="noAvailabilityFound"
        elevation="1"
        class="no-availability-global-card mt-4"
      >
        <v-card-text class="text-center py-8">
          <v-icon size="80" color="error" class="mb-4">
            mdi-calendar-remove-outline
          </v-icon>
          <div class="text-h6 mb-2">Keine Verfügbarkeit gefunden</div>
          <div class="text-body-2 grey--text text--darken-1 mb-4">
            In den nächsten 12 Monaten sind leider keine freien Termine
            verfügbar.
          </div>
          <v-btn :color="primaryColor" outlined @click="retrySearch">
            <v-icon left>mdi-refresh</v-icon>
            Erneut versuchen
          </v-btn>
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </div>
</template>

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
  data() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    return {
      date: null,
      timePeriod: null,
      occupations: [],
      displayedMonth: todayStr,
      loading: false,
      availabilityLoaded: false,
      availableDateMap: {},
      noAvailabilityFound: false,
    };
  },

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

    monthYearDisplay() {
      const [year, month] = this.displayedMonth.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
      });
    },

    selectedDatePeriods() {
      if (!this.date) return [];
      return this.availableDateMap[this.date] || [];
    },

    availableDates() {
      return Object.keys(this.availableDateMap).sort();
    },

    hasNextAvailable() {
      const todayStr = this.toDateString(new Date());
      return this.availableDates.some((d) => d >= todayStr);
    },
  },

  methods: {
    retrySearch() {
      const today = new Date();
      this.noAvailabilityFound = false;
      this.displayedMonth = this.toMonthString(today);
      this.jumpToNextAvailable();
    },
    getContrastColor(hexColor) {
      const hex = hexColor.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = this.calculateLuminance(r, g, b);
      return luminance > 0.5 ? "black" : "white";
    },

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

    formatSelectedDate(dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    },

    calculateDuration(timePeriod) {
      const durationMs = timePeriod.timeEnd - timePeriod.timeBegin;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}min`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}min`;
      }
    },

    toDateString(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },

    toMonthString(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    },

    buildAvailableDateMap() {
      const map = {};
      const [year, month] = this.displayedMonth.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date < today) continue;

        const dateStr = this.toDateString(date);
        const periods = this.getAvailablePeriods(date, dateStr);

        if (periods.length > 0) {
          map[dateStr] = periods;
        }
      }

      this.availableDateMap = map;
    },

    getAvailablePeriods(dateObj, dateStr) {
      return this.getAvailablePeriodsWithOccupations(dateObj, this.occupations);
    },

    allowedDates(val) {
      return val in this.availableDateMap;
    },
    async fetchAvailabilityForMonth(monthStr) {
      const [year, month] = monthStr.split("-").map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      try {
        const response = await ApiBookablesService.getBookableAvailability(
          this.leadItem.bookable.id,
          this.leadItem.bookable.tenantId,
          firstDay.toISOString(),
          lastDay.toISOString(),
          this.leadItem.amount
        );

        console.log(response.data?.availability);

        const occupations = (response.data?.availability || []).map((occ) => ({
          ...occ,
          timeBegin: new Date(occ.timeBegin).getTime(),
          timeEnd: new Date(occ.timeEnd).getTime(),
        }));

        return this.buildDateMapForMonth(monthStr, occupations);
      } catch (error) {
        console.error(error);
        return {};
      }
    },

    buildDateMapForMonth(monthStr, occupations) {
      const map = {};
      const [year, month] = monthStr.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date < today) continue;

        const dateStr = this.toDateString(date);
        const periods = this.getAvailablePeriodsWithOccupations(
          date,
          occupations
        );

        if (periods.length > 0) {
          map[dateStr] = periods;
        }
      }

      return map;
    },

    getAvailablePeriodsWithOccupations(dateObj, occupations) {
      const weekday = dateObj.getDay();
      const timePeriods = this.leadItem.bookable.timePeriods || [];

      const periods = timePeriods
        .filter((tp) => tp.weekdays.includes(weekday))
        .map((tp) => {
          const [sh, sm] = tp.startTime.split(":").map(Number);
          const [eh, em] = tp.endTime.split(":").map(Number);
          const y = dateObj.getFullYear();
          const m = dateObj.getMonth();
          const d = dateObj.getDate();

          return {
            text: `${tp.startTime} - ${tp.endTime}`,
            value: tp,
            timeBegin: new Date(y, m, d, sh, sm).getTime(),
            timeEnd: new Date(y, m, d, eh, em).getTime(),
          };
        });

      return periods.filter((period) =>
        occupations.every(
          (occ) =>
            occ.available === true ||
            !(
              period.timeBegin >= occ.timeBegin && period.timeEnd <= occ.timeEnd
            )
        )
      );
    },

    async jumpToNextAvailable() {
      this.loading = true;
      this.noAvailabilityFound = false;

      try {
        const todayStr = this.toDateString(new Date());

        const nextInCurrentMonth = this.availableDates.find(
          (d) => d >= todayStr
        );

        if (nextInCurrentMonth) {
          this.date = nextInCurrentMonth;
          return;
        }

        const current = new Date(this.displayedMonth + "-01");

        for (let i = 1; i <= 12; i++) {
          const next = new Date(
            current.getFullYear(),
            current.getMonth() + i,
            1
          );
          const monthStr = this.toMonthString(next);

          const dateMap = await this.fetchAvailabilityForMonth(monthStr);
          const availableDates = Object.keys(dateMap).sort();
          const firstAvailable = availableDates.find((d) => d >= todayStr);

          if (firstAvailable) {
            this.occupations = [];
            this.availableDateMap = dateMap;
            this.displayedMonth = monthStr;

            await this.$nextTick();
            this.date = firstAvailable;
            return;
          }
        }

        this.noAvailabilityFound = true;
        this.$emit("no-availability");
      } finally {
        this.loading = false;
      }
    },

    async validateAvailability() {
      this.loading = true;
      this.availabilityLoaded = false;

      const [year, month] = this.displayedMonth.split("-").map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      console.log(firstDay.toISOString(), lastDay.toISOString());

      try {
        const response = await ApiBookablesService.getBookableAvailability(
          this.leadItem.bookable.id,
          this.leadItem.bookable.tenantId,
          firstDay.toISOString(),
          lastDay.toISOString(),
          this.leadItem.amount
        );

        if (response.data?.availability) {
          console.log(response.data);
          this.occupations = response.data.availability.map((occ) => ({
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
        this.buildAvailableDateMap();
      }
    },

    selectTimePeriod(timePeriod) {
      this.timePeriod = timePeriod;
      this.$emit("selectTimePeriod", timePeriod);
    },

    isSelected(timePeriod) {
      return (
        this.timePeriod &&
        timePeriod.timeBegin === this.timePeriod.timeBegin &&
        timePeriod.timeEnd === this.timePeriod.timeEnd
      );
    },

    updateDisplayedMonth(val) {
      this.date = null;
      this.noAvailabilityFound = false;
      this.displayedMonth = val;
    },

    scrollToElement(id) {
      const el = this.$refs[id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
  },

  watch: {
    date(newVal, oldVal) {
      this.timePeriod = null;
      if (newVal && oldVal) {
        this.$nextTick(() => this.scrollToElement("time-periods"));
      }
    },
    timePeriod(val) {
      this.$emit("input", val);
    },
    displayedMonth() {
      this.validateAvailability();
    },
  },

  created() {
    this.validateAvailability();
  },
};
</script>

<style scoped>
.checkout-time-period-picker {
  max-width: 1200px;
  margin: 0 auto;
}

.calendar-card,
.selected-date-card,
.time-periods-card,
.no-availability-card,
.loading-card,
.initial-state-card {
  border-radius: 12px !important;
  overflow: hidden;
}

.calendar-header {
  padding: 16px 20px !important;
}

.custom-date-picker {
  border-radius: 8px;
}

.custom-date-picker >>> .v-date-picker-table button {
  border-radius: 8px;
}

.custom-date-picker >>> .v-btn--active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.calendar-legend {
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.time-period-card {
  border-radius: 12px !important;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-width: 2px !important;
}

.time-period-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

.selected-card {
  transform: translateY(-2px);
}

.pulse-animation {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 600px) {
  .calendar-header {
    padding: 12px 16px !important;
  }

  .time-period-card {
    margin-bottom: 12px;
  }
}

.no-availability-global-card {
  border-radius: 12px !important;
  border: 2px solid #ff5252 !important;
  overflow: hidden;
}
</style>
