<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import BookableEditLeadTime from "@/components/Bookable/Edit/BookableEditLeadTime.vue";
import { v4 as uuidv4 } from "uuid";

export default {
  name: "BookableEditBookingType",
  components: { BaseSection, BookableEditLeadTime },
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
      expandedItems: [],
      blockTimeEndMenu: [],
      blockTimeStartMenu: [],
      expandedBlockItems: [],
    };
  },
  created() {
    if (!Array.isArray(this.model.blockPeriods)) {
      this.model.blockPeriods = [];
    }
    this.model.blockPeriods.forEach((blockPeriod) => {
      if (!blockPeriod.id) {
        blockPeriod.id = uuidv4();
      }
    });
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
        if (this.model.isBlockPeriodRelated) return "blockPeriod";
        if (this.isLongRangeWeek) return "week";
        if (this.isLongRangeMonth) return "month";
        return "independent";
      },
      set(value) {
        this.model.isScheduleRelated = false;
        this.model.isTimePeriodRelated = false;
        this.model.isBlockPeriodRelated = false;
        this.model.longRangeOptions = {};
        this.model.isLongRange = false;

        switch (value) {
        case "schedule":
          this.model.isScheduleRelated = true;
          break;
        case "timePeriod":
          this.model.isTimePeriodRelated = true;
          break;
        case "blockPeriod":
          this.model.isBlockPeriodRelated = true;
          if (!Array.isArray(this.model.blockPeriods)) {
            this.model.blockPeriods = [];
          }
          if (this.model.groupBooking?.enabled) {
            this.model.groupBooking.enabled = false;
          }
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
      const formValid = this.$refs.form ? this.$refs.form.validate() : true;
      if (!formValid) {
        return false;
      }
      if (this.bookingType === "schedule" && this.$refs.leadTime) {
        const leadTimeValid = await this.$refs.leadTime.validate();
        if (!leadTimeValid) {
          return false;
        }
      }
      if (this.bookingType !== "blockPeriod") {
        return true;
      }
      if (!this.model.blockPeriods?.length) {
        return false;
      }
      return this.model.blockPeriods.every(
        (blockPeriod) => this.getBlockPeriodDurationMinutes(blockPeriod) > 0
      );
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    generateBlockPeriodId() {
      return uuidv4();
    },
    addNewBlockPeriod() {
      const index = this.model.blockPeriods.length;
      this.blockTimeStartMenu.push(false);
      this.blockTimeEndMenu.push(false);
      this.model.blockPeriods.push({
        id: this.generateBlockPeriodId(),
        label: "",
        startWeekday: null,
        startTime: null,
        endWeekday: null,
        endTime: null,
      });
      this.expandedBlockItems.push(index);
    },
    getBlockPeriodWeekdayRange(blockPeriod) {
      const start = this.getWeekdayName(blockPeriod.startWeekday);
      const end = this.getWeekdayName(blockPeriod.endWeekday);
      if (!start || !end) {
        return "Keine Tage gewählt";
      }
      return `${start} – ${end}`;
    },
    parseTimeToMinutes(time) {
      if (!time || typeof time !== "string") {
        return NaN;
      }
      const [hours, minutes] = time.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return NaN;
      }
      return hours * 60 + minutes;
    },
    isBlockPeriodComplete(blockPeriod) {
      const { startWeekday, endWeekday, startTime, endTime } = blockPeriod;
      return (
        startWeekday != null &&
        endWeekday != null &&
        !!startTime &&
        !!endTime
      );
    },
    getBlockPeriodDurationMinutes(blockPeriod) {
      if (!this.isBlockPeriodComplete(blockPeriod)) {
        return 0;
      }

      const startDay = Number(blockPeriod.startWeekday);
      const endDay = Number(blockPeriod.endWeekday);
      const startMinutes = this.parseTimeToMinutes(blockPeriod.startTime);
      const endMinutes = this.parseTimeToMinutes(blockPeriod.endTime);

      if (
        Number.isNaN(startDay) ||
        Number.isNaN(endDay) ||
        Number.isNaN(startMinutes) ||
        Number.isNaN(endMinutes)
      ) {
        return 0;
      }

      let daySpan;
      if (endDay > startDay) {
        daySpan = endDay - startDay;
      } else if (endDay < startDay) {
        daySpan = 7 - startDay + endDay;
      } else if (endMinutes <= startMinutes) {
        daySpan = 7;
      } else {
        daySpan = 0;
      }

      return daySpan * 24 * 60 + endMinutes - startMinutes;
    },
    revalidateBlockPeriodForm() {
      this.$nextTick(() => {
        this.$refs.form?.validate();
      });
    },
    setBlockEndTime(index, time) {
      this.model.blockPeriods[index].endTime = time;
      this.blockTimeEndMenu[index] = false;
      this.revalidateBlockPeriodForm();
    },
    setBlockStartTime(index, time) {
      this.model.blockPeriods[index].startTime = time;
      this.blockTimeStartMenu[index] = false;
      this.revalidateBlockPeriodForm();
    },
    removeBlockPeriod(index) {
      this.model.blockPeriods.splice(index, 1);
      this.blockTimeStartMenu.splice(index, 1);
      this.blockTimeEndMenu.splice(index, 1);
      this.expandedBlockItems = this.expandedBlockItems
        .filter((expandedIndex) => expandedIndex !== index)
        .map((expandedIndex) =>
          expandedIndex > index ? expandedIndex - 1 : expandedIndex
        );
    },
    toggleBlockExpand(index) {
      const idx = this.expandedBlockItems.indexOf(index);
      if (idx > -1) {
        this.expandedBlockItems.splice(idx, 1);
      } else {
        this.expandedBlockItems.push(index);
      }
    },
    isBlockExpanded(index) {
      return this.expandedBlockItems.includes(index);
    },
    addNewTimePeriod() {
      const index = this.model.timePeriods.length;
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.model.timePeriods.push({
        weekdays: [],
        startTime: null,
        endTime: null,
      });
      this.expandedItems.push(index);
    },
    getWeekdayName(id) {
      if (id == null || id === "") {
        return "";
      }
      const day = this.weekdays.find((d) => d.id === Number(id));
      return day ? day.name.substring(0, 2) : "";
    },
    getWeekdayNamesFormatted(weekdays) {
      if (!weekdays || weekdays.length === 0) return "";
      return weekdays
        .map((id) => this.getWeekdayName(id))
        .filter(Boolean)
        .join(", ");
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
      const idx = this.expandedItems.indexOf(index);
      if (idx > -1) this.expandedItems.splice(idx, 1);
    },
    toggleExpand(index) {
      const idx = this.expandedItems.indexOf(index);
      if (idx > -1) {
        this.expandedItems.splice(idx, 1);
      } else {
        this.expandedItems.push(index);
      }
    },
    isExpanded(index) {
      return this.expandedItems.includes(index);
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

        <v-radio value="blockPeriod" class="mb-3">
          <template v-slot:label>
            <div>
              <div class="font-weight-bold">
                <v-icon small class="mr-2">mdi-calendar-sync</v-icon>
                Zeiträume
              </div>
              <div class="text-caption text--secondary mt-1">
                Wiederkehrende, tagesübergreifende Buchungsfenster (z. B.
                Wochenende, Arbeitswoche)
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
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-timer-outline</v-icon>
            <span class="text-h6 font-weight-bold">Buchungsdauer</span>
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
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

      <BookableEditLeadTime
        v-if="bookingType === 'schedule'"
        ref="leadTime"
        :bookable="model"
        @update:bookable="model = $event"
      />

      <v-card class="mt-4 section-card" v-if="bookingType === 'timePeriod'">
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-clock-outline</v-icon>
            <span class="text-h6 font-weight-bold">Feste Zeitfenster</span>
          </div>
          <v-btn small color="primary" @click="addNewTimePeriod">
            <v-icon left small>mdi-plus</v-icon>
            Hinzufügen
          </v-btn>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <div v-if="model.timePeriods.length > 0">
            <v-list two-line class="py-0">
              <template v-for="(timePeriod, index) in model.timePeriods">
                <v-list-item
                  :key="`period-${index}`"
                  class="time-period-item elevation-1 mb-3 rounded"
                  @click="toggleExpand(index)"
                >
                  <v-list-item-avatar>
                    <v-avatar
                      :color="
                        timePeriod.weekdays.length > 0 ? 'primary' : 'grey'
                      "
                      size="40"
                    >
                      <v-icon dark small>mdi-clock-outline</v-icon>
                    </v-avatar>
                  </v-list-item-avatar>

                  <v-list-item-content>
                    <v-list-item-title class="d-flex align-center">
                      <span class="font-weight-medium">
                        {{
                          getWeekdayNamesFormatted(timePeriod.weekdays) ||
                          "Keine Tage gewählt"
                        }}
                      </span>
                    </v-list-item-title>
                    <v-list-item-subtitle
                      class="d-flex align-center flex-wrap"
                    >
                      <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                      <span v-if="timePeriod.startTime && timePeriod.endTime">
                        {{ timePeriod.startTime }} - {{ timePeriod.endTime }}
                        Uhr
                      </span>
                      <span v-else class="grey--text">Zeit nicht gesetzt</span>
                    </v-list-item-subtitle>
                  </v-list-item-content>

                  <v-list-item-action>
                    <div class="d-flex align-center">
                      <v-btn
                        icon
                        small
                        @click.stop="removeTimePeriod(index)"
                      >
                        <v-icon small>mdi-delete-outline</v-icon>
                      </v-btn>
                      <v-btn icon small>
                        <v-icon>
                          {{
                            isExpanded(index)
                              ? "mdi-chevron-up"
                              : "mdi-chevron-down"
                          }}
                        </v-icon>
                      </v-btn>
                    </div>
                  </v-list-item-action>
                </v-list-item>

                <v-expand-transition :key="`expand-${index}`">
                  <v-card
                    v-show="isExpanded(index)"
                    flat
                    class="mx-3 mb-3 pa-4 time-period-card"
                    color="grey lighten-5"
                  >
                    <v-row>
                      <v-col cols="12">
                        <v-select
                          dense
                          background-color="accent"
                          filled
                          label="Wochentag(e) *"
                          :items="weekdays"
                          item-value="id"
                          item-text="name"
                          v-model="timePeriod.weekdays"
                          multiple
                          chips
                          hide-selected
                          hide-details="auto"
                          :rules="[
                            (v) =>
                              (v && v.length > 0) ||
                              'Mindestens ein Wochentag erforderlich',
                          ]"
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
                              @click:close="removeWeekdays(index, item.id)"
                            >
                              <strong>{{ item.name }}</strong>
                            </v-chip>
                          </template>
                        </v-select>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12" md="6">
                        <v-menu
                          v-model="timeStartMenu[index]"
                          :close-on-content-click="false"
                          :nudge-right="40"
                          transition="scale-transition"
                          offset-y
                          max-width="290px"
                          min-width="290px"
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                              dense
                              background-color="accent"
                              filled
                              v-model="timePeriod.startTime"
                              label="Startzeit *"
                              readonly
                              suffix="Uhr"
                              v-bind="attrs"
                              v-on="on"
                              hide-details="auto"
                              :rules="[
                                (v) => !!v || 'Startzeit ist erforderlich',
                              ]"
                            ></v-text-field>
                          </template>
                          <v-time-picker
                            v-if="timeStartMenu[index]"
                            v-model="timePeriod.startTime"
                            full-width
                            @click:minute="
                              setStartTime(index, timePeriod.startTime)
                            "
                            format="24hr"
                          ></v-time-picker>
                        </v-menu>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-menu
                          v-model="timeEndMenu[index]"
                          :close-on-content-click="false"
                          :nudge-right="40"
                          transition="scale-transition"
                          offset-y
                          max-width="290px"
                          min-width="290px"
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                              dense
                              background-color="accent"
                              filled
                              v-model="timePeriod.endTime"
                              label="Endzeit *"
                              readonly
                              suffix="Uhr"
                              v-bind="attrs"
                              v-on="on"
                              hide-details="auto"
                              :rules="[
                                (v) => !!v || 'Endzeit ist erforderlich',
                              ]"
                            ></v-text-field>
                          </template>
                          <v-time-picker
                            v-if="timeEndMenu[index]"
                            v-model="timePeriod.endTime"
                            full-width
                            @click:minute="setEndTime(index, timePeriod.endTime)"
                            format="24hr"
                          ></v-time-picker>
                        </v-menu>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-expand-transition>

                <v-divider
                  v-if="index < model.timePeriods.length - 1"
                  :key="`divider-${index}`"
                  class="my-2"
                />
              </template>
            </v-list>
          </div>

          <div v-else class="text-center py-8">
            <v-icon large color="grey lighten-1" class="mb-2">
              mdi-clock-outline
            </v-icon>
            <div class="text-h6 grey--text mb-2">
              Noch keine Zeitfenster definiert
            </div>
            <div class="text-body-2 grey--text text--darken-1 mb-4">
              Fügen Sie Zeitfenster hinzu, um feste Buchungszeiten zu
              definieren
            </div>
            <v-btn small text color="primary" @click="addNewTimePeriod">
              <v-icon left small>mdi-plus</v-icon>
              Erstes Zeitfenster hinzufügen
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="mt-4 section-card" v-if="bookingType === 'blockPeriod'">
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-calendar-sync</v-icon>
            <span class="text-h6 font-weight-bold">Zeiträume</span>
          </div>
          <v-btn small color="primary" @click="addNewBlockPeriod">
            <v-icon left small>mdi-plus</v-icon>
            Hinzufügen
          </v-btn>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <v-alert color="info" dense text class="mb-4">
            <v-icon class="mr-3" color="info">mdi-information-outline</v-icon>
            Öffnungszeiten und min./max. Buchungsdauer gelten bei Zeiträumen
            nicht. Zeiträume können über den Wochenwechsel hinausgehen (z. B. Fr
            18:00 → Mo 08:00).
          </v-alert>

          <v-alert
            v-if="model.blockPeriods.length === 0"
            type="warning"
            dense
            text
            class="mb-4"
          >
            Mindestens ein Zeitraum ist erforderlich.
          </v-alert>

          <div v-if="model.blockPeriods.length > 0">
            <v-list two-line class="py-0">
              <template v-for="(blockPeriod, index) in model.blockPeriods">
                <v-list-item
                  :key="`block-period-${blockPeriod.id}`"
                  class="time-period-item elevation-1 mb-3 rounded"
                  @click="toggleBlockExpand(index)"
                >
                  <v-list-item-avatar>
                    <v-avatar
                      :color="blockPeriod.label ? 'primary' : 'grey'"
                      size="40"
                    >
                      <v-icon dark small>mdi-calendar-sync</v-icon>
                    </v-avatar>
                  </v-list-item-avatar>

                  <v-list-item-content>
                    <v-list-item-title class="d-flex align-center">
                      <span class="font-weight-medium">
                        {{ blockPeriod.label || "Ohne Bezeichnung" }}
                      </span>
                    </v-list-item-title>
                    <v-list-item-subtitle
                      class="d-flex align-center flex-wrap"
                    >
                      <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                      <span
                        v-if="
                          blockPeriod.startTime &&
                          blockPeriod.endTime &&
                          blockPeriod.startWeekday != null &&
                          blockPeriod.endWeekday != null
                        "
                      >
                        {{ getBlockPeriodWeekdayRange(blockPeriod) }},
                        {{ blockPeriod.startTime }} – {{ blockPeriod.endTime }}
                        Uhr
                      </span>
                      <span v-else class="grey--text">Zeit nicht gesetzt</span>
                    </v-list-item-subtitle>
                  </v-list-item-content>

                  <v-list-item-action>
                    <div class="d-flex align-center">
                      <v-btn
                        icon
                        small
                        @click.stop="removeBlockPeriod(index)"
                      >
                        <v-icon small>mdi-delete-outline</v-icon>
                      </v-btn>
                      <v-btn icon small>
                        <v-icon>
                          {{
                            isBlockExpanded(index)
                              ? "mdi-chevron-up"
                              : "mdi-chevron-down"
                          }}
                        </v-icon>
                      </v-btn>
                    </div>
                  </v-list-item-action>
                </v-list-item>

                <v-expand-transition :key="`block-expand-${blockPeriod.id}`">
                  <v-card
                    v-show="isBlockExpanded(index)"
                    flat
                    class="mx-3 mb-3 pa-4 time-period-card"
                    color="grey lighten-5"
                  >
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          dense
                          background-color="accent"
                          filled
                          label="Bezeichnung *"
                          v-model="blockPeriod.label"
                          hide-details="auto"
                          :rules="[
                            (v) => !!v?.trim() || 'Bezeichnung ist erforderlich',
                          ]"
                        />
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12" md="6">
                        <v-select
                          dense
                          background-color="accent"
                          filled
                          label="Start-Wochentag *"
                          :items="weekdays"
                          item-value="id"
                          item-text="name"
                          v-model="blockPeriod.startWeekday"
                          hide-details="auto"
                          @change="revalidateBlockPeriodForm"
                          :rules="[
                            (v) =>
                              (v !== null && v !== undefined) ||
                              'Start-Wochentag ist erforderlich',
                          ]"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-menu
                          v-model="blockTimeStartMenu[index]"
                          :close-on-content-click="false"
                          :nudge-right="40"
                          transition="scale-transition"
                          offset-y
                          max-width="290px"
                          min-width="290px"
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                              dense
                              background-color="accent"
                              filled
                              v-model="blockPeriod.startTime"
                              label="Startzeit *"
                              readonly
                              suffix="Uhr"
                              v-bind="attrs"
                              v-on="on"
                              hide-details="auto"
                              :rules="[
                                (v) => !!v || 'Startzeit ist erforderlich',
                              ]"
                            />
                          </template>
                          <v-time-picker
                            v-if="blockTimeStartMenu[index]"
                            v-model="blockPeriod.startTime"
                            full-width
                            format="24hr"
                            @click:minute="
                              setBlockStartTime(index, blockPeriod.startTime)
                            "
                          />
                        </v-menu>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12" md="6">
                        <v-select
                          dense
                          background-color="accent"
                          filled
                          label="End-Wochentag *"
                          :items="weekdays"
                          item-value="id"
                          item-text="name"
                          v-model="blockPeriod.endWeekday"
                          hide-details="auto"
                          hint="Ende in derselben Woche, wenn der Tag nach dem Start liegt; sonst in der Folgewoche"
                          persistent-hint
                          @change="revalidateBlockPeriodForm"
                          :rules="[
                            (v) =>
                              (v !== null && v !== undefined) ||
                              'End-Wochentag ist erforderlich',
                          ]"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-menu
                          v-model="blockTimeEndMenu[index]"
                          :close-on-content-click="false"
                          :nudge-right="40"
                          transition="scale-transition"
                          offset-y
                          max-width="290px"
                          min-width="290px"
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                              dense
                              background-color="accent"
                              filled
                              v-model="blockPeriod.endTime"
                              label="Endzeit *"
                              readonly
                              suffix="Uhr"
                              v-bind="attrs"
                              v-on="on"
                              hide-details="auto"
                              :rules="[
                                (v) => !!v || 'Endzeit ist erforderlich',
                              ]"
                            />
                          </template>
                          <v-time-picker
                            v-if="blockTimeEndMenu[index]"
                            v-model="blockPeriod.endTime"
                            full-width
                            format="24hr"
                            @click:minute="
                              setBlockEndTime(index, blockPeriod.endTime)
                            "
                          />
                        </v-menu>
                      </v-col>
                    </v-row>

                    <v-row
                      v-if="
                        isBlockPeriodComplete(blockPeriod) &&
                        getBlockPeriodDurationMinutes(blockPeriod) <= 0
                      "
                    >
                      <v-col cols="12">
                        <div class="text-caption error--text">
                          Die Buchungsdauer muss größer als null sein.
                        </div>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-expand-transition>

                <v-divider
                  v-if="index < model.blockPeriods.length - 1"
                  :key="`block-divider-${blockPeriod.id}`"
                  class="my-2"
                />
              </template>
            </v-list>
          </div>

          <div v-else class="text-center py-8">
            <v-icon large color="grey lighten-1" class="mb-2">
              mdi-calendar-sync
            </v-icon>
            <div class="text-h6 grey--text mb-2">
              Noch keine Zeiträume definiert
            </div>
            <div class="text-body-2 grey--text text--darken-1 mb-4">
              Fügen Sie Zeiträume hinzu, um wiederkehrende Buchungsfenster
              zu definieren
            </div>
            <v-btn small text color="primary" @click="addNewBlockPeriod">
              <v-icon left small>mdi-plus</v-icon>
              Ersten Zeitraum hinzufügen
            </v-btn>
          </div>
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

.time-period-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme--dark .time-period-item {
  background-color: rgba(255, 255, 255, 0.05);
}

.time-period-card {
  border-radius: 8px !important;
}
</style>
