<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "BookableEditOpeningHours",
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
      timeStartSpecialOpeningHoursMenu: [],
      timeEndSpecialOpeningMenu: [],
      timeEndMenu: [],
      timeStartMenu: [],
      timeEndOpeningHoursMenu: [],
      timeStartOpeningHoursMenu: [],
      specialOpeningHoursDateMenu: [],
      expandedItemsOpeningHours: [],
      expandedItemsSpecialHours: [],
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
    bookingType() {
      if (this.model.isScheduleRelated) return "schedule";
      if (this.model.isTimePeriodRelated) return "timePeriod";
      if (this.model.isBlockPeriodRelated) return "blockPeriod";
      if (this.model.isLongRange) return this.model.longRangeOptions.type;
      return "independent";
    },
    hasOpeningHours() {
      return this.model.openingHours && this.model.openingHours.length > 0;
    },
    hasSpecialOpeningHours() {
      return (
        this.model.specialOpeningHours &&
        this.model.specialOpeningHours.length > 0
      );
    },
  },
  methods: {
    removeOpeningHoursWeekdays(index, item) {
      this.model.openingHours[index].weekdays.splice(
        this.model.openingHours[index].weekdays.indexOf(item),
        1
      );
    },
    setStartOpeningHoursTime(index, time) {
      this.model.openingHours[index].startTime = time;
      this.timeStartOpeningHoursMenu[index] = false;
    },
    setEndOpeningHoursTime(index, time) {
      this.model.openingHours[index].endTime = time;
      this.timeEndOpeningHoursMenu[index] = false;
    },
    removeOpeningHours(index) {
      this.model.openingHours.splice(index, 1);
      this.timeStartOpeningHoursMenu.splice(index, 1);
      this.timeEndOpeningHoursMenu.splice(index, 1);
      const idx = this.expandedItemsOpeningHours.indexOf(index);
      if (idx > -1) this.expandedItemsOpeningHours.splice(idx, 1);
    },
    addNewOpeningHours() {
      const index = this.model.openingHours.length;
      this.timeStartOpeningHoursMenu.push(false);
      this.timeEndOpeningHoursMenu.push(false);
      this.model.openingHours.push({
        weekdays: [],
        startTime: null,
        endTime: null,
      });
      this.expandedItemsOpeningHours.push(index);
    },
    setStartSpecialOpeningHoursTime(index, time) {
      this.model.specialOpeningHours[index].startTime = time;
      this.timeStartSpecialOpeningHoursMenu[index] = false;
    },
    setEndSpecialOpeningHoursTime(index, time) {
      this.model.specialOpeningHours[index].endTime = time;
      this.timeEndSpecialOpeningMenu[index] = false;
    },
    addNewSpecialOpeningHours() {
      const index = this.model.specialOpeningHours.length;
      this.timeStartSpecialOpeningHoursMenu.push(false);
      this.timeEndSpecialOpeningMenu.push(false);
      this.specialOpeningHoursDateMenu.push(false);
      this.model.specialOpeningHours.push({
        date: null,
        startTime: null,
        endTime: null,
      });
      this.expandedItemsSpecialHours.push(index);
    },
    removeSpecialOpeningHours(index) {
      this.model.specialOpeningHours.splice(index, 1);
      this.timeStartSpecialOpeningHoursMenu.splice(index, 1);
      this.timeEndSpecialOpeningMenu.splice(index, 1);
      this.specialOpeningHoursDateMenu.splice(index, 1);
      const idx = this.expandedItemsSpecialHours.indexOf(index);
      if (idx > -1) this.expandedItemsSpecialHours.splice(idx, 1);
    },
    getWeekdayName(id) {
      const day = this.weekdays.find((d) => d.id === id);
      return day ? day.short : "";
    },
    getWeekdayNamesFormatted(weekdays) {
      if (!weekdays || weekdays.length === 0) return "";
      return weekdays
        .map((id) => this.getWeekdayName(id))
        .filter(Boolean)
        .join(", ");
    },
    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    toggleExpandOpeningHours(index) {
      const idx = this.expandedItemsOpeningHours.indexOf(index);
      if (idx > -1) {
        this.expandedItemsOpeningHours.splice(idx, 1);
      } else {
        this.expandedItemsOpeningHours.push(index);
      }
    },
    isExpandedOpeningHours(index) {
      return this.expandedItemsOpeningHours.includes(index);
    },
    toggleExpandSpecialHours(index) {
      const idx = this.expandedItemsSpecialHours.indexOf(index);
      if (idx > -1) {
        this.expandedItemsSpecialHours.splice(idx, 1);
      } else {
        this.expandedItemsSpecialHours.push(index);
      }
    },
    isExpandedSpecialHours(index) {
      return this.expandedItemsSpecialHours.includes(index);
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Öffnungszeiten" icon="mdi-clock-outline" />

    <div v-if="bookingType === 'schedule' || bookingType === 'timePeriod'">
      <!-- Regular Opening Hours -->
      <v-card class="mb-6 section-card" elevation="2" outlined>
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-store-clock-outline</v-icon>
            <span class="text-h6 font-weight-bold">Öffnungszeiten</span>
          </div>
          <v-btn
            v-if="model.isOpeningHoursRelated"
            small
            color="primary"
            @click="addNewOpeningHours"
          >
            <v-icon left small>mdi-plus</v-icon>
            Hinzufügen
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12">
              <v-switch
                v-model="model.isOpeningHoursRelated"
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
                      Wiederkehrende Öffnungszeiten für Wochentage
                    </div>
                  </div>
                </template>
              </v-switch>
            </v-col>
          </v-row>

          <template v-if="model.isOpeningHoursRelated">
            <v-divider class="my-4"></v-divider>

            <v-alert color="info" dense text class="mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-3" color="info"> mdi-calendar-alert </v-icon>
                <div>
                  <strong>Wichtig:</strong> Nur Wochentage mit definierten
                  Öffnungszeiten sind buchbar. Alle anderen Tage gelten als
                  geschlossen.
                </div>
              </div>
            </v-alert>

            <div v-if="hasOpeningHours">
              <v-list two-line class="py-0">
                <template v-for="(openingHour, idx) in model.openingHours">
                  <v-list-item
                    :key="`opening-${idx}`"
                    class="opening-hours-item elevation-1 mb-3 rounded"
                    @click="toggleExpandOpeningHours(idx)"
                  >
                    <v-list-item-avatar>
                      <v-avatar
                        :color="
                          openingHour.weekdays.length > 0 ? 'primary' : 'grey'
                        "
                        size="40"
                      >
                        <v-icon dark small>mdi-calendar-week</v-icon>
                      </v-avatar>
                    </v-list-item-avatar>

                    <v-list-item-content>
                      <v-list-item-title class="d-flex align-center">
                        <span class="font-weight-medium">
                          {{
                            getWeekdayNamesFormatted(openingHour.weekdays) ||
                            "Keine Tage gewählt"
                          }}
                        </span>
                      </v-list-item-title>

                      <v-list-item-subtitle
                        class="d-flex align-center flex-wrap"
                      >
                        <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                        <span
                          v-if="openingHour.startTime && openingHour.endTime"
                        >
                          {{ openingHour.startTime }} -
                          {{ openingHour.endTime }} Uhr
                        </span>
                        <span v-else class="grey--text"
                          >Zeit nicht gesetzt</span
                        >
                      </v-list-item-subtitle>
                    </v-list-item-content>

                    <v-list-item-action>
                      <div class="d-flex align-center">
                        <v-btn
                          icon
                          small
                          @click.stop="removeOpeningHours(idx)"
                          color="error"
                        >
                          <v-icon small>mdi-delete-outline</v-icon>
                        </v-btn>
                        <v-btn icon small>
                          <v-icon>
                            {{
                              isExpandedOpeningHours(idx)
                                ? "mdi-chevron-up"
                                : "mdi-chevron-down"
                            }}
                          </v-icon>
                        </v-btn>
                      </div>
                    </v-list-item-action>
                  </v-list-item>

                  <v-expand-transition :key="`expand-opening-${idx}`">
                    <v-card
                      v-show="isExpandedOpeningHours(idx)"
                      flat
                      class="mx-3 mb-3 pa-4 opening-hours-card"
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
                            v-model="openingHour.weekdays"
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
                              v-slot:selection="{
                                attrs,
                                item,
                                select,
                                selected,
                              }"
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
                      </v-row>

                      <v-row>
                        <v-col cols="12" md="6">
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
                                dense
                                background-color="accent"
                                filled
                                v-model="openingHour.startTime"
                                label="Von *"
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
                              v-if="timeStartOpeningHoursMenu[idx]"
                              v-model="openingHour.startTime"
                              full-width
                              @click:minute="
                                setStartOpeningHoursTime(
                                  idx,
                                  openingHour.startTime
                                )
                              "
                              format="24hr"
                            ></v-time-picker>
                          </v-menu>
                        </v-col>

                        <v-col cols="12" md="6">
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
                                dense
                                background-color="accent"
                                filled
                                v-model="openingHour.endTime"
                                label="Bis *"
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
                      </v-row>
                    </v-card>
                  </v-expand-transition>

                  <v-divider
                    v-if="idx < model.openingHours.length - 1"
                    :key="`divider-opening-${idx}`"
                    class="my-2"
                  />
                </template>
              </v-list>
            </div>

            <div v-else class="text-center py-8">
              <v-icon large color="grey lighten-1" class="mb-2">
                mdi-calendar-remove
              </v-icon>
              <div class="text-h6 grey--text mb-2">
                Noch keine Öffnungszeiten definiert
              </div>
              <div class="text-body-2 grey--text text--darken-1 mb-4">
                Fügen Sie wiederkehrende Öffnungszeiten für Wochentage hinzu
              </div>
              <v-btn small text color="primary" @click="addNewOpeningHours">
                <v-icon left small>mdi-plus</v-icon>
                Erste Öffnungszeit hinzufügen
              </v-btn>
            </div>
          </template>
        </v-card-text>
      </v-card>

      <!-- Special Opening Hours -->
      <v-card class="mb-6 section-card" elevation="2" outlined>
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-calendar-star</v-icon>
            <span class="text-h6 font-weight-bold"> Sonderöffnungszeiten </span>
          </div>
          <v-btn
            v-if="model.isSpecialOpeningHoursRelated"
            small
            color="primary"
            @click="addNewSpecialOpeningHours"
          >
            <v-icon left small>mdi-plus</v-icon>
            Hinzufügen
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12">
              <v-switch
                v-model="model.isSpecialOpeningHoursRelated"
                label="Sonderöffnungszeiten aktivieren"
                hide-details
                color="primary"
                class="mt-0"
              >
                <template v-slot:label>
                  <div>
                    <div class="font-weight-medium">
                      Sonderöffnungszeiten aktivieren
                    </div>
                    <div class="text-caption text--secondary">
                      Abweichende Öffnungszeiten für einzelne Daten
                    </div>
                  </div>
                </template>
              </v-switch>
            </v-col>
          </v-row>

          <template v-if="model.isSpecialOpeningHoursRelated">
            <v-divider class="my-4"></v-divider>

            <v-alert
              v-if="hasSpecialOpeningHours"
              color="info"
              dense
              text
              class="mb-4"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-3" color="info">
                  mdi-lightbulb-on-outline
                </v-icon>
                <div>
                  <strong>Tipp:</strong> Um einen Tag als geschlossen zu
                  markieren, wählen Sie die gleiche Start- und Endzeit
                  <span class="grey--text">(z.B. 00:00 - 00:00)</span>
                </div>
              </div>
            </v-alert>

            <div v-if="hasSpecialOpeningHours">
              <v-list two-line class="py-0">
                <template
                  v-for="(specialOpeningHour, idx) in model.specialOpeningHours"
                >
                  <v-list-item
                    :key="`special-${idx}`"
                    class="special-hours-item elevation-1 mb-3 rounded"
                    @click="toggleExpandSpecialHours(idx)"
                  >
                    <v-list-item-avatar>
                      <v-avatar
                        :color="specialOpeningHour.date ? 'orange' : 'grey'"
                        size="40"
                      >
                        <v-icon dark small>mdi-calendar-star</v-icon>
                      </v-avatar>
                    </v-list-item-avatar>

                    <v-list-item-content>
                      <v-list-item-title class="d-flex align-center">
                        <span class="font-weight-medium">
                          {{
                            formatDate(specialOpeningHour.date) || "Kein Datum"
                          }}
                        </span>
                      </v-list-item-title>

                      <v-list-item-subtitle
                        class="d-flex align-center flex-wrap"
                      >
                        <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                        <span
                          v-if="
                            specialOpeningHour.startTime &&
                            specialOpeningHour.endTime
                          "
                        >
                          {{ specialOpeningHour.startTime }} -
                          {{ specialOpeningHour.endTime }} Uhr
                        </span>
                        <span v-else class="grey--text"
                          >Zeit nicht gesetzt</span
                        >
                      </v-list-item-subtitle>
                    </v-list-item-content>

                    <v-list-item-action>
                      <div class="d-flex align-center">
                        <v-btn
                          icon
                          small
                          @click.stop="removeSpecialOpeningHours(idx)"
                          color="error"
                        >
                          <v-icon small>mdi-delete-outline</v-icon>
                        </v-btn>
                        <v-btn icon small>
                          <v-icon>
                            {{
                              isExpandedSpecialHours(idx)
                                ? "mdi-chevron-up"
                                : "mdi-chevron-down"
                            }}
                          </v-icon>
                        </v-btn>
                      </div>
                    </v-list-item-action>
                  </v-list-item>

                  <v-expand-transition :key="`expand-special-${idx}`">
                    <v-card
                      v-show="isExpandedSpecialHours(idx)"
                      flat
                      class="mx-3 mb-3 pa-4 special-hours-card"
                      color="grey lighten-5"
                    >
                      <v-row>
                        <v-col cols="12">
                          <v-dialog
                            v-model="specialOpeningHoursDateMenu[idx]"
                            width="290px"
                          >
                            <template v-slot:activator="{ on, attrs }">
                              <v-text-field
                                dense
                                v-model="specialOpeningHour.date"
                                label="Datum *"
                                prepend-inner-icon="mdi-calendar"
                                background-color="accent"
                                filled
                                hide-details="auto"
                                readonly
                                v-bind="attrs"
                                v-on="on"
                                :rules="[
                                  (v) => !!v || 'Datum ist erforderlich',
                                ]"
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
                                @click="
                                  $set(specialOpeningHoursDateMenu, idx, false)
                                "
                              >
                                Abbrechen
                              </v-btn>
                              <v-btn
                                text
                                color="primary"
                                @click="
                                  $set(specialOpeningHoursDateMenu, idx, false)
                                "
                              >
                                OK
                              </v-btn>
                            </v-date-picker>
                          </v-dialog>
                        </v-col>
                      </v-row>

                      <v-row>
                        <v-col cols="12" md="6">
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
                                dense
                                background-color="accent"
                                filled
                                v-model="specialOpeningHour.startTime"
                                label="Von *"
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

                        <v-col cols="12" md="6">
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
                                dense
                                background-color="accent"
                                filled
                                v-model="specialOpeningHour.endTime"
                                label="Bis *"
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
                      </v-row>
                    </v-card>
                  </v-expand-transition>

                  <v-divider
                    v-if="idx < model.specialOpeningHours.length - 1"
                    :key="`divider-special-${idx}`"
                    class="my-2"
                  />
                </template>
              </v-list>
            </div>

            <div v-else class="text-center py-8">
              <v-icon large color="grey lighten-1" class="mb-2">
                mdi-calendar-remove
              </v-icon>
              <div class="text-h6 grey--text mb-2">
                Noch keine Sonderöffnungszeiten definiert
              </div>
              <div class="text-body-2 grey--text text--darken-1 mb-4">
                Fügen Sie abweichende Öffnungszeiten für einzelne Daten hinzu
              </div>
              <v-btn
                small
                text
                color="primary"
                @click="addNewSpecialOpeningHours"
              >
                <v-icon left small>mdi-plus</v-icon>
                Erste Sonderöffnungszeit hinzufügen
              </v-btn>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </div>

    <div v-else class="text-center py-12">
      <v-icon size="64" color="grey lighten-1" class="mb-4">
        mdi-information-outline
      </v-icon>
      <div class="text-h6 font-weight-medium mb-2">
        Öffnungszeiten nicht verfügbar
      </div>
      <div class="text-body-2 grey--text text--darken-1">
        Öffnungszeiten können nur für zeitabhängige Buchungstypen
        <br />
        (Freie Zeitwahl oder feste Zeitfenster) definiert werden.
      </div>
      <v-chip small class="mt-4" color="grey lighten-3">
        Aktueller Typ:
        {{
          bookingType === "week"
            ? "Wochenbuchung"
            : bookingType === "month"
            ? "Monatsbuchung"
            : "Zeitunabhängig"
        }}
      </v-chip>
    </div>
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

.opening-hours-item,
.special-hours-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme--dark .opening-hours-item,
.theme--dark .special-hours-item {
  background-color: rgba(255, 255, 255, 0.05);
}

.opening-hours-card,
.special-hours-card {
  border-radius: 8px !important;
}
</style>
