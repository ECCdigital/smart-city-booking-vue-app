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
        { id: 1, name: "Montag" },
        { id: 2, name: "Dienstag" },
        { id: 3, name: "Mittwoch" },
        { id: 4, name: "Donnerstag" },
        { id: 5, name: "Freitag" },
        { id: 6, name: "Samstag" },
        { id: 0, name: "Sonntag" },
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
    <BaseSection title="Buchungsart" icon="mdi-calendar-clock">
      <v-alert type="info" dense outlined class="mb-4">
        Wählen Sie aus, wie Kunden dieses Objekt buchen können.
      </v-alert>

      <v-radio-group v-model="bookingType">
        <v-radio value="schedule" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-calendar-range</v-icon>
                Freie Zeitwahl über Kalender
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
                Ganze Kalenderwochen
              </div>
              <div class="text-caption text--secondary mt-1">
                Buchung für komplette Wochen (Montag bis Freitag)
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="month" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-calendar-month</v-icon>
                Ganze Monate
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

      <div class="mt-4" v-if="bookingType === 'schedule'">
        <h3 class="mb-2">
          <v-icon class="mr-2">mdi-timer-outline</v-icon>Buchungsdauer
        </h3>

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
      </div>

      <div class="mt-4" v-if="bookingType === 'timePeriod'">
        <div class="d-flex justify-space-between align-center">
          <h3 class="mb-2">
            <v-icon class="mr-2">mdi-clock-outline</v-icon>Feste Zeitfenster
          </h3>
          <v-btn small color="primary" @click="addNewTimePeriod">
            <v-icon left small>mdi-plus</v-icon>
            Hinzufügen
          </v-btn>
        </div>

        <div class="pa-0" v-if="model.timePeriods.length > 0">
          <v-list dense>
            <template v-for="(timePeriod, idx) in model.timePeriods">
              <v-list-item :key="`period-${idx}`" class="px-4 py-3">
                <v-list-item-content>
                  <v-row align="center">
                    <v-col cols="12" md="6">
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
                    <v-col cols="12" md="3">
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
                    <v-col cols="12" md="2">
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
                    <v-col cols="12" md="1" class="text-right">
                      <v-btn icon small @click="removeTimePeriod(idx)">
                        <v-icon small>mdi-delete-outline</v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-list-item-content>
              </v-list-item>
              <v-divider
                v-if="idx < model.timePeriods.length - 1"
                :key="`divider-${idx}`"
              />
            </template>
          </v-list>
        </div>
        <v-card-text v-else class="pa-4 text-center grey--text">
          <v-icon large color="grey lighten-1" class="mb-2">
            mdi-clock-outline
          </v-icon>
          <div>Noch keine Zeitfenster definiert</div>
          <v-btn
            small
            text
            color="primary"
            @click="addNewTimePeriod"
            class="mt-2"
          >
            Erstes Zeitfenster hinzufügen
          </v-btn>
        </v-card-text>
      </div>
    </BaseSection>
  </v-form>
</template>

<style scoped></style>
