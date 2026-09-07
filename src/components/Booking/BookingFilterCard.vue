<template>
  <v-card class="booking-filter-card" elevation="8" rounded="lg">
    <div class="booking-filter-card__header">
      <div class="d-flex align-center">
        <div class="booking-filter-card__header-icon mr-3">
          <v-icon color="primary" small>mdi-filter-variant</v-icon>
        </div>
        <div>
          <div class="text-subtitle-2 font-weight-bold line-height-tight">
            {{ $t("booking.filter.title") }}
          </div>
          <div class="text-caption grey--text">{{ subtitle }}</div>
        </div>
      </div>
      <v-btn
        v-if="activeCount > 0"
        text
        x-small
        color="primary"
        class="px-2"
        @click="$emit('reset')"
      >
        {{ $t("booking.filter.resetAll") }}
      </v-btn>
    </div>

    <v-divider />

    <div class="booking-filter-card__section-label">
      <span>{{ $t("booking.filter.type") }}</span>
      <button
        v-if="bookingTypeFilter !== 'all'"
        type="button"
        class="booking-filter-card__section-reset"
        @click="$emit('update:bookingTypeFilter', 'all')"
      >
        {{ $t("booking.filter.reset") }}
      </button>
    </div>
    <div class="px-4 pb-3 pt-1">
      <v-btn-toggle
        :value="bookingTypeFilter"
        mandatory
        dense
        rounded
        color="primary"
        class="booking-filter-types"
        @change="$emit('update:bookingTypeFilter', $event)"
      >
        <v-btn
          v-for="option in typeOptions"
          :key="option.value"
          :value="option.value"
          small
          text
          class="booking-filter-types__segment"
        >
          <v-icon left small>{{ option.icon }}</v-icon>
          {{ option.label }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-divider />

    <div class="booking-filter-card__section-label">
      <span>{{ $t("booking.filter.status") }}</span>
      <button
        v-if="statusFilter.length"
        type="button"
        class="booking-filter-card__section-reset"
        @click="$emit('update:statusFilter', [])"
      >
        {{ $t("booking.filter.reset") }}
      </button>
    </div>
    <div class="booking-filter-card__rows">
      <button
        v-for="option in statusOptions"
        :key="option.value"
        type="button"
        class="booking-filter-row"
        :class="{ 'booking-filter-row--active': isSelected(option.value) }"
        :aria-pressed="isSelected(option.value) ? 'true' : 'false'"
        @click="toggleStatus(option.value)"
      >
        <div class="booking-filter-row__icon">
          <v-icon small :color="option.color">{{ option.icon }}</v-icon>
        </div>
        <span class="booking-filter-row__title">{{ option.label }}</span>
        <v-simple-checkbox
          :value="isSelected(option.value)"
          color="primary"
          dense
          :ripple="false"
          class="booking-filter-row__box"
          @click.stop="toggleStatus(option.value)"
        />
      </button>
    </div>
  </v-card>
</template>

<script>
import {
  BOOKING_STATUS,
  statusColor,
  statusIcon,
  statusLabel,
} from "@/utils/bookingStatus";

/**
 * The filter card of the booking list (spec N1): the booking type as a
 * segment switch and the five states as a checkbox list. The host owns both
 * values and the count of restrictions; the card only shows and raises them.
 * Nothing selected under "Status" means no status filter.
 */
export default {
  name: "BookingFilterCard",
  props: {
    /** "all" | "single" | "series" */
    bookingTypeFilter: { type: String, required: true },
    /** The selected states, empty for no filter. */
    statusFilter: { type: Array, required: true },
    /** How many restrictions are active - what the funnel's badge shows. */
    activeCount: { type: Number, required: true },
  },
  computed: {
    subtitle() {
      return this.activeCount === 0
        ? this.$t("booking.filter.none")
        : this.$tc("booking.filter.active", this.activeCount);
    },
    typeOptions() {
      return [
        {
          value: "all",
          label: this.$t("booking.filter.typeAll"),
          icon: "mdi-view-grid-outline",
        },
        {
          value: "single",
          label: this.$t("booking.filter.typeSingle"),
          icon: "mdi-calendar-check-outline",
        },
        {
          value: "series",
          label: this.$t("booking.filter.typeSeries"),
          icon: "mdi-calendar-multiple",
        },
      ];
    },
    statusOptions() {
      return Object.values(BOOKING_STATUS).map((status) => ({
        value: status,
        label: statusLabel(status),
        color: statusColor(status),
        icon: statusIcon(status),
      }));
    },
  },
  methods: {
    isSelected(status) {
      return this.statusFilter.includes(status);
    },
    toggleStatus(status) {
      const next = this.isSelected(status)
        ? this.statusFilter.filter((selected) => selected !== status)
        : [...this.statusFilter, status];
      this.$emit("update:statusFilter", next);
    },
  },
};
</script>

<style scoped lang="scss">
.booking-filter-card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/*
 * Vuetify exposes the theme colours as hex values, so `rgba(var(--v-primary-base), x)`
 * is invalid and renders nothing. The primary tints are therefore overlays:
 * a pseudo-element in the primary colour at a low opacity.
 */
@mixin primary-tint($opacity) {
  position: relative;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--v-primary-base);
    opacity: $opacity;
    pointer-events: none;
  }
}

.booking-filter-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  @include primary-tint(0.04);
}

.booking-filter-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  @include primary-tint(0.12);
}

.line-height-tight {
  line-height: 1.25;
}

.booking-filter-card__section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.5);
}

.booking-filter-card__section-reset {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 0.6875rem;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
  color: var(--v-primary-base);
}

.booking-filter-types {
  width: 100%;
  display: flex;

  .booking-filter-types__segment {
    flex: 1;
    text-transform: none;
    letter-spacing: 0;
  }
}

.booking-filter-card__rows {
  display: flex;
  flex-direction: column;
  padding: 2px 8px 10px;
}

.booking-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &--active {
    @include primary-tint(0.06);

    .booking-filter-row__title {
      font-weight: 600;
    }
  }
}

.booking-filter-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.booking-filter-row__title {
  flex: 1;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
}

.booking-filter-row__box {
  flex-shrink: 0;
}

.theme--dark {
  &.booking-filter-card {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .booking-filter-card__section-label {
    color: rgba(255, 255, 255, 0.6);
  }

  .booking-filter-row {
    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    &--active::before {
      opacity: 0.15;
    }
  }

  .booking-filter-row__icon {
    background: rgba(255, 255, 255, 0.08);
  }

  .booking-filter-row__title {
    color: rgba(255, 255, 255, 0.9);
  }
}
</style>
