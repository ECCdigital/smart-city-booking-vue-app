<script>
import { hasBufferConfig } from "@/utils/bookingLeadTime";
import bookableEditing from "@/mixins/bookableEditing";
import { closeMenu } from "@/utils/timeMenus";
import { weekdayItems } from "@/utils/bookableWeekdays";

const PRESET_MINUTES = [30, 60, 120, 240];

const BUFFER_PRESET_MINUTES = [0, 15, 30];

const VALUES = "bookable.flow.overview.values";

export default {
  name: "BookableEditLeadTime",
  mixins: [bookableEditing],
  props: {
    showBuffer: { type: Boolean, default: true },
  },
  data() {
    return {
      timeStartMenu: [],
      timeEndMenu: [],
      expandedItems: [],
    };
  },
  computed: {
    weekdays() {
      return weekdayItems((key) => this.$t(key));
    },
    // The quick picks, named as the overview names a duration.
    presets() {
      return PRESET_MINUTES.map((value) => ({
        value,
        label: this.durationLabel(value),
      }));
    },
    bufferPresets() {
      return BUFFER_PRESET_MINUTES.map((value) => ({
        value,
        label: value
          ? this.durationLabel(value)
          : this.$t("bookable.edit.buffer.none"),
      }));
    },
    preparationDurationLabel() {
      const minutes = Number(this.bookable.preparationLeadTimeMinutes);
      return minutes > 0 ? this.durationLabel(minutes) : "";
    },
    serviceHours() {
      return Array.isArray(this.bookable.serviceHours)
        ? this.bookable.serviceHours
        : [];
    },
    hasServiceHours() {
      return this.serviceHours.length > 0;
    },
    leadTimeEnabled() {
      return !!this.bookable.isLeadTimeRelated;
    },
    bufferSwitchEnabled() {
      return !!this.bookable.isBufferRelated;
    },
  },
  methods: {
    /** Minutes as „1 Std. 30 Min.“, in the overview's words. */
    durationLabel(minutes) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return [
        hours > 0 ? this.$tc(`${VALUES}.hours`, hours) : "",
        rest > 0 || hours === 0 ? this.$tc(`${VALUES}.minutes`, rest) : "",
      ]
        .filter(Boolean)
        .join(" ");
    },
    setLeadTimeEnabled(enabled) {
      if (!enabled) {
        this.patch({ isLeadTimeRelated: false, preparationLeadTimeMinutes: 0 });
        return;
      }
      const changes = { isLeadTimeRelated: true };
      const minutes = Number(this.bookable.preparationLeadTimeMinutes);
      if (
        !this.leadTimeEnabled &&
        (!Number.isFinite(minutes) || minutes <= 0)
      ) {
        changes.preparationLeadTimeMinutes = 120;
      }
      if (!this.hasServiceHours) {
        changes.serviceHours = [this.newServiceHours()];
        this.expandedItems.push(0);
      }
      this.patch(changes);
    },
    setBufferEnabled(enabled) {
      if (!enabled) {
        this.patch({
          isBufferRelated: false,
          bufferTimeBeforeMinutes: null,
          bufferTimeAfterMinutes: null,
        });
        return;
      }
      const changes = { isBufferRelated: true };
      if (!this.bufferSwitchEnabled && !hasBufferConfig(this.bookable)) {
        changes.bufferTimeAfterMinutes = 30;
      }
      this.patch(changes);
    },
    setPreparationMinutes(value) {
      const minutes = parseFloat(value);
      this.patch({
        preparationLeadTimeMinutes: Number.isNaN(minutes) ? value : minutes,
      });
    },
    applyPreset(minutes) {
      this.patch({ preparationLeadTimeMinutes: minutes });
    },
    displayBufferMinutes(value) {
      return value == null || value === "" ? "" : value;
    },
    setBufferMinutes(field, value) {
      let minutes = null;
      if (value !== "" && value != null) {
        const number = Number(value);
        minutes =
          Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
      }
      this.patch({ [field]: minutes });
    },
    applyBufferPreset(field, minutes) {
      this.patch({ [field]: minutes > 0 ? minutes : null });
    },
    bufferPresetActive(field, minutes) {
      const current = Number(this.bookable[field]) || 0;
      return current === minutes;
    },
    newServiceHours() {
      return {
        weekdays: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "18:00",
      };
    },
    updateServiceHours(index, changes) {
      this.patch({
        serviceHours: this.serviceHours.map((entry, i) =>
          i === index ? { ...entry, ...changes } : entry
        ),
      });
    },
    addServiceHours() {
      const index = this.serviceHours.length;
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.patch({
        serviceHours: [...this.serviceHours, this.newServiceHours()],
      });
      this.expandedItems.push(index);
    },
    removeServiceHours(index) {
      this.patch({
        serviceHours: this.serviceHours.filter((_, i) => i !== index),
      });
      this.timeStartMenu.splice(index, 1);
      this.timeEndMenu.splice(index, 1);
      this.expandedItems = this.expandedItems
        .filter((expandedIndex) => expandedIndex !== index)
        .map((expandedIndex) =>
          expandedIndex > index ? expandedIndex - 1 : expandedIndex
        );
    },
    removeWeekdays(index, weekdayId) {
      this.updateServiceHours(index, {
        weekdays: this.serviceHours[index].weekdays.filter(
          (id) => id !== weekdayId
        ),
      });
    },
    closeMenu,
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
  },
};
</script>

