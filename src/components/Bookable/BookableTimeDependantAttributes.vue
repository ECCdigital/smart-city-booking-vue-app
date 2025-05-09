<template>
  <div>
    <v-row>
      <v-col>
        <v-expansion-panels flat multiple>
          <v-expansion-panel class="mb-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1">
                      Buchungen über Kalender
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="isScheduleRelated" class="ml-2"
                          >Aktiviert</span
                        >
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <v-alert type="info" dense outlined v-if="open">
                        Wenn Buchungen feste Buchungszeiten haben, können diese
                        nicht über den Kalender gebucht werden.
                      </v-alert>
                      <div v-else>
                        <span
                          v-if="isScheduleRelated && minBookingDuration > 0"
                          class="mr-4"
                          >Minimale Buchungsdauer:
                          <strong>{{ minBookingDuration }}</strong>
                          Stunden</span
                        >
                        <span v-if="isScheduleRelated && maxBookingDuration > 0"
                          >Maximale Buchungsdauer:
                          <strong>{{ maxBookingDuration }}</strong>
                          Stunden</span
                        >
                      </div>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content class="mt-3">
              <v-row align="center">
                <v-col class="col-2">
                  <v-switch
                    class="mt-0 pt-0"
                    dense
                    label="Buchungen über Kalender"
                    hide-details
                    v-model="isScheduleRelated"
                    :disabled="isTimePeriodRelated"
                  ></v-switch>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    label="Minimale Buchungsdauer"
                    hide-details
                    v-model.number="minBookingDuration"
                    suffix="Stunden"
                    :disabled="!isScheduleRelated"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    label="Maximale Buchungsdauer"
                    hide-details
                    v-model.number="maxBookingDuration"
                    suffix="Stunden"
                    :disabled="!isScheduleRelated"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel class="my-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1"> Feste Buchungszeiten </span>
                    <br />
                    <span class="text-caption">
                      Feste Buchungszeiten sind nicht über den Kalender buchbar.
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="isTimePeriodRelated" class="ml-2"
                          >Aktiviert</span
                        >
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <v-alert type="info" dense outlined v-if="open">
                        Wenn Buchungen über den Kalender gebucht werden können,
                        können diese nicht feste Buchungszeiten haben.
                      </v-alert>
                      <div v-else>
                        <v-list
                          dense
                          v-if="isTimePeriodRelated && timePeriods.length"
                          color="accent"
                        >
                          <template v-for="(timePeriod, index) in timePeriods">
                            <v-list-item :key="timePeriod.id">
                              <v-row dense align="center">
                                <v-col class="align-center">
                                  <v-list dense color="accent">
                                    <v-list-item
                                      v-for="(
                                        weekday, index
                                      ) in getFormattedWeekdays(
                                        timePeriod.weekdays
                                      )"
                                      :key="index"
                                    >
                                      {{ weekday }}
                                    </v-list-item>
                                  </v-list>
                                </v-col>
                                <v-col
                                  v-if="
                                    timePeriod.startTime && timePeriod.endTime
                                  "
                                >
                                  {{ timePeriod.startTime }} -
                                  {{ timePeriod.endTime }}
                                </v-col>
                                <div v-else>
                                  <v-alert type="warning" dense outlined>
                                    Keine Buchungszeiträume angegeben
                                  </v-alert>
                                </div>
                              </v-row>
                            </v-list-item>
                            <v-divider
                              v-if="index < timePeriods.length - 1"
                              :key="index"
                            ></v-divider>
                          </template>
                        </v-list>
                      </div>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content class="mt-3">
              <v-row>
                <v-col class="col-12 col-md-4">
                  <v-switch
                    dense
                    label="Buchungen nur für feste Zeiträume"
                    hide-details
                    v-model="isTimePeriodRelated"
                    :disabled="isScheduleRelated"
                    class="pt-3"
                  ></v-switch>
                </v-col>
              </v-row>
              <v-row
                v-for="(timePeriod, idx) in timePeriods"
                :key="idx"
                justify="end"
                align="center"
              >
                <v-col class="col-12 col-md-6">
                  <v-select
                    background-color="accent"
                    filled
                    label="Wochentag(e)"
                    :items="weekdays"
                    item-value="id"
                    item-text="name"
                    v-model="timePeriod.weekdays"
                    multiple
                    chips
                    :disabled="!isTimePeriodRelated"
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
                        color="secondary"
                        @click="select"
                        @click:close="removeWeekdays(idx, item.id)"
                      >
                        <strong>{{ item.name }}</strong>
                      </v-chip>
                    </template>
                  </v-select>
                </v-col>
                <v-col>
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
                        v-model="timePeriod.startTime"
                        label="Startzeit"
                        readonly
                        suffix="Uhr"
                        v-bind="attrs"
                        v-on="on"
                        :disabled="!isTimePeriodRelated"
                        hide-details
                      ></v-text-field>
                    </template>
                    <v-time-picker
                      v-if="timeStartMenu[idx]"
                      v-model="timePeriod.startTime"
                      full-width
                      @click:minute="setStartTime(idx, timePeriod.startTime)"
                      format="24hr"
                    ></v-time-picker>
                  </v-menu>
                </v-col>
                <v-col>
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
                        v-model="timePeriod.endTime"
                        label="Endzeit"
                        readonly
                        v-bind="attrs"
                        v-on="on"
                        suffix="Uhr"
                        :disabled="!isTimePeriodRelated"
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
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <v-btn
                      v-on="on"
                      :disabled="!isTimePeriodRelated"
                      icon
                      @click="removeTimePeriod(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Buchungszeit entfernen</span>
                </v-tooltip>
              </v-row>
              <v-row>
                <v-col class="text-center">
                  <v-tooltip bottom offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        class="align-center add-time-period"
                        v-on="on"
                        outlined
                        :disabled="!isTimePeriodRelated"
                        @click="addNewTimePeriod"
                      >
                        Buchungszeit hinzufügen
                      </v-btn>
                    </template>
                    <span>Eine weitere Buchungszeit hinzufügen</span>
                  </v-tooltip>
                </v-col>
              </v-row>
              <v-divider class="mt-5"></v-divider>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel class="my-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1">
                      Wiederkehrende Buchungszeiträume
                    </span>
                    <br />
                    <span class="text-caption">
                      Innerhalb dieser Zeiträume können Buchungen getätigt
                      werden.
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="isOpeningHoursRelated" class="ml-2"
                          >Aktiviert</span
                        >
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-list
                          dense
                          v-if="isOpeningHoursRelated && openingHours.length"
                          color="accent"
                        >
                          <template
                            v-for="(openingHour, index) in openingHours"
                          >
                            <v-list-item :key="openingHour.id">
                              <v-row dense align="center">
                                <v-col class="align-center">
                                  <v-list dense color="accent">
                                    <v-list-item
                                      v-for="(
                                        weekday, index
                                      ) in getFormattedWeekdays(
                                        openingHour.weekdays
                                      )"
                                      :key="index"
                                    >
                                      {{ weekday }}
                                    </v-list-item>
                                  </v-list>
                                </v-col>
                                <v-col
                                  v-if="
                                    openingHour.startTime && openingHour.endTime
                                  "
                                >
                                  {{ openingHour.startTime }} -
                                  {{ openingHour.endTime }}
                                </v-col>
                                <div v-else>
                                  <v-alert type="warning" dense outlined>
                                    Keine Buchungszeiträume angegeben
                                  </v-alert>
                                </div>
                              </v-row>
                            </v-list-item>
                            <v-divider
                              v-if="index < openingHours.length - 1"
                              :key="index"
                            ></v-divider>
                          </template>
                        </v-list>
                      </div>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content class="mt-3">
              <v-row>
                <v-col class="col-12 col-md-4">
                  <v-switch
                    dense
                    label="Buchungsobjekt hat wiederkehrende Buchungszeiträume"
                    hide-details
                    v-model="isOpeningHoursRelated"
                    class="pt-3"
                  ></v-switch>
                </v-col>
              </v-row>
              <v-row
                v-for="(openingHour, idx) in openingHours"
                :key="idx"
                align="center"
              >
                <v-col class="col-12 col-md-6">
                  <v-select
                    background-color="accent"
                    filled
                    label="Wochentag(e)"
                    :items="weekdays"
                    item-value="id"
                    item-text="name"
                    v-model="openingHour.weekdays"
                    multiple
                    chips
                    :disabled="!isOpeningHoursRelated"
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
                        color="secondary"
                        @click="select"
                        @click:close="removeOpeningHoursWeekdays(idx, item.id)"
                      >
                        <strong>{{ item.name }}</strong>
                      </v-chip>
                    </template>
                  </v-select>
                </v-col>
                <v-col>
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
                        v-model="openingHour.startTime"
                        label="Startzeit"
                        readonly
                        suffix="Uhr"
                        v-bind="attrs"
                        v-on="on"
                        :disabled="!isOpeningHoursRelated"
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
                <v-col>
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
                        v-model="openingHour.endTime"
                        label="Endzeit"
                        readonly
                        v-bind="attrs"
                        v-on="on"
                        suffix="Uhr"
                        :disabled="!isOpeningHoursRelated"
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
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <v-btn
                      v-on="on"
                      :disabled="!isOpeningHoursRelated"
                      icon
                      @click="removeOpeningHours(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Buchungszeitraum entfernen</span>
                </v-tooltip>
              </v-row>
              <v-row>
                <v-col class="text-center">
                  <v-tooltip bottom offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        class="align-center add-time-period"
                        v-on="on"
                        outlined
                        :disabled="!isOpeningHoursRelated"
                        @click="addNewOpeningHours"
                      >
                        Buchungszeiträume hinzufügen
                      </v-btn>
                    </template>
                    <span>Buchungszeiträume hinzufügen</span>
                  </v-tooltip>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel class="my-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1">
                      Buchungszeiträume für bestimmte Daten
                    </span>
                    <br />
                    <span class="text-caption">
                      Buchungszeiträume für bestimmte Daten können hier
                      definiert werden.
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="isSpecialOpeningHoursRelated" class="ml-2"
                          >Aktiviert</span
                        >
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <div v-if="open">
                        <v-alert type="info" dense outlined v-if="open">
                          Um das Buchen für einen ganzen Tag zu deaktivieren,
                          wähle den gleichen Start- und Endzeitpunkt aus.
                        </v-alert>
                      </div>
                      <div v-else>
                        <v-list
                          dense
                          v-if="
                            isSpecialOpeningHoursRelated &&
                            specialOpeningHours.length
                          "
                          color="accent"
                        >
                          <template
                            v-for="(
                              specialOpeningHour, index
                            ) in specialOpeningHours"
                          >
                            <v-list-item :key="specialOpeningHour.id">
                              <v-row dense align="center">
                                <v-col class="align-center">
                                  {{ formatDate(specialOpeningHour.date) }}
                                </v-col>
                                <v-col
                                  v-if="
                                    specialOpeningHour.startTime &&
                                    specialOpeningHour.endTime &&
                                    specialOpeningHour.startTime !==
                                      specialOpeningHour.endTime
                                  "
                                >
                                  {{ specialOpeningHour.startTime }} -
                                  {{ specialOpeningHour.endTime }}
                                </v-col>
                                <v-col v-else>
                                  <v-icon color="darkgrey"
                                    >mdi-information</v-icon
                                  >
                                  <span class="ml-2">geschlossen</span>
                                </v-col>
                              </v-row>
                            </v-list-item>
                            <v-divider
                              v-if="index < specialOpeningHours.length - 1"
                              :key="index"
                            ></v-divider>
                          </template>
                        </v-list>
                      </div>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-row>
                <v-col class="col-12 col-md-4">
                  <v-switch
                    dense
                    label="Buchungsobjekt hat feste Buchungszeiträume"
                    hide-details
                    v-model="isSpecialOpeningHoursRelated"
                    class="pt-3"
                  ></v-switch>
                </v-col>
              </v-row>
              <v-row
                v-for="(specialOpeningHour, idx) in specialOpeningHours"
                :key="idx"
                align="center"
              >
                <v-col class="col-12 col-md-6">
                  <v-dialog
                    v-model="specialOpeningHoursDateMenu[idx]"
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="specialOpeningHour.date"
                        label="Datum"
                        prepend-icon="mdi-calendar"
                        background-color="accent"
                        filled
                        hide-details
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-date-picker v-model="specialOpeningHour.date" scrollable>
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="$set(specialOpeningHoursDateMenu, idx, false)"
                      >
                        Cancel
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
                <v-col>
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
                        v-model="specialOpeningHour.startTime"
                        label="Startzeit"
                        readonly
                        suffix="Uhr"
                        v-bind="attrs"
                        v-on="on"
                        :disabled="!isSpecialOpeningHoursRelated"
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
                <v-col>
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
                        v-model="specialOpeningHour.endTime"
                        label="Endzeit"
                        readonly
                        v-bind="attrs"
                        v-on="on"
                        suffix="Uhr"
                        :disabled="!isSpecialOpeningHoursRelated"
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
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <v-btn
                      v-on="on"
                      :disabled="!isSpecialOpeningHoursRelated"
                      icon
                      @click="removeSpecialOpeningHours(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Öffnungszeiten entfernen</span>
                </v-tooltip>
              </v-row>
              <v-row>
                <v-col class="text-center">
                  <v-tooltip bottom offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        class="align-center add-time-period"
                        v-on="on"
                        outlined
                        :disabled="!isSpecialOpeningHoursRelated"
                        @click="addNewSpecialOpeningHours"
                      >
                        Öffnungszeiten hinzufügen
                      </v-btn>
                    </template>
                    <span>Öffnungszeiten hinzufügen</span>
                  </v-tooltip>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel class="my-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1"> Kalenderwochen </span>
                    <br />
                    <span class="text-caption">
                      Buchungen für ganze Kalenderwochen (Montag bis Freitag)
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="isLongRangeWeek" class="ml-2">Aktiviert</span>
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <div v-if="open">
                        <!--<v-alert type="info" dense outlined v-if="open">
                          Um das Buchen für einen ganzen Tag zu deaktivieren,
                          wähle den gleichen Start- und Endzeitpunkt aus.
                        </v-alert>-->
                      </div>
                      <div v-else>
                        <!-- Details -->
                      </div>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-row>
                <v-col class="col-12 col-md-6">
                  <v-switch
                    dense
                    label="Buchungen für ganze Kalenderwochen"
                    hide-details
                    v-model="isLongRangeWeek"
                    class="pt-3"
                  ></v-switch>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel class="my-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1"> Monat </span>
                    <br />
                    <span class="text-caption">
                      Buchungen für ganze Monate
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="isLongRangeMonth" class="ml-2">Aktiviert</span>
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <div v-if="open">
                        <!--<v-alert type="info" dense outlined v-if="open">
                          Um das Buchen für einen ganzen Tag zu deaktivieren,
                          wähle den gleichen Start- und Endzeitpunkt aus.
                        </v-alert>-->
                      </div>
                      <div v-else>
                        <!-- Details -->
                      </div>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-row>
                <v-col class="col-12 col-md-6">
                  <v-switch
                    dense
                    label="Buchungen für ganze Monate"
                    hide-details
                    v-model="isLongRangeMonth"
                    class="pt-3"
                  ></v-switch>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "BookableTimeDependantAttributes",
  props: { bookableType: { type: String, required: true } },
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
      specialOpeningsDate: [],
      timeStartSpecialOpeningHours: [],
      timeEndSpecialOpeningHours: [],
    };
  },
  computed: {
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
            value: {
              type: "week",
            },
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
            value: {
              type: "month",
            },
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
    longRangeOptions: {
      get() {
        return this.$store.state.bookables.form.longRangeOptions;
      },
      set(value) {
        this.updateValue({ field: "longRangeOptions", value: value });
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
    addNewTimePeriod() {
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.timePeriods.push({
        weekdays: null,
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
        weekdays: null,
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
    getFormattedWeekdays(weekdays) {
      let result = [];
      if (weekdays) {
        let weekdaysCopy = weekdays?.slice();
        if (weekdaysCopy?.length > 1) {
          if (this.weekdaysAreContinuous(weekdaysCopy)) {
            weekdaysCopy.sort((a, b) => {
              if (a === 0) {
                return 1;
              }
              if (b === 0) {
                return -1;
              }
              return a - b;
            });
            result.push(
              this.weekdays.find((day) => {
                return day.id === weekdaysCopy[0];
              }).name +
                " - " +
                this.weekdays.find((day) => {
                  return day.id === weekdaysCopy[weekdaysCopy.length - 1];
                }).name
            );
            return result;
          } else {
            weekdaysCopy.forEach((weekday) => {
              result.push(
                this.weekdays.find((day) => {
                  return day.id === weekday;
                }).name
              );
            });
            return result;
          }
        }
        return weekdays.map((weekday) => {
          return this.weekdays.find((day) => {
            return day.id === weekday;
          }).name;
        });
      } else {
        return result;
      }
    },
    weekdaysAreContinuous(weekdays) {
      let isFollowEachOther = true;
      //if weekday is 0 replace with 7 for better sorting
      let weekdaysCopy = weekdays?.slice()?.map((item) => {
        if (item === 0) {
          return 7;
        }
        return item;
      });
      weekdaysCopy.sort((a, b) => a - b);
      if (weekdaysCopy.length > 2) {
        for (let i = 0; i < weekdaysCopy.length - 1; i++) {
          if (weekdaysCopy[i] + 1 !== weekdaysCopy[i + 1]) {
            isFollowEachOther = false;
          }
        }
      } else {
        isFollowEachOther = false;
      }
      return isFollowEachOther;
    },
    formatDate(date) {
      if (typeof date !== "string") {
        return "";
      }

      if (date === null || date === undefined || date === "") {
        return "";
      }

      if (date.split("-").length !== 3) {
        return "";
      }

      let parts = date.split("-");
      const [year, month, day] = parts;
      if (isNaN(Date.parse(`${year}-${month}-${day}`))) {
        return "";
      }

      return parts.reverse().join(".");
    },
  },
};
</script>

<style scoped>
.add-time-period[disabled] {
  opacity: 0.6;
}
.panel {
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.2);
}
.panel-header {
  padding: 13px 13px 13px 13px;
}
</style>
