<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "BookableEditBookingType",
  components: { BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      valid: false,
      weekdays: [
        { id: 1, name: "Montag", short: "Mo" },
        { id: 2, name: "Dienstag", short: "Di" },
        { id: 3, name: "Mittwoch", short: "Mi" },
        { id: 4, name: "Donnerstag", short: "Do" },
        { id: 5, name: "Freitag", short: "Fr" },
        { id: 6, name: "Samstag", short: "Sa" },
        { id: 0, name: "Sonntag", short: "So" },
      ],
      timeEndMenu: [],
      timeStartMenu: [],
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    isLongRangeWeek() {
      return (
        this.model.isLongRange &&
        this.model.longRangeOptions &&
        this.model.longRangeOptions.type === "week"
      );
    },
    isLongRangeMonth() {
      return (
        this.model.isLongRange &&
        this.model.longRangeOptions &&
        this.model.longRangeOptions.type === "month"
      );
    },
    bookingType: {
      get() {
        if (this.model.isScheduleRelated) return "schedule";
        if (this.model.isTimePeriodRelated) return "timePeriod";
        if (this.isLongRangeWeek) return "week";
        if (this.isLongRangeMonth) return "month";
        return "independent";
      },
      set(value) {
        this.model.isScheduleRelated = false;
        this.model.isTimePeriodRelated = false;
        this.model.longRangeOptions = {};
        this.model.isLongRange = false;

        switch (value) {
          case "schedule":
            this.model.isScheduleRelated = true;
            break;
          case "timePeriod":
            this.model.isTimePeriodRelated = true;
            break;
          case "week":
            this.model.longRangeOptions = { type: "week" };
            this.model.isLongRange = true;
            break;
          case "month":
            this.model.longRangeOptions = { type: "month" };
            this.model.isLongRange = true;
            break;
        }
      },
    },
  },
  methods: {
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    addNewTimePeriod() {
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.model.timePeriods.push({
        weekdays: [],
        startTime: null,
        endTime: null,
      });
    },
    getWeekdayName(id) {
      const day = this.weekdays.find((d) => d.id === id);
      return day ? day.name.substring(0, 2) : "";
    },
    removeWeekdays(index, item) {
      this.model.timePeriods[index].weekdays.splice(
        this.model.timePeriods[index].weekdays.indexOf(item),
        1
      );
    },
    setEndTime(index, time) {
      this.model.timePeriods[index].endTime = time;
      this.timeEndMenu[index] = false;
    },
    setStartTime(index, time) {
      this.model.timePeriods[index].startTime = time;
      this.timeStartMenu[index] = false;
    },
    removeTimePeriod(index) {
      this.model.timePeriods.splice(index, 1);
      this.timeStartMenu.splice(index, 1);
      this.timeEndMenu.splice(index, 1);
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Buchungstyp" icon="mdi-calendar-clock">
      <v-alert color="info" dense text class="mb-4">
        <v-icon class="mr-3" color="info"> mdi-information-outline </v-icon>
        Wählen Sie aus, wie Kunden dieses Objekt buchen können.
      </v-alert>

      <v-radio-group v-model="bookingType">
        <v-radio value="schedule" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-calendar-range</v-icon>
                Freie Zeitwahl
              </div>
              <div class="text-caption text--secondary mt-1">
                Kunden können Start- und Endzeitpunkt frei wählen
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="timePeriod" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-clock-outline</v-icon>
                Feste Zeitfenster
              </div>
              <div class="text-caption text--secondary mt-1">
                Vordefinierte, buchbare Zeitfenster (z.B. Montags 09:00 - 12:00)
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="week" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-calendar-week</v-icon>
                Wochenbuchung
              </div>
              <div class="text-caption text--secondary mt-1">
                Buchung für komplette Wochen
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="month" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-calendar-month</v-icon>
                Monatsbuchung
              </div>
              <div class="text-caption text--secondary mt-1">
                Buchung für komplette Kalendermonate
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="independent">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-clock-remove-outline</v-icon>
                Zeitunabhängig
              </div>
              <div class="text-caption text--secondary mt-1">
                Keine zeitlichen Einschränkungen
              </div>
            </div>
          </template>
        </v-radio>
      </v-radio-group>

      <v-card class="mt-4 section-card" v-if="bookingType === 'schedule'">
        <v-card-subtitle
          class="section-header d-flex justify-space-between align-center"
        >
          <h3 class="mb-2">
            <v-icon class="mr-2">mdi-timer-outline</v-icon>Buchungsdauer
          </h3>
        </v-card-subtitle>
        <v-divider />

        <v-card-text class="pa-3">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                background-color="accent"
                filled
                label="Minimale Buchungsdauer"
                v-model.number="model.minBookingDuration"
                suffix="Stunden"
                type="number"
                min="0"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                background-color="accent"
                filled
                label="Maximale Buchungsdauer"
                v-model.number="model.maxBookingDuration"
                suffix="Stunden"
                type="number"
                min="0"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="mt-4 section-card" v-if="bookingType === 'timePeriod'">
        <v-card-subtitle
          class="section-header d-flex justify-space-between align-center"
        >
          <h3 class="mb-2">
            <v-icon class="mr-2">mdi-clock-outline</v-icon>Feste Zeitfenster
          </h3>
          <v-btn small color="primary" @click="addNewTimePeriod">
            <v-icon left small>mdi-plus</v-icon>
            Hinzufügen
          </v-btn>
        </v-card-subtitle>
        <v-divider />

        <v-card-text class="pa-4" v-if="model.timePeriods.length > 0">
          <v-list two-line class="py-0">
            <v-list-item
              v-for="(timePeriod, idx) in model.timePeriods"
              :key="`period-${idx}`"
              class="time-period-item elevation-1 mb-3 rounded pa-4"
            >
              <v-list-item-avatar>
                <v-avatar color="primary" size="40">
                  <v-icon dark small>mdi-clock-outline</v-icon>
                </v-avatar>
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title class="mb-2">
                  <v-chip
                    v-for="dayId in timePeriod.weekdays"
                    :key="dayId"
                    small
                    color="primary"
                    class="mr-1"
                  >
                    {{ getWeekdayName(dayId) }}
                  </v-chip>
                  <v-chip
                    v-if="timePeriod.weekdays.length === 0"
                    small
                    color="grey"
                  >
                    Keine Tage gewählt
                  </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle class="d-flex align-center">
                  <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                  <span v-if="timePeriod.startTime && timePeriod.endTime">
                    {{ timePeriod.startTime }} - {{ timePeriod.endTime }} Uhr
                  </span>
                  <span v-else class="grey--text">Zeit nicht gesetzt</span>
                </v-list-item-subtitle>

                <div class="mt-3">
                  <v-row dense>
                    <v-col cols="12" sm="6">
                      <v-select
                        background-color="accent"
                        filled
                        dense
                        label="Wochentag(e)"
                        :items="weekdays"
                        item-value="id"
                        item-text="name"
                        v-model="timePeriod.weekdays"
                        multiple
                        chips
                        hide-selected
                        hide-details
                      >
                        <template
                          v-slot:selection="{ attrs, item, select, selected }"
                        >
                          <v-chip
                            v-bind="attrs"
                            :input-value="selected"
                            close
                            small
                            color="secondary"
                            @click="select"
                            @click:close="removeWeekdays(idx, item.id)"
                          >
                            <strong>{{ item.name }}</strong>
                          </v-chip>
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="6" sm="3">
                      <v-menu
                        v-model="timeStartMenu[idx]"
                        :close-on-content-click="false"
                        :nudge-right="40"
                        transition="scale-transition"
                        offset-y
                        max-width="290px"
                        min-width="290px"
                      >
                        <template v-slot:activator="{ on, attrs }">
                          <v-text-field
                            background-color="accent"
                            filled
                            dense
                            v-model="timePeriod.startTime"
                            label="Von"
                            readonly
                            suffix="Uhr"
                            v-bind="attrs"
                            v-on="on"
                            hide-details
                          ></v-text-field>
                        </template>
                        <v-time-picker
                          v-if="timeStartMenu[idx]"
                          v-model="timePeriod.startTime"
                          full-width
                          @click:minute="
                            setStartTime(idx, timePeriod.startTime)
                          "
                          format="24hr"
                        ></v-time-picker>
                      </v-menu>
                    </v-col>

                    <v-col cols="6" sm="3">
                      <v-menu
                        v-model="timeEndMenu[idx]"
                        :close-on-content-click="false"
                        :nudge-right="40"
                        transition="scale-transition"
                        offset-y
                        max-width="290px"
                        min-width="290px"
                      >
                        <template v-slot:activator="{ on, attrs }">
                          <v-text-field
                            background-color="accent"
                            filled
                            dense
                            v-model="timePeriod.endTime"
                            label="Bis"
                            readonly
                            suffix="Uhr"
                            v-bind="attrs"
                            v-on="on"
                            hide-details
                          ></v-text-field>
                        </template>
                        <v-time-picker
                          v-if="timeEndMenu[idx]"
                          v-model="timePeriod.endTime"
                          full-width
                          @click:minute="setEndTime(idx, timePeriod.endTime)"
                          format="24hr"
                        ></v-time-picker>
                      </v-menu>
                    </v-col>
                  </v-row>
                </div>
              </v-list-item-content>

              <v-list-item-action>
                <v-btn icon small @click="removeTimePeriod(idx)" color="error">
                  <v-icon small>mdi-delete-outline</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-text v-else class="text-center py-8">
          <v-icon large color="grey lighten-1" class="mb-2">
            mdi-clock-outline
          </v-icon>
          <div class="text-h6 grey--text mb-2">
            Noch keine Zeitfenster definiert
          </div>
          <v-btn
            small
            text
            color="primary"
            @click="addNewTimePeriod"
            class="mt-2"
          >
            <v-icon left small>mdi-plus</v-icon>
            Zeitfenster hinzufügen
          </v-btn>
        </v-card-text>
      </v-card>
    </BaseSection>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}
.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}
</style>