<template>
  <div>
    <v-card
      v-if="expertOptionShown('leadTime')"
      id="be-section-bookingType-lead-time"
      data-field="leadTime"
      class="mt-4 section-card"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-timer-sand</v-icon>
        <span class="text-h6 font-weight-bold">
          {{ $t("bookable.edit.cards.leadTime") }}
        </span>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <v-switch
          data-test="lead-time-switch"
          :input-value="leadTimeEnabled"
          color="primary"
          hide-details
          class="mt-0"
          @change="setLeadTimeEnabled"
        >
          <template v-slot:label>
            <div>
              <div class="font-weight-medium">
                {{ $t("bookable.edit.leadTime.switch") }}
              </div>
              <div class="text-caption text--secondary">
                {{ $t("bookable.edit.leadTime.switch-hint") }}
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
            {{ $t("bookable.edit.leadTime.info") }}
          </v-alert>

          <div class="text-subtitle-2 mb-2">
            {{ $t("bookable.edit.leadTime.preparation") }}
          </div>
          <v-row dense>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                background-color="accent"
                filled
                dense
                :label="$t('bookable.edit.common.duration')"
                type="number"
                min="0"
                :suffix="$t('bookable.edit.common.minutes')"
                :value="bookable.preparationLeadTimeMinutes"
                :hint="
                  preparationDurationLabel
                    ? $t('bookable.edit.leadTime.equals', {
                        duration: preparationDurationLabel,
                      })
                    : ''
                "
                persistent-hint
                hide-details="auto"
                :rules="fieldRules.leadTimeMinutes"
                @input="setPreparationMinutes"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="8"
              class="d-flex align-center flex-wrap"
            >
              <span class="text-caption text--secondary mr-2">{{
                $t("bookable.edit.common.quick-pick")
              }}</span>
              <v-chip
                v-for="preset in presets"
                :key="preset.value"
                :data-test="`lead-time-preset-${preset.value}`"
                small
                class="mr-1 mb-1"
                :color="
                  bookable.preparationLeadTimeMinutes === preset.value
                    ? 'primary'
                    : undefined
                "
                :outlined="bookable.preparationLeadTimeMinutes !== preset.value"
                @click="applyPreset(preset.value)"
              >
                {{ preset.label }}
              </v-chip>
            </v-col>
          </v-row>

          <div class="d-flex align-center justify-space-between mt-4 mb-2">
            <div>
              <div class="text-subtitle-2">
                {{ $t("bookable.edit.leadTime.service-hours") }}
              </div>
              <div class="text-caption text--secondary">
                {{ $t("bookable.edit.leadTime.service-hours-hint") }}
              </div>
            </div>
            <v-btn small color="primary" @click="addServiceHours">
              <v-icon left small>mdi-plus</v-icon>
              {{ $t("bookable.edit.common.add") }}
            </v-btn>
          </div>

          <div v-if="hasServiceHours">
            <v-list two-line class="py-0">
              <template v-for="(entry, index) in serviceHours">
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
                        $t("bookable.edit.common.no-days")
                      }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <v-icon small class="mr-1">mdi-clock-outline</v-icon>
                      <span v-if="entry.startTime && entry.endTime">
                        {{
                          $t("bookable.edit.common.time-range", {
                            start: entry.startTime,
                            end: entry.endTime,
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
                        data-test="service-hours-remove"
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
                          :label="$t('bookable.edit.common.weekdays')"
                          :items="weekdays"
                          item-value="id"
                          item-text="name"
                          :value="entry.weekdays"
                          multiple
                          chips
                          hide-selected
                          hide-details="auto"
                          :rules="fieldRules.weekdays"
                          @change="
                            updateServiceHours(index, { weekdays: $event })
                          "
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
                              :value="entry.startTime"
                              :label="$t('bookable.edit.common.start-time')"
                              readonly
                              :suffix="$t('bookable.edit.common.clock')"
                              v-bind="attrs"
                              v-on="on"
                              hide-details="auto"
                              :rules="fieldRules.startTime"
                            />
                          </template>
                          <v-time-picker
                            v-if="timeStartMenu[index]"
                            :value="entry.startTime"
                            full-width
                            format="24hr"
                            @input="
                              updateServiceHours(index, { startTime: $event })
                            "
                            @click:minute="closeMenu(timeStartMenu, index)"
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
                              :value="entry.endTime"
                              :label="$t('bookable.edit.common.end-time')"
                              readonly
                              :suffix="$t('bookable.edit.common.clock')"
                              v-bind="attrs"
                              v-on="on"
                              hide-details="auto"
                              :rules="fieldRules.endTime"
                            />
                          </template>
                          <v-time-picker
                            v-if="timeEndMenu[index]"
                            :value="entry.endTime"
                            full-width
                            format="24hr"
                            @input="
                              updateServiceHours(index, { endTime: $event })
                            "
                            @click:minute="closeMenu(timeEndMenu, index)"
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
              {{ $t("bookable.edit.leadTime.service-hours-empty") }}
            </div>
            <v-btn small text color="primary" @click="addServiceHours">
              <v-icon left small>mdi-plus</v-icon>
              {{ $t("bookable.edit.leadTime.service-hours-add") }}
            </v-btn>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <v-card
      v-if="showBuffer && expertOptionShown('buffer')"
      id="be-section-bookingType-buffer"
      data-field="buffer"
      class="mt-4 section-card"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-calendar-clock</v-icon>
        <span class="text-h6 font-weight-bold">
          {{ $t("bookable.edit.cards.buffer") }}
        </span>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <v-switch
          data-test="buffer-switch"
          :input-value="bufferSwitchEnabled"
          color="primary"
          hide-details
          class="mt-0"
          @change="setBufferEnabled"
        >
          <template v-slot:label>
            <div>
              <div class="font-weight-medium">
                {{ $t("bookable.edit.buffer.switch") }}
              </div>
              <div class="text-caption text--secondary">
                {{ $t("bookable.edit.buffer.switch-hint") }}
              </div>
            </div>
          </template>
        </v-switch>

        <template v-if="bufferSwitchEnabled">
          <v-divider class="my-4" />

          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">
                {{ $t("bookable.edit.buffer.before") }}
              </div>
              <div class="text-caption text--secondary mb-2">
                {{ $t("bookable.edit.buffer.before-hint") }}
              </div>
              <v-text-field
                background-color="accent"
                filled
                dense
                :label="$t('bookable.edit.common.duration')"
                type="number"
                min="0"
                :suffix="$t('bookable.edit.common.minutes')"
                :value="displayBufferMinutes(bookable.bufferTimeBeforeMinutes)"
                data-test="buffer-before"
                hide-details="auto"
                :rules="fieldRules.bufferMinutes"
                @input="setBufferMinutes('bufferTimeBeforeMinutes', $event)"
              />
              <div class="d-flex flex-wrap mt-2">
                <span class="text-caption text--secondary mr-2">{{
                  $t("bookable.edit.common.quick-pick")
                }}</span>
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
                  @click="
                    applyBufferPreset('bufferTimeBeforeMinutes', preset.value)
                  "
                >
                  {{ preset.label }}
                </v-chip>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">
                {{ $t("bookable.edit.buffer.after") }}
              </div>
              <div class="text-caption text--secondary mb-2">
                {{ $t("bookable.edit.buffer.after-hint") }}
              </div>
              <v-text-field
                background-color="accent"
                filled
                dense
                :label="$t('bookable.edit.common.duration')"
                type="number"
                min="0"
                :suffix="$t('bookable.edit.common.minutes')"
                :value="displayBufferMinutes(bookable.bufferTimeAfterMinutes)"
                data-test="buffer-after"
                hide-details="auto"
                :rules="fieldRules.bufferMinutes"
                @input="setBufferMinutes('bufferTimeAfterMinutes', $event)"
              />
              <div class="d-flex flex-wrap mt-2">
                <span class="text-caption text--secondary mr-2">{{
                  $t("bookable.edit.common.quick-pick")
                }}</span>
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
                  @click="
                    applyBufferPreset('bufferTimeAfterMinutes', preset.value)
                  "
                >
                  {{ preset.label }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.service-hours-item {
  cursor: pointer;
  transition: all var(--scb-motion-base);
}

.theme--dark .service-hours-item {
  background-color: var(--scb-surface-tint);
}

.service-hours-card {
  border-radius: var(--scb-radius-surface) !important;
}
</style>
