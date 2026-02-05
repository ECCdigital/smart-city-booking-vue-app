<template>
  <div>
    <v-row>
      <v-col>
        <!-- Buchungsart Auswahl -->
        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-calendar-clock</v-icon>
            <span class="text-h6 font-weight-bold">Buchungsart</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-alert type="info" dense outlined class="mb-4">
              Wählen Sie aus, wie Kunden dieses Objekt buchen können.
            </v-alert>

            <v-radio-group v-model="bookingType" @change="onBookingTypeChange">
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
                      Vordefinierte, buchbare Zeitfenster (z.B. Montags 09:00 -
                      12:00)
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
                      <v-icon small class="mr-2"
                        >mdi-clock-remove-outline</v-icon
                      >
                      Zeitunabhängig
                    </div>
                    <div class="text-caption text--secondary mt-1">
                      Keine zeitlichen Einschränkungen
                    </div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </v-card-text>
        </v-card>

        <!-- Buchungsdauer (nur bei Kalender) -->
        <v-card
          v-if="bookingType === 'schedule'"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-timer-outline</v-icon>
            <span class="text-h6 font-weight-bold">Buchungsdauer</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  label="Minimale Buchungsdauer"
                  v-model.number="minBookingDuration"
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
                  v-model.number="maxBookingDuration"
                  suffix="Stunden"
                  type="number"
                  min="0"
                  hide-details
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Feste Zeitfenster (nur bei timePeriod) -->
        <v-card
          v-if="bookingType === 'timePeriod'"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-clock-outline</v-icon>
              <span class="text-h6 font-weight-bold">Feste Zeitfenster</span>
            </div>
            <v-btn small color="primary" @click="addNewTimePeriod">
              <v-icon left small>mdi-plus</v-icon>
              Hinzufügen
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" v-if="timePeriods.length > 0">
            <v-list dense>
              <template v-for="(timePeriod, idx) in timePeriods">
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
                  v-if="idx < timePeriods.length - 1"
                  :key="`divider-${idx}`"
                />
              </template>
            </v-list>
          </v-card-text>
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
        </v-card>

        <!-- Öffnungszeiten (nur bei schedule oder timePeriod) -->
        <v-card
          v-if="bookingType === 'schedule' || bookingType === 'timePeriod'"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-store-clock-outline</v-icon>
            <span class="text-h6 font-weight-bold">Öffnungszeiten</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="isOpeningHoursRelated"
                  label="Öffnungszeiten aktivieren"
                  hide-details
                  color="primary"
                  class="mt-0"
                >
                  <template v-slot:label>
                    <div>
                      <div class="font-weight-medium">
                        Öffnungszeiten aktivieren
                      </div>
                      <div class="text-caption text--secondary">
                        Buchungen sind nur innerhalb dieser Zeiten möglich
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>

            <template v-if="isOpeningHoursRelated">
              <v-divider class="my-4"></v-divider>

              <!-- Öffnungszeiten Liste -->
              <div v-if="openingHours.length > 0">
                <v-row
                  v-for="(openingHour, idx) in openingHours"
                  :key="`opening-${idx}`"
                  align="center"
                  class="mb-3"
                >
                  <v-col cols="12" md="6">
                    <v-select
                      background-color="accent"
                      filled
                      dense
                      label="Wochentag(e)"
                      :items="weekdays"
                      item-value="id"
                      item-text="name"
                      v-model="openingHour.weekdays"
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
                          @click:close="
                            removeOpeningHoursWeekdays(idx, item.id)
                          "
                        >
                          <strong>{{ item.name }}</strong>
                        </v-chip>
                      </template>
                    </v-select>
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-menu
                      v-model="timeStartOpeningHoursMenu[idx]"
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
                          v-model="openingHour.startTime"
                          label="Von"
                          readonly
                          suffix="Uhr"
                          v-bind="attrs"
                          v-on="on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-time-picker
                        v-if="timeStartOpeningHoursMenu[idx]"
                        v-model="openingHour.startTime"
                        full-width
                        @click:minute="
                          setStartOpeningHoursTime(idx, openingHour.startTime)
                        "
                        format="24hr"
                      ></v-time-picker>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-menu
                      v-model="timeEndOpeningHoursMenu[idx]"
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
                          v-model="openingHour.endTime"
                          label="Bis"
                          readonly
                          suffix="Uhr"
                          v-bind="attrs"
                          v-on="on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-time-picker
                        v-if="timeEndOpeningHoursMenu[idx]"
                        v-model="openingHour.endTime"
                        full-width
                        @click:minute="
                          setEndOpeningHoursTime(idx, openingHour.endTime)
                        "
                        format="24hr"
                      ></v-time-picker>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="2" class="text-right">
                    <v-btn icon small @click="removeOpeningHours(idx)">
                      <v-icon small>mdi-delete-outline</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <v-row>
                <v-col cols="12" class="text-center">
                  <v-btn
                    small
                    outlined
                    color="primary"
                    @click="addNewOpeningHours"
                  >
                    <v-icon left small>mdi-plus</v-icon>
                    Öffnungszeit hinzufügen
                  </v-btn>
                </v-col>
              </v-row>
            </template>
          </v-card-text>
        </v-card>

        <!-- Spezielle Öffnungszeiten (nur bei schedule oder timePeriod) -->
        <v-card
          v-if="bookingType === 'schedule' || bookingType === 'timePeriod'"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-calendar-star</v-icon>
            <span class="text-h6 font-weight-bold">
              Spezielle Öffnungszeiten
            </span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="isSpecialOpeningHoursRelated"
                  label="Spezielle Öffnungszeiten aktivieren"
                  hide-details
                  color="primary"
                  class="mt-0"
                >
                  <template v-slot:label>
                    <div>
                      <div class="font-weight-medium">
                        Spezielle Öffnungszeiten aktivieren
                      </div>
                      <div class="text-caption text--secondary">
                        Abweichende Öffnungszeiten für bestimmte Daten
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>

            <template v-if="isSpecialOpeningHoursRelated">
              <v-divider class="my-4"></v-divider>

              <v-alert type="info" dense outlined class="mb-4">
                <v-icon small class="mr-2">mdi-information-outline</v-icon>
                Gleiche Start- und Endzeit = geschlossen
              </v-alert>

              <!-- Spezielle Öffnungszeiten Liste -->
              <div v-if="specialOpeningHours.length > 0">
                <v-row
                  v-for="(specialOpeningHour, idx) in specialOpeningHours"
                  :key="`special-${idx}`"
                  align="center"
                  class="mb-3"
                >
                  <v-col cols="12" md="4">
                    <v-dialog
                      v-model="specialOpeningHoursDateMenu[idx]"
                      width="290px"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                          v-model="specialOpeningHour.date"
                          label="Datum"
                          prepend-inner-icon="mdi-calendar"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          readonly
                          v-bind="attrs"
                          v-on="on"
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        v-model="specialOpeningHour.date"
                        scrollable
                        locale="de"
                        :first-day-of-week="1"
                      >
                        <v-spacer></v-spacer>
                        <v-btn
                          text
                          color="primary"
                          @click="$set(specialOpeningHoursDateMenu, idx, false)"
                        >
                          Abbrechen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="$set(specialOpeningHoursDateMenu, idx, false)"
                        >
                          OK
                        </v-btn>
                      </v-date-picker>
                    </v-dialog>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-menu
                      v-model="timeStartSpecialOpeningHoursMenu[idx]"
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
                          v-model="specialOpeningHour.startTime"
                          label="Von"
                          readonly
                          suffix="Uhr"
                          v-bind="attrs"
                          v-on="on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-time-picker
                        v-if="timeStartSpecialOpeningHoursMenu[idx]"
                        v-model="specialOpeningHour.startTime"
                        full-width
                        @click:minute="
                          setStartSpecialOpeningHoursTime(
                            idx,
                            specialOpeningHour.startTime
                          )
                        "
                        format="24hr"
                      ></v-time-picker>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-menu
                      v-model="timeEndSpecialOpeningMenu[idx]"
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
                          v-model="specialOpeningHour.endTime"
                          label="Bis"
                          readonly
                          suffix="Uhr"
                          v-bind="attrs"
                          v-on="on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-time-picker
                        v-if="timeEndSpecialOpeningMenu[idx]"
                        v-model="specialOpeningHour.endTime"
                        full-width
                        @click:minute="
                          setEndSpecialOpeningHoursTime(
                            idx,
                            specialOpeningHour.endTime
                          )
                        "
                        format="24hr"
                      ></v-time-picker>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="2" class="text-right">
                    <v-btn icon small @click="removeSpecialOpeningHours(idx)">
                      <v-icon small>mdi-delete-outline</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <v-row>
                <v-col cols="12" class="text-center">
                  <v-btn
                    small
                    outlined
                    color="primary"
                    @click="addNewSpecialOpeningHours"
                  >
                    <v-icon left small>mdi-plus</v-icon>
                    Spezielle Öffnungszeit hinzufügen
                  </v-btn>
                </v-col>
              </v-row>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "BookableTimeDependantAttributes",
  props: {
    bookableType: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      weekdays: [
        { id: 1, name: "Montag" },
        { id: 2, name: "Dienstag" },
        { id: 3, name: "Mittwoch" },
        { id: 4, name: "Donnerstag" },
        { id: 5, name: "Freitag" },
        { id: 6, name: "Samstag" },
        { id: 0, name: "Sonntag" },
      ],
      timeStartSpecialOpeningHoursMenu: [],
      timeEndSpecialOpeningMenu: [],
      timeEndMenu: [],
      timeStartMenu: [],
      timeEndOpeningHoursMenu: [],
      timeStartOpeningHoursMenu: [],
      specialOpeningHoursDateMenu: [],
    };
  },
  computed: {
    bookingType: {
      get() {
        if (this.isScheduleRelated) return "schedule";
        if (this.isTimePeriodRelated) return "timePeriod";
        if (this.isLongRangeWeek) return "week";
        if (this.isLongRangeMonth) return "month";
        return "independent";
      },
      set(value) {
        // Reset all booking types
        this.isScheduleRelated = false;
        this.isTimePeriodRelated = false;
        this.updateValue({ field: "longRangeOptions", value: null });
        this.isLongRange = false;

        // Set the selected type
        switch (value) {
          case "schedule":
            this.isScheduleRelated = true;
            break;
          case "timePeriod":
            this.isTimePeriodRelated = true;
            break;
          case "week":
            this.updateValue({
              field: "longRangeOptions",
              value: { type: "week" },
            });
            this.isLongRange = true;
            break;
          case "month":
            this.updateValue({
              field: "longRangeOptions",
              value: { type: "month" },
            });
            this.isLongRange = true;
            break;
        }
      },
    },
    isLongRangeWeek: {
      get() {
        return (
          this.$store.state.bookables.form.longRangeOptions?.type === "week"
        );
      },
      set(value) {
        if (value) {
          this.updateValue({
            field: "longRangeOptions",
            value: { type: "week" },
          });
          this.isLongRange = value;
        } else {
          this.updateValue({ field: "longRangeOptions", value: null });
          this.isLongRange = value;
        }
      },
    },
    isLongRangeMonth: {
      get() {
        return (
          this.$store.state.bookables.form.longRangeOptions?.type === "month"
        );
      },
      set(value) {
        if (value) {
          this.updateValue({
            field: "longRangeOptions",
            value: { type: "month" },
          });
          this.isLongRange = value;
        } else {
          this.updateValue({ field: "longRangeOptions", value: null });
          this.isLongRange = value;
        }
      },
    },
    isScheduleRelated: {
      get() {
        return this.$store.state.bookables.form.isScheduleRelated;
      },
      set(value) {
        this.updateValue({ field: "isScheduleRelated", value: value });
      },
    },
    isTimePeriodRelated: {
      get() {
        return this.$store.state.bookables.form.isTimePeriodRelated;
      },
      set(value) {
        this.updateValue({ field: "isTimePeriodRelated", value: value });
      },
    },
    timePeriods: {
      get() {
        return this.$store.state.bookables.form.timePeriods;
      },
      set(value) {
        this.updateValue({ field: "timePeriods", value: value });
      },
    },
    isOpeningHoursRelated: {
      get() {
        return this.$store.state.bookables.form.isOpeningHoursRelated;
      },
      set(value) {
        this.updateValue({ field: "isOpeningHoursRelated", value: value });
      },
    },
    openingHours: {
      get() {
        return this.$store.state.bookables.form.openingHours;
      },
      set(value) {
        this.updateValue({ field: "openingHours", value: value });
      },
    },
    minBookingDuration: {
      get() {
        return this.$store.state.bookables.form.minBookingDuration;
      },
      set(value) {
        if (typeof value === "string") {
          value = null;
        }
        this.updateValue({ field: "minBookingDuration", value: value });
      },
    },
    maxBookingDuration: {
      get() {
        return this.$store.state.bookables.form.maxBookingDuration;
      },
      set(value) {
        if (typeof value === "string") {
          value = null;
        }
        this.updateValue({ field: "maxBookingDuration", value: value });
      },
    },
    isSpecialOpeningHoursRelated: {
      get() {
        return this.$store.state.bookables.form.isSpecialOpeningHoursRelated;
      },
      set(value) {
        this.updateValue({
          field: "isSpecialOpeningHoursRelated",
          value: value,
        });
      },
    },
    specialOpeningHours: {
      get() {
        return this.$store.state.bookables.form.specialOpeningHours;
      },
      set(value) {
        this.updateValue({ field: "specialOpeningHours", value: value });
      },
    },
    isLongRange: {
      get() {
        return this.$store.state.bookables.form.isLongRange;
      },
      set(value) {
        this.updateValue({ field: "isLongRange", value: value });
      },
    },
  },
  watch: {
    isOpeningHoursRelated(val) {
      if (val && this.openingHours.length === 0) {
        this.addNewOpeningHours();
      }
    },
    isTimePeriodRelated(val) {
      if (val && this.timePeriods.length === 0) {
        this.addNewTimePeriod();
      }
    },
    isSpecialOpeningHoursRelated(val) {
      if (val && this.specialOpeningHours.length === 0) {
        this.addNewSpecialOpeningHours();
      }
    },
  },
  methods: {
    ...mapActions({
      updateValue: "bookables/updateForm",
    }),
    onBookingTypeChange() {
      // Optional: Clear related data when switching types
    },
    addNewTimePeriod() {
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.timePeriods.push({
        weekdays: [],
        startTime: null,
        endTime: null,
      });
    },
    setEndTime(index, time) {
      this.timePeriods[index].endTime = time;
      this.timeEndMenu[index] = false;
    },
    setStartTime(index, time) {
      this.timePeriods[index].startTime = time;
      this.timeStartMenu[index] = false;
    },
    removeWeekdays(index, item) {
      this.timePeriods[index].weekdays.splice(
        this.timePeriods[index].weekdays.indexOf(item),
        1
      );
    },
    removeTimePeriod(index) {
      this.timePeriods.splice(index, 1);
      this.timeStartMenu.splice(index, 1);
      this.timeEndMenu.splice(index, 1);
    },
    addNewSpecialOpeningHours() {
      this.timeStartSpecialOpeningHoursMenu.push(false);
      this.timeEndSpecialOpeningMenu.push(false);
      this.specialOpeningHoursDateMenu.push(false);
      this.specialOpeningHours.push({
        date: null,
        startTime: null,
        endTime: null,
      });
    },
    removeSpecialOpeningHours(index) {
      this.specialOpeningHours.splice(index, 1);
      this.timeStartSpecialOpeningHoursMenu.splice(index, 1);
      this.timeEndSpecialOpeningMenu.splice(index, 1);
      this.specialOpeningHoursDateMenu.splice(index, 1);
    },
    setEndSpecialOpeningHoursTime(index, time) {
      this.specialOpeningHours[index].endTime = time;
      this.timeEndSpecialOpeningMenu[index] = false;
    },
    setStartSpecialOpeningHoursTime(index, time) {
      this.specialOpeningHours[index].startTime = time;
      this.timeStartSpecialOpeningHoursMenu[index] = false;
    },
    addNewOpeningHours() {
      this.timeStartOpeningHoursMenu.push(false);
      this.timeEndOpeningHoursMenu.push(false);
      this.openingHours.push({
        weekdays: [],
        startTime: null,
        endTime: null,
      });
    },
    setEndOpeningHoursTime(index, time) {
      this.openingHours[index].endTime = time;
      this.timeEndOpeningHoursMenu[index] = false;
    },
    setStartOpeningHoursTime(index, time) {
      this.openingHours[index].startTime = time;
      this.timeStartOpeningHoursMenu[index] = false;
    },
    removeOpeningHoursWeekdays(index, item) {
      this.openingHours[index].weekdays.splice(
        this.openingHours[index].weekdays.indexOf(item),
        1
      );
    },
    removeOpeningHours(index) {
      this.openingHours.splice(index, 1);
      this.timeStartOpeningHoursMenu.splice(index, 1);
      this.timeEndOpeningHoursMenu.splice(index, 1);
    },
  },
};
</script>

<style scoped lang="scss">
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

::v-deep .v-radio {
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}

.theme--dark ::v-deep .v-radio:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.v-list-item {
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}

.theme--dark .v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
