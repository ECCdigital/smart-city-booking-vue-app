<script>
import BookableEditLeadTime from "@/components/Bookable/Edit/BookableEditLeadTime.vue";
import { v4 as uuidv4 } from "uuid";
import bookableEditing from "@/mixins/bookableEditing";
import {
  bookingModeOf,
  handlesExternalAvailability,
} from "@/utils/bookableFlow";
import { blockPeriodTooShort } from "@/utils/bookableValidation";

/** What `v-model.number` keeps: a number where the input reads as one. */
function toNumber(value) {
  const number = parseFloat(value);
  return Number.isNaN(number) ? value : number;
}

/**
 * The sections of the chosen Buchungsart, in both modes: Buchungsdauer,
 * Feste Zeitfenster or Zeiträume, with Vorlaufzeit and Puffer. The
 * Buchungsart itself is `BookableEditBookingMode`; the frame puts it above.
 * Where a provider handles the availability, nothing shows.
 */
export default {
  name: "BookableEditBookingType",
  components: { BookableEditLeadTime },
  mixins: [bookableEditing],
  data() {
    return {
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
  computed: {
    bookingType() {
      return bookingModeOf(this.bookable);
    },
    external() {
      return handlesExternalAvailability(this.bookable);
    },
    timePeriods() {
      return this.bookable.timePeriods || [];
    },
    blockPeriods() {
      return this.bookable.blockPeriods || [];
    },
  },
  methods: {
    toNumber,
    blockPeriodTooShort,
    updateTimePeriod(index, changes) {
      this.patch({
        timePeriods: this.timePeriods.map((period, i) =>
          i === index ? { ...period, ...changes } : period
        ),
      });
    },
    updateBlockPeriod(index, changes) {
      this.patch({
        blockPeriods: this.blockPeriods.map((period, i) =>
          i === index ? { ...period, ...changes } : period
        ),
      });
    },
    closeMenu(menus, index) {
      this.$set(menus, index, false);
    },
    addNewBlockPeriod() {
      const index = this.blockPeriods.length;
      this.blockTimeStartMenu.push(false);
      this.blockTimeEndMenu.push(false);
      this.patch({
        blockPeriods: [
          ...this.blockPeriods,
          {
            id: uuidv4(),
            label: "",
            startWeekday: null,
            startTime: null,
            endWeekday: null,
            endTime: null,
          },
        ],
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
    removeBlockPeriod(index) {
      this.patch({
        blockPeriods: this.blockPeriods.filter((_, i) => i !== index),
      });
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
      const index = this.timePeriods.length;
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.patch({
        timePeriods: [
          ...this.timePeriods,
          { weekdays: [], startTime: null, endTime: null },
        ],
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
      this.updateTimePeriod(index, {
        weekdays: this.timePeriods[index].weekdays.filter((id) => id !== item),
      });
    },
    removeTimePeriod(index) {
      this.patch({
        timePeriods: this.timePeriods.filter((_, i) => i !== index),
      });
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
  <div v-if="!external">
    <v-card
      id="be-section-bookingType-duration"
      data-field="bookingDuration"
      class="mt-4 section-card"
      v-if="bookingType === 'schedule'"
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-timer-outline</v-icon>
          <span class="text-h6 font-weight-bold">
            {{ $t("bookable.edit.cards.bookingDuration") }}
          </span>
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
              data-test="booking-duration-min"
              :value="bookable.minBookingDuration"
              @input="patch({ minBookingDuration: toNumber($event) })"
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
              data-test="booking-duration-max"
              :value="bookable.maxBookingDuration"
              @input="patch({ maxBookingDuration: toNumber($event) })"
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
      :bookable="bookable"
      :show-buffer="true"
      @update:bookable="$emit('update:bookable', $event)"
    />

    <v-card
      id="be-section-bookingType-time-periods"
      data-field="timePeriods"
      class="mt-4 section-card"
      v-if="bookingType === 'timePeriod'"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-clock-outline</v-icon>
          <span class="text-h6 font-weight-bold">
            {{ $t("bookable.edit.cards.timePeriods") }}
          </span>
        </div>
        <v-btn
          small
          color="primary"
          data-test="time-periods-add"
          @click="addNewTimePeriod"
        >
          <v-icon left small>mdi-plus</v-icon>
          Hinzufügen
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <div v-if="timePeriods.length > 0">
          <v-list two-line class="py-0">
            <template v-for="(timePeriod, index) in timePeriods">
              <v-list-item
                :key="`period-${index}`"
                class="time-period-item elevation-1 mb-3 rounded"
                @click="toggleExpand(index)"
              >
                <v-list-item-avatar>
                  <v-avatar
                    :color="timePeriod.weekdays.length > 0 ? 'primary' : 'grey'"
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
                  <v-list-item-subtitle class="d-flex align-center flex-wrap">
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
                    <v-btn icon small @click.stop="removeTimePeriod(index)">
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
                        :value="timePeriod.weekdays"
                        multiple
                        chips
                        hide-selected
                        hide-details="auto"
                        :rules="fieldRules.weekdays"
                        @change="updateTimePeriod(index, { weekdays: $event })"
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
                            :value="timePeriod.startTime"
                            label="Startzeit *"
                            readonly
                            suffix="Uhr"
                            v-bind="attrs"
                            v-on="on"
                            hide-details="auto"
                            :rules="fieldRules.startTime"
                          ></v-text-field>
                        </template>
                        <v-time-picker
                          v-if="timeStartMenu[index]"
                          :value="timePeriod.startTime"
                          full-width
                          @input="
                            updateTimePeriod(index, { startTime: $event })
                          "
                          @click:minute="closeMenu(timeStartMenu, index)"
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
                            :value="timePeriod.endTime"
                            label="Endzeit *"
                            readonly
                            suffix="Uhr"
                            v-bind="attrs"
                            v-on="on"
                            hide-details="auto"
                            :rules="fieldRules.endTime"
                          ></v-text-field>
                        </template>
                        <v-time-picker
                          v-if="timeEndMenu[index]"
                          :value="timePeriod.endTime"
                          full-width
                          @input="updateTimePeriod(index, { endTime: $event })"
                          @click:minute="closeMenu(timeEndMenu, index)"
                          format="24hr"
                        ></v-time-picker>
                      </v-menu>
                    </v-col>
                  </v-row>
                </v-card>
              </v-expand-transition>

              <v-divider
                v-if="index < timePeriods.length - 1"
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
            Fügen Sie Zeitfenster hinzu, um feste Buchungszeiten zu definieren
          </div>
          <v-btn small text color="primary" @click="addNewTimePeriod">
            <v-icon left small>mdi-plus</v-icon>
            Erstes Zeitfenster hinzufügen
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <BookableEditLeadTime
      v-if="bookingType === 'timePeriod'"
      :bookable="bookable"
      :show-buffer="false"
      @update:bookable="$emit('update:bookable', $event)"
    />

    <v-card
      id="be-section-bookingType-block-periods"
      data-field="blockPeriods"
      class="mt-4 section-card"
      v-if="bookingType === 'blockPeriod'"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-calendar-sync</v-icon>
          <span class="text-h6 font-weight-bold">
            {{ $t("bookable.edit.cards.blockPeriods") }}
          </span>
        </div>
        <v-btn
          small
          color="primary"
          data-test="block-periods-add"
          @click="addNewBlockPeriod"
        >
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
          v-if="blockPeriods.length === 0"
          type="warning"
          dense
          text
          class="mb-4"
        >
          {{ $t("bookable.validation.blockPeriods") }}
        </v-alert>

        <div v-if="blockPeriods.length > 0">
          <v-list two-line class="py-0">
            <template v-for="(blockPeriod, index) in blockPeriods">
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
                  <v-list-item-subtitle class="d-flex align-center flex-wrap">
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
                      data-test="block-period-remove"
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
                        data-test="block-period-label"
                        :value="blockPeriod.label"
                        @input="updateBlockPeriod(index, { label: $event })"
                        hide-details="auto"
                        :rules="fieldRules.label"
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
                        :value="blockPeriod.startWeekday"
                        hide-details="auto"
                        @change="
                          updateBlockPeriod(index, { startWeekday: $event })
                        "
                        :rules="fieldRules.startWeekday"
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
                            :value="blockPeriod.startTime"
                            label="Startzeit *"
                            readonly
                            suffix="Uhr"
                            v-bind="attrs"
                            v-on="on"
                            hide-details="auto"
                            :rules="fieldRules.startTime"
                          />
                        </template>
                        <v-time-picker
                          v-if="blockTimeStartMenu[index]"
                          :value="blockPeriod.startTime"
                          full-width
                          format="24hr"
                          @input="
                            updateBlockPeriod(index, { startTime: $event })
                          "
                          @click:minute="closeMenu(blockTimeStartMenu, index)"
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
                        :value="blockPeriod.endWeekday"
                        hide-details="auto"
                        hint="Ende in derselben Woche, wenn der Tag nach dem Start liegt; sonst in der Folgewoche"
                        persistent-hint
                        @change="
                          updateBlockPeriod(index, { endWeekday: $event })
                        "
                        :rules="fieldRules.endWeekday"
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
                            :value="blockPeriod.endTime"
                            label="Endzeit *"
                            readonly
                            suffix="Uhr"
                            v-bind="attrs"
                            v-on="on"
                            hide-details="auto"
                            :rules="fieldRules.endTime"
                          />
                        </template>
                        <v-time-picker
                          v-if="blockTimeEndMenu[index]"
                          :value="blockPeriod.endTime"
                          full-width
                          format="24hr"
                          @input="updateBlockPeriod(index, { endTime: $event })"
                          @click:minute="closeMenu(blockTimeEndMenu, index)"
                        />
                      </v-menu>
                    </v-col>
                  </v-row>

                  <v-row v-if="blockPeriodTooShort(blockPeriod)">
                    <v-col cols="12">
                      <div class="text-caption error--text">
                        {{ $t("bookable.validation.blockPeriodDuration") }}
                      </div>
                    </v-col>
                  </v-row>
                </v-card>
              </v-expand-transition>

              <v-divider
                v-if="index < blockPeriods.length - 1"
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
            Fügen Sie Zeiträume hinzu, um wiederkehrende Buchungsfenster zu
            definieren
          </div>
          <v-btn small text color="primary" @click="addNewBlockPeriod">
            <v-icon left small>mdi-plus</v-icon>
            Ersten Zeitraum hinzufügen
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <BookableEditLeadTime
      v-if="bookingType === 'blockPeriod'"
      :bookable="bookable"
      :show-buffer="false"
      @update:bookable="$emit('update:bookable', $event)"
    />
  </div>
</template>

<style scoped>
.time-period-item {
  cursor: pointer;
  transition: all var(--scb-motion-base);
}

.theme--dark .time-period-item {
  background-color: var(--scb-surface-tint);
}

.time-period-card {
  border-radius: var(--scb-radius-surface) !important;
}
</style>
