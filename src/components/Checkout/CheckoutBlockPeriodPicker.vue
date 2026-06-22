<template>
  <div class="checkout-block-period-picker">
    <v-card elevation="1" class="calendar-card mb-4">
      <v-card-title class="calendar-header py-2" :style="headerStyle">
        <v-row align="center" class="ma-0">
          <v-col class="col-auto py-0">
            <v-btn icon small :color="textColor" @click="previousMonth" :disabled="loading">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
          </v-col>
          <v-col class="py-0">
            <h3
              class="text-subtitle-1 font-weight-medium mb-0 text-center"
              :style="{ color: textColor }"
            >
              <v-icon left :color="textColor" small>mdi-calendar-sync</v-icon>
              {{ monthYearDisplay }}
            </h3>
          </v-col>
          <v-col class="col-auto py-0 text-right">
            <v-btn icon small :color="textColor" @click="nextMonth" :disabled="loading">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-card-title>

      <v-progress-linear
        v-if="loading"
        indeterminate
        :color="primaryColor"
        height="3"
      />
    </v-card>

    <v-card
      v-if="fetchError && !loading"
      elevation="1"
      class="error-card"
    >
      <v-card-text class="text-center py-6">
        <v-icon size="48" color="error" class="mb-3">
          mdi-alert-circle-outline
        </v-icon>
        <div class="text-subtitle-1 mb-1">Zeiträume konnten nicht geladen werden</div>
        <div class="text-body-2 grey--text text--darken-1 mb-4">
          Bitte versuchen Sie es erneut.
        </div>
        <v-btn small :color="primaryColor" outlined @click="fetchBlockPeriods">
          Erneut laden
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card v-else-if="loading && blockPeriodInstances.length === 0" elevation="1" class="loading-card">
      <v-card-text class="text-center py-6">
        <v-progress-circular
          indeterminate
          :color="primaryColor"
          size="40"
          width="3"
        />
        <div class="text-body-2 mt-3 grey--text">Lade Zeiträume…</div>
      </v-card-text>
    </v-card>

    <v-card
      v-else-if="!loading && !fetchError && blockPeriodInstances.length === 0"
      elevation="1"
      class="no-availability-card"
    >
      <v-card-text class="text-center py-6">
        <v-icon size="48" color="grey lighten-1" class="mb-3">
          mdi-calendar-remove
        </v-icon>
        <div class="text-subtitle-1 mb-1">Keine Zeiträume</div>
        <div class="text-body-2 grey--text text--darken-1">
          In {{ monthYearDisplay }} sind keine Zeiträume verfügbar.
        </div>
      </v-card-text>
    </v-card>

    <v-card v-else elevation="1" class="block-periods-card">
      <v-card-title class="pb-1 pt-3 px-4">
        <v-icon left :color="primaryColor" small>mdi-calendar-sync</v-icon>
        <span class="text-subtitle-1">Verfügbare Zeiträume</span>
        <v-spacer />
        <v-chip x-small :color="availableCount > 0 ? 'success' : 'warning'" text-color="white">
          {{ availableCount }} verfügbar
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-3 pt-1">
        <v-row dense>
          <v-col
            v-for="instance in blockPeriodInstances"
            :key="instanceKey(instance)"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              :outlined="!isSelected(instance)"
              :elevation="isSelected(instance) ? 3 : 0"
              :color="isSelected(instance) ? primaryColor : 'white'"
              class="block-period-card"
              :class="{
                'selected-card': isSelected(instance),
                'unavailable-card': !isSelectable(instance),
              }"
              @click="selectInstance(instance)"
            >
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="block-period-card__body">
                    <div
                      class="text-overline mb-0 block-period-card__label"
                      :style="{ color: cardMutedColor(instance) }"
                    >
                      {{ instance.label }}
                    </div>
                    <div
                      class="text-subtitle-2 font-weight-bold mt-1 block-period-card__range"
                      :style="{ color: cardMainColor(instance) }"
                    >
                      {{ formatCompactRange(instance.timeBegin, instance.timeEnd) }}
                    </div>
                    <div
                      class="text-caption mt-1"
                      :style="{ color: cardMutedColor(instance) }"
                    >
                      <template v-if="isSelectable(instance)">
                        {{ calculateDuration(instance) }}
                        · {{ formatCurrency(instance.priceEur) }}
                      </template>
                      <template v-else>
                        {{ getInstanceStatusLabel(instance) }}
                      </template>
                    </div>
                  </div>
                  <v-icon
                    v-if="isSelectable(instance)"
                    :color="isSelected(instance) ? textColor : primaryColor"
                  >
                    {{
                      isSelected(instance)
                        ? "mdi-check-circle"
                        : "mdi-circle-outline"
                    }}
                  </v-icon>
                </div>
              </v-card-text>

              <v-fade-transition>
                <v-overlay
                  v-if="isSelected(instance)"
                  absolute
                  :opacity="0.1"
                  :color="textColor"
                />
              </v-fade-transition>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import { getBlockPeriodUnavailableLabel } from "@/utils/checkoutErrors";

