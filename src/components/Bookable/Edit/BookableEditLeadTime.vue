<script>
import {
  formatPreparationDuration,
  hasBufferConfig,
  normalizeLeadTimeFields,
} from "@/utils/bookingLeadTime";

const WEEKDAYS = [
  { id: 1, name: "Montag", short: "Mo" },
  { id: 2, name: "Dienstag", short: "Di" },
  { id: 3, name: "Mittwoch", short: "Mi" },
  { id: 4, name: "Donnerstag", short: "Do" },
  { id: 5, name: "Freitag", short: "Fr" },
  { id: 6, name: "Samstag", short: "Sa" },
  { id: 0, name: "Sonntag", short: "So" },
];

const PRESET_MINUTES = [
  { label: "30 Min.", value: 30 },
  { label: "1 Std.", value: 60 },
  { label: "2 Std.", value: 120 },
  { label: "4 Std.", value: 240 },
];

const BUFFER_PRESET_MINUTES = [
  { label: "Keiner", value: 0 },
  { label: "15 Min.", value: 15 },
  { label: "30 Min.", value: 30 },
];

export default {
  name: "BookableEditLeadTime",
  props: {
    bookable: { type: Object, required: true },
    showBuffer: { type: Boolean, default: true },
  },
  data() {
    return {
      valid: true,
      weekdays: WEEKDAYS,
      presets: PRESET_MINUTES,
      bufferPresets: BUFFER_PRESET_MINUTES,
      timeStartMenu: [],
      timeEndMenu: [],
      expandedItems: [],
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
    preparationDurationLabel() {
      return formatPreparationDuration(this.model.preparationLeadTimeMinutes);
    },
    hasServiceHours() {
      return (
        Array.isArray(this.model.serviceHours) && this.model.serviceHours.length > 0
      );
    },
    leadTimeEnabled() {
      return !!this.model.isLeadTimeRelated;
    },
    bufferSwitchEnabled() {
      return !!this.model.isBufferRelated;
    },
  },
  created() {
    this.applyLeadTimeStateFromModel();
    this.timeStartMenu = this.model.serviceHours.map(() => false);
    this.timeEndMenu = this.model.serviceHours.map(() => false);
  },
  watch: {
    bookable(newBookable, oldBookable) {
      if (newBookable !== oldBookable) {
        this.applyLeadTimeStateFromModel();
        this.syncTimeMenus();
      }
    },
  },
  methods: {
    applyLeadTimeStateFromModel() {
      normalizeLeadTimeFields(this.model);
      this.$set(this.model, "isLeadTimeRelated", this.model.isLeadTimeRelated);
      this.$set(this.model, "isBufferRelated", this.model.isBufferRelated);
    },
    syncTimeMenus() {
      const length = this.model.serviceHours?.length || 0;
      if (
        this.timeStartMenu.length !== length ||
        this.timeEndMenu.length !== length
      ) {
        this.timeStartMenu = Array.from({ length }, () => false);
        this.timeEndMenu = Array.from({ length }, () => false);
      }
    },
    setLeadTimeEnabled(enabled) {
      const wasEnabled = this.leadTimeEnabled;
      this.$set(this.model, "isLeadTimeRelated", enabled);
      if (enabled) {
        const minutes = Number(this.model.preparationLeadTimeMinutes);
        if (!wasEnabled && (!Number.isFinite(minutes) || minutes <= 0)) {
          this.model.preparationLeadTimeMinutes = 120;
        }
        if (!Array.isArray(this.model.serviceHours)) {
          this.$set(this.model, "serviceHours", []);
        }
        if (this.model.serviceHours.length === 0) {
          this.addServiceHours();
        }
      } else {
        this.model.preparationLeadTimeMinutes = 0;
      }
      this.emitUpdate();
    },
    setBufferEnabled(enabled) {
      const wasEnabled = this.bufferSwitchEnabled;
      this.$set(this.model, "isBufferRelated", enabled);
      if (enabled) {
        if (!wasEnabled && !hasBufferConfig(this.model)) {
          this.model.bufferTimeAfterMinutes = 30;
        }
      } else {
        this.model.bufferTimeBeforeMinutes = null;
        this.model.bufferTimeAfterMinutes = null;
      }
      this.emitUpdate();
    },
    emitUpdate() {
      this.$emit("update:bookable", { ...this.model });
    },
    applyPreset(minutes) {
      this.model.preparationLeadTimeMinutes = minutes;
      this.emitUpdate();
    },
    displayBufferMinutes(value) {
      return value == null || value === "" ? "" : value;
    },
    setBufferMinutes(field, value) {
      if (value === "" || value == null) {
        this.model[field] = null;
      } else {
        const minutes = Number(value);
        this.model[field] =
          Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : null;
      }
      this.emitUpdate();
    },
    applyBufferPreset(field, minutes) {
      this.model[field] = minutes > 0 ? minutes : null;
      this.emitUpdate();
    },
    isBufferMinutesValid(value) {
      if (value == null || value === "") {
        return true;
      }
      const minutes = Number(value);
      return Number.isFinite(minutes) && minutes >= 0 && Number.isInteger(minutes);
    },
    bufferPresetActive(field, minutes) {
      const current = Number(this.model[field]) || 0;
      return current === minutes;
    },
    addServiceHours() {
      const index = this.model.serviceHours.length;
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.model.serviceHours.push({
        weekdays: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "18:00",
      });
      this.expandedItems.push(index);
      this.emitUpdate();
    },
    removeServiceHours(index) {
      this.model.serviceHours.splice(index, 1);
      this.timeStartMenu.splice(index, 1);
      this.timeEndMenu.splice(index, 1);
      this.expandedItems = this.expandedItems
        .filter((expandedIndex) => expandedIndex !== index)
        .map((expandedIndex) =>
          expandedIndex > index ? expandedIndex - 1 : expandedIndex
        );
      this.emitUpdate();
    },
    removeWeekdays(index, weekdayId) {
      const weekdays = this.model.serviceHours[index].weekdays;
      weekdays.splice(weekdays.indexOf(weekdayId), 1);
      this.emitUpdate();
    },
    setStartTime(index, time) {
      this.model.serviceHours[index].startTime = time;
      this.timeStartMenu[index] = false;
      this.emitUpdate();
    },
    setEndTime(index, time) {
      this.model.serviceHours[index].endTime = time;
      this.timeEndMenu[index] = false;
      this.emitUpdate();
    },
    getWeekdayName(id) {
      const day = this.weekdays.find((entry) => entry.id === Number(id));
      return day ? day.short : "";
    },
    getWeekdayNamesFormatted(weekdayIds) {
      if (!weekdayIds?.length) {
        return "";
      }
      return weekdayIds
        .map((id) => this.getWeekdayName(id))
        .filter(Boolean)
        .join(", ");
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
    async validate() {
      const formValid = this.$refs.form ? this.$refs.form.validate() : true;
      if (!formValid) {
        return false;
      }

      const leadTimeValid =
        !this.model.isLeadTimeRelated ||
        (this.isPreparationMinutesValid() &&
          this.model.serviceHours.length > 0 &&
          this.model.serviceHours.every(
            (entry) =>
              entry.weekdays?.length > 0 && entry.startTime && entry.endTime
          ));

      const bufferValid =
        !this.showBuffer ||
        !this.model.isBufferRelated ||
        (this.isBufferMinutesValid(this.model.bufferTimeBeforeMinutes) &&
          this.isBufferMinutesValid(this.model.bufferTimeAfterMinutes) &&
          hasBufferConfig(this.model));

      return leadTimeValid && bufferValid;
    },
    isPreparationMinutesValid() {
      const minutes = Number(this.model.preparationLeadTimeMinutes);
      return !Number.isNaN(minutes) && minutes >= 0;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <v-card class="mt-4 section-card" elevation="2" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-timer-sand</v-icon>
        <span class="text-h6 font-weight-bold">Vorlaufzeit</span>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <v-switch
          :input-value="leadTimeEnabled"
          color="primary"
          hide-details
          class="mt-0"
          @change="setLeadTimeEnabled"
        >
          <template v-slot:label>
            <div>
              <div class="font-weight-medium">Vorlaufzeit aktivieren</div>
              <div class="text-caption text--secondary">
                Kurzfristige Buchungen verhindern (z. B. Schlüsselübergabe,
                Raumvorbereitung)
              </div>
            </div>
          </template>
        </v-switch>

        <template v-if="leadTimeEnabled">
          <v-divider class="my-4" />

          <v-alert color="info" dense text class="mb-4">
            <v-icon class="mr-2" color="info" small>
              mdi-information-outline
            </v-icon>
            Die Vorbereitungszeit muss vollständig innerhalb der
            Servicezeiten liegen – z. B. Freitag 18:00 → Montag 08:00 ist mit
            2 Std. Vorbereitung nicht möglich.
          </v-alert>

          <div class="text-subtitle-2 mb-2">Vorbereitungszeit</div>
          <v-row dense>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Dauer"
                type="number"
                min="0"
                suffix="Minuten"
                v-model.number="model.preparationLeadTimeMinutes"
                :hint="
                  preparationDurationLabel
                    ? `Entspricht ${preparationDurationLabel}`
                    : ''
                "
                persistent-hint
                hide-details="auto"
                :rules="[
                  (v) =>
                    (v !== '' &&
                      v != null &&
                      !Number.isNaN(Number(v)) &&
                      Number(v) >= 0) ||
                    'Gültige Dauer erforderlich',
                ]"
                @input="emitUpdate"
              />
            </v-col>
            <v-col cols="12" sm="6" md="8" class="d-flex align-center flex-wrap">
              <span class="text-caption text--secondary mr-2">Schnellauswahl:</span>
              <v-chip
                v-for="preset in presets"
                :key="preset.value"
                small
                class="mr-1 mb-1"
                :color="
                  model.preparationLeadTimeMinutes === preset.value
                    ? 'primary'
                    : undefined
                "
                :outlined="model.preparationLeadTimeMinutes !== preset.value"
                @click="applyPreset(preset.value)"
              >
                {{ preset.label }}
              </v-chip>
            </v-col>
          </v-row>

          <div class="d-flex align-center justify-space-between mt-4 mb-2">
            <div>
              <div class="text-subtitle-2">Servicezeiten</div>
              <div class="text-caption text--secondary">
                Wann die Vorbereitung stattfinden kann (unabhängig von
                Öffnungszeiten)
              </div>
            </div>
            <v-btn small color="primary" @click="addServiceHours">
              <v-icon left small>mdi-plus</v-icon>
              Hinzufügen
            </v-btn>
          </div>

          <div v-if="hasServiceHours">
            <v-list two-line class="py-0">
              <template v-for="(entry, index) in model.serviceHours">
                <v-list-item
                  :key="`service-hours-${index}`"
                  class="service-hours-item elevation-1 mb-3 rounded"
                  @click="toggleExpand(index)"
                >
                  <v-list-item-avatar>
                    <v-avatar
                      :color="entry.weekdays.length > 0 ? 'primary' : 'grey'"
                      size="40"
                    >
                      <v-icon dark small>mdi-clock-check-outline</v-icon>
                    </v-avatar>
                  </v-list-item-avatar>

                  <v-list-item-content>
                    <v-list-item-title class="font-weight-medium">
                      {{
                        getWeekdayNamesFormatted(entry.weekdays) ||
                        "Keine Tage gewählt"
                      }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                      <span v-if="entry.startTime && entry.endTime">
                        {{ entry.startTime }} – {{ entry.endTime }} Uhr
                      </span>
                      <span v-else class="grey--text">Zeit nicht gesetzt</span>
                    </v-list-item-subtitle>
                  </v-list-item-content>

                  <v-list-item-action>
                    <div class="d-flex align-center">
                      <v-btn
                        icon
                        small
                        @click.stop="removeServiceHours(index)"
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

                <v-expand-transition :key="`service-hours-expand-${index}`">
                  <v-card
                    v-show="isExpanded(index)"
                    flat
                    class="mx-3 mb-3 pa-4 service-hours-card"
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
                          v-model="entry.weekdays"
                          multiple
                          chips
                          hide-selected
                          hide-details="auto"
                          :rules="[
                            (v) =>
                              (v && v.length > 0) ||
                              'Mindestens ein Wochentag erforderlich',
                          ]"
                          @change="emitUpdate"
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
                              v-model="entry.startTime"
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
                            v-if="timeStartMenu[index]"
                            v-model="entry.startTime"
                            full-width
                            format="24hr"
                            @click:minute="setStartTime(index, entry.startTime)"
                          />
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
                              v-model="entry.endTime"
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
                            v-if="timeEndMenu[index]"
                            v-model="entry.endTime"
                            full-width
                            format="24hr"
                            @click:minute="setEndTime(index, entry.endTime)"
                          />
                        </v-menu>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-expand-transition>
              </template>
            </v-list>
          </div>

          <div v-else class="text-center py-6">
            <div class="text-body-2 grey--text mb-3">
              Mindestens ein Servicezeiten-Fenster ist erforderlich.
            </div>
            <v-btn small text color="primary" @click="addServiceHours">
              <v-icon left small>mdi-plus</v-icon>
              Servicezeiten hinzufügen
            </v-btn>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <v-card v-if="showBuffer" class="mt-4 section-card" elevation="2" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-calendar-clock</v-icon>
        <span class="text-h6 font-weight-bold">Puffer zwischen Buchungen</span>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <v-switch
          :input-value="bufferSwitchEnabled"
          color="primary"
          hide-details
          class="mt-0"
          @change="setBufferEnabled"
        >
          <template v-slot:label>
            <div>
              <div class="font-weight-medium">
                Puffer zwischen Buchungen aktivieren
              </div>
              <div class="text-caption text--secondary">
                Mindestabstand vor und nach bestehenden Buchungen (z. B.
                Reinigung, Umräumen)
              </div>
            </div>
          </template>
        </v-switch>

        <template v-if="bufferSwitchEnabled">
          <v-divider class="my-4" />

          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Vor der Buchung</div>
              <div class="text-caption text--secondary mb-2">
                Zeit, die vor dem Terminbeginn blockiert wird
              </div>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Dauer"
                type="number"
                min="0"
                suffix="Minuten"
                :value="displayBufferMinutes(model.bufferTimeBeforeMinutes)"
                hide-details="auto"
                :rules="[
                  (v) =>
                    isBufferMinutesValid(v) ||
                    'Gültige Dauer erforderlich (0 oder positive Ganzzahl)',
                ]"
                @input="setBufferMinutes('bufferTimeBeforeMinutes', $event)"
              />
              <div class="d-flex flex-wrap mt-2">
                <span class="text-caption text--secondary mr-2">Schnellauswahl:</span>
                <v-chip
                  v-for="preset in bufferPresets"
                  :key="`before-${preset.value}`"
                  x-small
                  class="mr-1 mb-1"
                  :color="
                    bufferPresetActive('bufferTimeBeforeMinutes', preset.value)
                      ? 'primary'
                      : undefined
                  "
                  :outlined="
                    !bufferPresetActive('bufferTimeBeforeMinutes', preset.value)
                  "
                  @click="applyBufferPreset('bufferTimeBeforeMinutes', preset.value)"
                >
                  {{ preset.label }}
                </v-chip>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Nach der Buchung</div>
              <div class="text-caption text--secondary mb-2">
                Zeit, die nach dem Terminende blockiert wird
              </div>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Dauer"
                type="number"
                min="0"
                suffix="Minuten"
                :value="displayBufferMinutes(model.bufferTimeAfterMinutes)"
                hide-details="auto"
                :rules="[
                  (v) =>
                    isBufferMinutesValid(v) ||
                    'Gültige Dauer erforderlich (0 oder positive Ganzzahl)',
                ]"
                @input="setBufferMinutes('bufferTimeAfterMinutes', $event)"
              />
              <div class="d-flex flex-wrap mt-2">
                <span class="text-caption text--secondary mr-2">Schnellauswahl:</span>
                <v-chip
                  v-for="preset in bufferPresets"
                  :key="`after-${preset.value}`"
                  x-small
                  class="mr-1 mb-1"
                  :color="
                    bufferPresetActive('bufferTimeAfterMinutes', preset.value)
                      ? 'primary'
                      : undefined
                  "
                  :outlined="
                    !bufferPresetActive('bufferTimeAfterMinutes', preset.value)
                  "
                  @click="applyBufferPreset('bufferTimeAfterMinutes', preset.value)"
                >
                  {{ preset.label }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
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

.service-hours-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme--dark .service-hours-item {
  background-color: rgba(255, 255, 255, 0.05);
}

.service-hours-card {
  border-radius: 8px !important;
}
</style>
