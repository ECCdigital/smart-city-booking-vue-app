<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import bookableEditing from "@/mixins/bookableEditing";
import { bookingModeNameKey } from "@/utils/bookableEditSections";
import { weekdayItems } from "@/utils/bookableWeekdays";

export default {
  name: "BookableEditOpeningHours",
  components: { BaseSection },
  mixins: [bookableEditing],
  props: {
    // Inside the guided flow, which titles the step itself.
    embedded: { type: Boolean, default: false },
  },

  data() {
    return {
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
    weekdays() {
      return weekdayItems((key) => this.$t(key));
    },
    openingHours() {
      return this.bookable.openingHours || [];
    },
    specialOpeningHours() {
      return this.bookable.specialOpeningHours || [];
    },
    bookingType() {
      if (this.bookable.isScheduleRelated) return "schedule";
      if (this.bookable.isTimePeriodRelated) return "timePeriod";
      if (this.bookable.isBlockPeriodRelated) return "blockPeriod";
      if (this.bookable.isLongRange) return this.bookable.longRangeOptions.type;
      return "independent";
    },
    hasOpeningHours() {
      return this.openingHours.length > 0;
    },
    hasSpecialOpeningHours() {
      return this.specialOpeningHours.length > 0;
    },
  },
  methods: {
    bookingModeNameKey,
    updateOpeningHours(index, changes) {
      this.patch({
        openingHours: this.openingHours.map((entry, i) =>
          i === index ? { ...entry, ...changes } : entry
        ),
      });
    },
    updateSpecialOpeningHours(index, changes) {
      this.patch({
        specialOpeningHours: this.specialOpeningHours.map((entry, i) =>
          i === index ? { ...entry, ...changes } : entry
        ),
      });
    },
    closeMenu(menus, index) {
      this.$set(menus, index, false);
    },
    removeOpeningHoursWeekdays(index, item) {
      this.updateOpeningHours(index, {
        weekdays: this.openingHours[index].weekdays.filter((id) => id !== item),
      });
    },
    removeOpeningHours(index) {
      this.patch({
        openingHours: this.openingHours.filter((_, i) => i !== index),
      });
      this.timeStartOpeningHoursMenu.splice(index, 1);
      this.timeEndOpeningHoursMenu.splice(index, 1);
      const idx = this.expandedItemsOpeningHours.indexOf(index);
      if (idx > -1) this.expandedItemsOpeningHours.splice(idx, 1);
    },
    addNewOpeningHours() {
      const index = this.openingHours.length;
      this.timeStartOpeningHoursMenu.push(false);
      this.timeEndOpeningHoursMenu.push(false);
      this.patch({
        openingHours: [
          ...this.openingHours,
          { weekdays: [], startTime: null, endTime: null },
        ],
      });
      this.expandedItemsOpeningHours.push(index);
    },
    addNewSpecialOpeningHours() {
      const index = this.specialOpeningHours.length;
      this.timeStartSpecialOpeningHoursMenu.push(false);
      this.timeEndSpecialOpeningMenu.push(false);
      this.specialOpeningHoursDateMenu.push(false);
      this.patch({
        specialOpeningHours: [
          ...this.specialOpeningHours,
          { date: null, startTime: null, endTime: null },
        ],
      });
      this.expandedItemsSpecialHours.push(index);
    },
    removeSpecialOpeningHours(index) {
      this.patch({
        specialOpeningHours: this.specialOpeningHours.filter(
          (_, i) => i !== index
        ),
      });
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
  <div>
    <BaseSection
      v-if="!embedded"
      :title="$t('bookable.edit.cards.openingHours')"
      icon="mdi-clock-outline"
    />

    <div v-if="bookingType === 'schedule' || bookingType === 'timePeriod'">
      <!-- Regular Opening Hours -->
      <v-card
        id="be-section-openingHours-regular"
        data-field="openingHours"
        class="mb-6 section-card"
        outlined
      >
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-store-clock-outline</v-icon>
            <span class="text-h6 font-weight-bold">
              {{ $t("bookable.edit.cards.openingHours") }}
            </span>
          </div>
          <v-btn
            v-if="bookable.isOpeningHoursRelated"
            small
            color="primary"
            data-test="opening-hours-add"
            @click="addNewOpeningHours"
          >
            <v-icon left small>mdi-plus</v-icon>
            {{ $t("bookable.edit.common.add") }}
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12">
              <v-switch
                data-test="opening-hours-switch"
                :input-value="bookable.isOpeningHoursRelated"
                @change="patch({ isOpeningHoursRelated: !!$event })"
                hide-details
                color="primary"
                class="mt-0"
              >
                <template v-slot:label>
                  <div>
                    <div class="font-weight-medium">
                      {{ $t("bookable.edit.openingHours.switch") }}
                    </div>
                    <div class="text-caption text--secondary">
                      {{ $t("bookable.edit.openingHours.switch-hint") }}
                    </div>
                  </div>
                </template>
              </v-switch>
            </v-col>
          </v-row>

          <template v-if="bookable.isOpeningHoursRelated">
            <v-divider class="my-4"></v-divider>

            <v-alert color="info" dense text class="mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-3" color="info"> mdi-calendar-alert </v-icon>
                <div v-html="$t('bookable.edit.openingHours.info')" />
              </div>
            </v-alert>

            <div v-if="hasOpeningHours">
              <v-list two-line class="py-0">
                <template v-for="(openingHour, idx) in openingHours">
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
                            $t("bookable.edit.common.no-days")
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
                          {{
                            $t("bookable.edit.common.time-range", {
                              start: openingHour.startTime,
                              end: openingHour.endTime,
                            })
                          }}
                        </span>
                        <span v-else class="grey--text">{{
                          $t("bookable.edit.common.no-time")
                        }}</span>
                      </v-list-item-subtitle>
                    </v-list-item-content>

                    <v-list-item-action>
                      <div class="d-flex align-center">
                        <v-btn
                          icon
                          small
                          data-test="opening-hours-remove"
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
                            :label="$t('bookable.edit.common.weekdays')"
                            :items="weekdays"
                            item-value="id"
                            item-text="name"
                            :value="openingHour.weekdays"
                            @change="
                              updateOpeningHours(idx, { weekdays: $event })
                            "
                            multiple
                            chips
                            hide-selected
                            hide-details="auto"
                            :rules="fieldRules.weekdays"
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
                                :value="openingHour.startTime"
                                :label="$t('bookable.edit.common.from')"
                                readonly
                                :suffix="$t('bookable.edit.common.clock')"
                                v-bind="attrs"
                                v-on="on"
                                hide-details="auto"
                                :rules="fieldRules.startTime"
                              ></v-text-field>
                            </template>
                            <v-time-picker
                              v-if="timeStartOpeningHoursMenu[idx]"
                              :value="openingHour.startTime"
                              full-width
                              @input="
                                updateOpeningHours(idx, { startTime: $event })
                              "
                              @click:minute="
                                closeMenu(timeStartOpeningHoursMenu, idx)
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
                                :value="openingHour.endTime"
                                :label="$t('bookable.edit.common.to')"
                                readonly
                                :suffix="$t('bookable.edit.common.clock')"
                                v-bind="attrs"
                                v-on="on"
                                hide-details="auto"
                                :rules="fieldRules.endTime"
                              ></v-text-field>
                            </template>
                            <v-time-picker
                              v-if="timeEndOpeningHoursMenu[idx]"
                              :value="openingHour.endTime"
                              full-width
                              @input="
                                updateOpeningHours(idx, { endTime: $event })
                              "
                              @click:minute="
                                closeMenu(timeEndOpeningHoursMenu, idx)
                              "
                              format="24hr"
                            ></v-time-picker>
                          </v-menu>
                        </v-col>
                      </v-row>
                    </v-card>
                  </v-expand-transition>

                  <v-divider
                    v-if="idx < openingHours.length - 1"
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
                {{ $t("bookable.edit.openingHours.empty") }}
              </div>
              <div class="text-body-2 grey--text text--darken-1 mb-4">
                {{ $t("bookable.edit.openingHours.empty-hint") }}
              </div>
              <v-btn small text color="primary" @click="addNewOpeningHours">
                <v-icon left small>mdi-plus</v-icon>
                {{ $t("bookable.edit.openingHours.add-first") }}
              </v-btn>
            </div>
          </template>
        </v-card-text>
      </v-card>

      <!-- Special Opening Hours -->
      <v-card
        v-if="expertOptionShown('specialOpeningHours')"
        id="be-section-openingHours-special"
        data-field="specialOpeningHours"
        class="mb-6 section-card"
        outlined
      >
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-calendar-star</v-icon>
            <span class="text-h6 font-weight-bold">
              {{ $t("bookable.edit.cards.specialOpeningHours") }}
            </span>
          </div>
          <v-btn
            v-if="bookable.isSpecialOpeningHoursRelated"
            small
            color="primary"
            data-test="special-opening-hours-add"
            @click="addNewSpecialOpeningHours"
          >
            <v-icon left small>mdi-plus</v-icon>
            {{ $t("bookable.edit.common.add") }}
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12">
              <v-switch
                data-test="special-opening-hours-switch"
                :input-value="bookable.isSpecialOpeningHoursRelated"
                @change="patch({ isSpecialOpeningHoursRelated: !!$event })"
                hide-details
                color="primary"
                class="mt-0"
              >
                <template v-slot:label>
                  <div>
                    <div class="font-weight-medium">
                      {{ $t("bookable.edit.specialOpeningHours.switch") }}
                    </div>
                    <div class="text-caption text--secondary">
                      {{ $t("bookable.edit.specialOpeningHours.switch-hint") }}
                    </div>
                  </div>
                </template>
              </v-switch>
            </v-col>
          </v-row>

          <template v-if="bookable.isSpecialOpeningHoursRelated">
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
                <div v-html="$t('bookable.edit.specialOpeningHours.info')" />
              </div>
            </v-alert>

            <div v-if="hasSpecialOpeningHours">
              <v-list two-line class="py-0">
                <template
                  v-for="(specialOpeningHour, idx) in specialOpeningHours"
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
                            formatDate(specialOpeningHour.date) ||
                            $t("bookable.edit.specialOpeningHours.no-date")
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
                          {{
                            $t("bookable.edit.common.time-range", {
                              start: specialOpeningHour.startTime,
                              end: specialOpeningHour.endTime,
                            })
                          }}
                        </span>
                        <span v-else class="grey--text">{{
                          $t("bookable.edit.common.no-time")
                        }}</span>
                      </v-list-item-subtitle>
                    </v-list-item-content>

                    <v-list-item-action>
                      <div class="d-flex align-center">
                        <v-btn
                          icon
                          small
                          data-test="special-opening-hours-remove"
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
                                :value="specialOpeningHour.date"
                                :label="$t('bookable.edit.common.date')"
                                prepend-inner-icon="mdi-calendar"
                                background-color="accent"
                                filled
                                hide-details="auto"
                                readonly
                                v-bind="attrs"
                                v-on="on"
                                :rules="fieldRules.date"
                              ></v-text-field>
                            </template>
                            <v-date-picker
                              :value="specialOpeningHour.date"
                              @input="
                                updateSpecialOpeningHours(idx, { date: $event })
                              "
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
                                {{ $t("bookable.edit.common.cancel") }}
                              </v-btn>
                              <v-btn
                                text
                                color="primary"
                                @click="
                                  $set(specialOpeningHoursDateMenu, idx, false)
                                "
                              >
                                {{ $t("bookable.edit.common.ok") }}
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
                                :value="specialOpeningHour.startTime"
                                :label="$t('bookable.edit.common.from')"
                                readonly
                                :suffix="$t('bookable.edit.common.clock')"
                                v-bind="attrs"
                                v-on="on"
                                hide-details="auto"
                                :rules="fieldRules.startTime"
                              ></v-text-field>
                            </template>
                            <v-time-picker
                              v-if="timeStartSpecialOpeningHoursMenu[idx]"
                              :value="specialOpeningHour.startTime"
                              full-width
                              @input="
                                updateSpecialOpeningHours(idx, {
                                  startTime: $event,
                                })
                              "
                              @click:minute="
                                closeMenu(timeStartSpecialOpeningHoursMenu, idx)
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
                                :value="specialOpeningHour.endTime"
                                :label="$t('bookable.edit.common.to')"
                                readonly
                                :suffix="$t('bookable.edit.common.clock')"
                                v-bind="attrs"
                                v-on="on"
                                hide-details="auto"
                                :rules="fieldRules.endTime"
                              ></v-text-field>
                            </template>
                            <v-time-picker
                              v-if="timeEndSpecialOpeningMenu[idx]"
                              :value="specialOpeningHour.endTime"
                              full-width
                              @input="
                                updateSpecialOpeningHours(idx, {
                                  endTime: $event,
                                })
                              "
                              @click:minute="
                                closeMenu(timeEndSpecialOpeningMenu, idx)
                              "
                              format="24hr"
                            ></v-time-picker>
                          </v-menu>
                        </v-col>
                      </v-row>
                    </v-card>
                  </v-expand-transition>

                  <v-divider
                    v-if="idx < specialOpeningHours.length - 1"
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
                {{ $t("bookable.edit.specialOpeningHours.empty") }}
              </div>
              <div class="text-body-2 grey--text text--darken-1 mb-4">
                {{ $t("bookable.edit.specialOpeningHours.empty-hint") }}
              </div>
              <v-btn
                small
                text
                color="primary"
                @click="addNewSpecialOpeningHours"
              >
                <v-icon left small>mdi-plus</v-icon>
                {{ $t("bookable.edit.specialOpeningHours.add-first") }}
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
        {{ $t("bookable.edit.openingHours.unavailable") }}
      </div>
      <div class="text-body-2 grey--text text--darken-1">
        {{
          $t("bookable.edit.openingHours.unavailable-hint", {
            schedule: $t("bookable.flow.availability.modes.schedule"),
            timePeriod: $t("bookable.flow.availability.modes.timePeriod"),
          })
        }}
      </div>
      <v-chip small class="mt-4" color="grey lighten-3">
        {{
          $t("bookable.edit.common.label-value", {
            label: $t("bookable.edit.sections.bookingTypeSelect"),
            value: $t(bookingModeNameKey(bookable)),
          })
        }}
      </v-chip>
    </div>
  </div>
</template>

<style scoped>
.opening-hours-item,
.special-hours-item {
  cursor: pointer;
  transition: all var(--scb-motion-base);
}

.theme--dark .opening-hours-item,
.theme--dark .special-hours-item {
  background-color: var(--scb-surface-tint);
}

.opening-hours-card,
.special-hours-card {
  border-radius: var(--scb-radius-surface) !important;
}
</style>