export default {
  name: "CheckoutBlockPeriodPicker",
  props: {
    leadItem: {
      type: Object,
      required: true,
    },
    value: {
      type: Object,
      default: null,
    },
    amount: {
      type: Number,
      default: 1,
    },
  },
  data() {
    const today = new Date();
    return {
      displayedMonth: {
        year: today.getFullYear(),
        month: today.getMonth(),
      },
      loading: false,
      fetchError: false,
      blockPeriodInstances: [],
    };
  },
  computed: {
    primaryColor() {
      return this.$vuetify.theme.themes.light.primary || "#1976D2";
    },
    textColor() {
      return this.getContrastColor(this.primaryColor);
    },
    headerStyle() {
      return {
        backgroundColor: this.primaryColor,
      };
    },
    monthYearDisplay() {
      const date = new Date(
        this.displayedMonth.year,
        this.displayedMonth.month,
        1
      );
      return date.toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
      });
    },
    queryRange() {
      const { year, month } = this.displayedMonth;
      const startDate = this.toDateString(new Date(year, month, 1));
      const endDate = this.toDateString(new Date(year, month + 1, 0));
      return { startDate, endDate };
    },
    availableCount() {
      return this.blockPeriodInstances.filter((instance) =>
        this.isSelectable(instance)
      ).length;
    },
  },
  watch: {
    displayedMonth: {
      handler() {
        this.fetchBlockPeriods();
      },
      deep: true,
    },
    "leadItem.bookable.id"() {
      this.fetchBlockPeriods();
    },
    amount() {
      this.fetchBlockPeriods();
    },
  },
  mounted() {
    this.fetchBlockPeriods();
  },
  methods: {
    instanceKey(instance) {
      return `${instance.blockPeriodId}-${instance.timeBegin}-${instance.timeEnd}`;
    },
    isPastPeriod(instance) {
      return instance.timeEnd <= Date.now();
    },
    isSelectable(instance) {
      return instance.available && !this.isPastPeriod(instance);
    },
    isSelected(instance) {
      if (!this.value || !this.isSelectable(instance)) {
        return false;
      }
      return (
        this.value.timeBegin === instance.timeBegin &&
        this.value.timeEnd === instance.timeEnd
      );
    },
    selectInstance(instance) {
      if (!this.isSelectable(instance)) {
        return;
      }
      this.$emit("input", instance);
    },
    previousMonth() {
      const date = new Date(this.displayedMonth.year, this.displayedMonth.month, 1);
      date.setMonth(date.getMonth() - 1);
      this.displayedMonth = { year: date.getFullYear(), month: date.getMonth() };
    },
    nextMonth() {
      const date = new Date(this.displayedMonth.year, this.displayedMonth.month, 1);
      date.setMonth(date.getMonth() + 1);
      this.displayedMonth = { year: date.getFullYear(), month: date.getMonth() };
    },
    async fetchBlockPeriods() {
      const bookable = this.leadItem?.bookable;
      if (!bookable?.id) {
        return;
      }

      this.loading = true;
      try {
        this.fetchError = false;
        const { startDate, endDate } = this.queryRange;
        const response = await ApiBookablesService.getBlockPeriods(
          bookable.id,
          bookable.tenantId,
          startDate,
          endDate,
          this.amount
        );
        this.blockPeriodInstances = response.data?.blockPeriods || [];
        this.clearSelectionIfMissing();
      } catch (error) {
        console.warn("Could not fetch block periods", error);
        this.fetchError = true;
      } finally {
        this.loading = false;
      }
    },
    clearSelectionIfMissing() {
      if (!this.value) {
        return;
      }
      if (this.value.timeEnd <= Date.now()) {
        this.$emit("input", null);
        return;
      }
      const stillAvailable = this.blockPeriodInstances.some(
        (instance) =>
          this.isSelectable(instance) &&
          instance.timeBegin === this.value.timeBegin &&
          instance.timeEnd === this.value.timeEnd
      );
      if (!stillAvailable) {
        this.$emit("input", null);
      }
    },
    calculateDuration(instance) {
      const durationMs = instance.timeEnd - instance.timeBegin;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;

      if (days > 0 && remainingHours > 0) {
        return `${days} T. ${remainingHours}h`;
      }
      if (days > 0) {
        return `${days} T.`;
      }
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}min`;
      }
      if (hours > 0) {
        return `${hours}h`;
      }
      return `${minutes}min`;
    },
    formatTime(date) {
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatCompactRange(timeBegin, timeEnd) {
      const begin = new Date(timeBegin);
      const end = new Date(timeEnd);
      const sameDay =
        begin.getFullYear() === end.getFullYear() &&
        begin.getMonth() === end.getMonth() &&
        begin.getDate() === end.getDate();

      if (sameDay) {
        return `${this.formatTime(begin)} – ${this.formatTime(end)}`;
      }

      const beginPart = begin.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      });
      const endPart = end.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      });

      return `${beginPart} ${this.formatTime(begin)} – ${endPart} ${this.formatTime(end)}`;
    },
    formatCurrency(value) {
      return checkoutUtils.formatCurrency(value);
    },
    getInstanceStatusLabel(instance) {
      if (this.isPastPeriod(instance)) {
        return getBlockPeriodUnavailableLabel("past");
      }
      return getBlockPeriodUnavailableLabel(instance.reason);
    },
    cardMainColor(instance) {
      if (!this.isSelectable(instance)) {
        return "rgba(0,0,0,0.38)";
      }
      return this.isSelected(instance) ? this.textColor : this.primaryColor;
    },
    cardMutedColor(instance) {
      if (!this.isSelectable(instance)) {
        return "rgba(0,0,0,0.38)";
      }
      return this.isSelected(instance)
        ? this.textColor
        : "rgba(0,0,0,0.6)";
    },
    toDateString(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },
    getContrastColor(hexColor) {
      const hex = hexColor.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? "black" : "white";
    },
  },
};
</script>

<style scoped>
.checkout-block-period-picker {
  max-width: 1200px;
  margin: 0 auto;
}

.calendar-card,
.block-periods-card,
.no-availability-card,
.loading-card {
  border-radius: 12px !important;
  overflow: hidden;
}

.calendar-header {
  padding: 10px 12px !important;
}

.block-period-card {
  border-radius: 12px !important;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-width: 2px !important;
  height: 100%;
}

.block-period-card:hover:not(.unavailable-card) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
}

.block-period-card.unavailable-card {
  cursor: default;
  opacity: 0.65;
}

.selected-card {
  transform: translateY(-1px);
}

.block-period-card__body {
  min-width: 0;
  padding-right: 8px;
}

.block-period-card__label {
  line-height: 1.2;
  letter-spacing: 0.06em;
}

.block-period-card__range {
  line-height: 1.25;
  word-break: break-word;
}

@media (max-width: 600px) {
  .block-period-card {
    margin-bottom: 4px;
  }
}
</style>
