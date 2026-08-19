<template>
  <div class="dashboard-filter mb-6">
    <div class="dashboard-filter__period">
      <v-btn-toggle
        :value="value"
        dense
        hide-details
        color="primary"
        class="dashboard-filter__toggle mr-sm-2"
        @change="$emit('input', $event)"
      >
        <v-btn value="3" outlined class="dashboard-filter__toggle-btn">
          3 Monate
        </v-btn>
        <v-btn value="12" outlined class="dashboard-filter__toggle-btn">
          12 Monate
        </v-btn>
        <v-btn value="all" outlined class="dashboard-filter__toggle-btn">
          Gesamter Zeitraum
        </v-btn>
      </v-btn-toggle>

      <div
        v-if="!isEntirePeriod"
        class="period-label subtitle-2 grey--text text--darken-1 mt-2 mt-sm-0"
      >
        <v-icon small left>mdi-calendar-range</v-icon>
        {{ formatDate(from) }}
        <span class="mx-1">–</span>
        {{ formatDate(to) }}
      </div>
    </div>

    <div class="dashboard-filter__controls">
      <v-select
        :value="tenantId"
        :items="tenantOptions"
        item-text="tenantName"
        item-value="tenantId"
        label="Mandant"
        placeholder="Alle Mandanten"
        clearable
        dense
        outlined
        hide-details
        :menu-props="tenantMenuProps"
        class="filter-select"
        @change="onTenantChange"
      />

      <v-menu
        v-model="moreFiltersOpen"
        offset-y
        :close-on-content-click="false"
        content-class="more-filters-menu"
        :max-width="menuMaxWidth"
      >
        <template #activator="{ on, attrs }">
          <v-text-field
            :value="moreFiltersDisplay"
            label="Weitere Filter"
            readonly
            dense
            outlined
            hide-details
            :append-icon="moreFiltersOpen ? 'mdi-menu-up' : 'mdi-menu-down'"
            class="filter-select more-filters-field"
            v-bind="attrs"
            v-on="on"
          />
        </template>

        <div class="more-filters-panel pa-4" :style="moreFiltersPanelStyle">
          <div class="subtitle-2 mb-2">Buchungen pro Status</div>
          <div class="status-checkbox-list">
            <v-checkbox
              v-for="option in statusOptions"
              :key="option.value"
              :input-value="isStatusSelected(option.value)"
              :label="option.text"
              dense
              hide-details
              class="mt-0"
              @change="onStatusCheckboxChange(option.value, $event)"
            />
          </div>
        </div>
      </v-menu>
    </div>
  </div>
</template>

<script>
export const BOOKING_STATUS_I18N = {
  AWAITING_APPROVAL: "status.awaiting_approval",
  PAYMENT_EXPECTED: "status.payment_expected",
  PAID_COMPLETED: "status.paid_completed",
  CONFIRMED_WITHOUT_PAYMENT: "status.confirmed_without_payment",
  REJECTED: "status.rejected",
};

export const ALL_STATUS_KEYS = [
  BOOKING_STATUS_I18N.AWAITING_APPROVAL,
  BOOKING_STATUS_I18N.PAYMENT_EXPECTED,
  BOOKING_STATUS_I18N.PAID_COMPLETED,
  BOOKING_STATUS_I18N.CONFIRMED_WITHOUT_PAYMENT,
  BOOKING_STATUS_I18N.REJECTED,
];

const STATUS_LABELS = {
  [BOOKING_STATUS_I18N.AWAITING_APPROVAL]: "Freigabe ausstehend",
  [BOOKING_STATUS_I18N.PAYMENT_EXPECTED]: "Zahlung ausstehend",
  [BOOKING_STATUS_I18N.PAID_COMPLETED]: "Bezahlt / abgeschlossen",
  [BOOKING_STATUS_I18N.CONFIRMED_WITHOUT_PAYMENT]: "Bestätigt ohne Zahlung",
  [BOOKING_STATUS_I18N.REJECTED]: "Abgelehnt",
};

export default {
  name: "DashboardFilter",
  props: {
    value: {
      type: String,
      default: "all",
    },
    from: {
      type: [String, Date],
      default: null,
    },
    to: {
      type: [String, Date],
      default: null,
    },
    tenants: {
      type: Array,
      default: () => [],
    },
    tenantId: {
      type: String,
      default: null,
    },
    onlyBookables: {
      validator: (value) => value === null || value === true || value === false,
      default: null,
    },
    status: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      moreFiltersOpen: false,
      onlyBookablesToggleValue: this.onlyBookables,
      tenantMenuProps: {
        offsetY: true,
        bottom: true,
        nudgeBottom: 2,
        maxWidth: "100%",
      },
    };
  },
  computed: {
    isEntirePeriod() {
      return !this.from && !this.to;
    },
    menuMaxWidth() {
      return this.$vuetify && this.$vuetify.breakpoint.xsOnly ? "100%" : 320;
    },
    moreFiltersPanelStyle() {
      const isDarkTheme =
        this.$vuetify && this.$vuetify.theme && this.$vuetify.theme.dark;
      return {
        backgroundColor: isDarkTheme ? "#424242" : "#ffffff",
      };
    },
    tenantOptions() {
      return (this.tenants || []).map((tenant) => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName || tenant.tenantId,
      }));
    },
    statusOptions() {
      return ALL_STATUS_KEYS.map((key) => ({
        value: key,
        text: STATUS_LABELS[key] || key,
      }));
    },
    activeMoreFiltersCount() {
      let count = 0;
      if (this.onlyBookables) count += 1;
      count += (this.status || []).length;
      return count;
    },
    moreFiltersDisplay() {
      if (this.activeMoreFiltersCount === 0) return "";
      if (this.activeMoreFiltersCount === 1) return "1 Filter aktiv";
      return `${this.activeMoreFiltersCount} Filter aktiv`;
    },
  },
  watch: {
    "$route.query.tenantId": {
      immediate: true,
      handler(routeTenantId) {
        const normalized = routeTenantId || null;
        if (normalized !== (this.tenantId || null)) {
          this.$emit("update:tenantId", normalized);
          this.$emit("tenant-change", normalized);
        }
      },
    },
  },
  methods: {
    formatDate(value) {
      if (!value) return "–";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[3]}.${match[2]}.${match[1]}`;
        }
        return String(value);
      }
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    },
    onTenantChange(id) {
      const nextId = id || null;
      this.$emit("update:tenantId", nextId);
      this.$emit("tenant-change", nextId);
      this.syncTenantToRoute(nextId);
    },
    onOnlyBookablesChange(value) {
      const next = value === true || value === false ? value : null;
      this.$emit("update:onlyBookables", next);
      this.$emit("only-bookables-change", next);
    },
    isStatusSelected(statusKey) {
      return (this.status || []).includes(statusKey);
    },
    onStatusChange(value) {
      const next = Array.isArray(value) ? value : [];
      this.$emit("update:status", next);
      this.$emit("status-change", next);
    },
    onStatusCheckboxChange(statusKey, isChecked) {
      const current = Array.isArray(this.status) ? [...this.status] : [];
      if (isChecked) {
        if (!current.includes(statusKey)) {
          current.push(statusKey);
        }
      } else {
        const index = current.indexOf(statusKey);
        if (index !== -1) {
          current.splice(index, 1);
        }
      }
      this.onStatusChange(current);
    },
    syncTenantToRoute(tenantId) {
      if (!this.$router || !this.$route) return;

      const query = { ...this.$route.query };
      if (tenantId) {
        if (query.tenantId === tenantId) return;
        query.tenantId = tenantId;
      } else {
        if (!query.tenantId) return;
        delete query.tenantId;
      }

      this.$router.replace({ query }).catch(() => {
        /* NavigationDuplicated in Vue Router 3 */
      });
    },
  },
};
</script>
<style scoped>
.dashboard-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dashboard-filter__period {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 320px;
}

.dashboard-filter__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  flex: 1 1 320px;
  justify-content: flex-end;
}

.dashboard-filter__toggle {
  max-width: 100%;
}

.dashboard-filter__toggle-btn {
  height: 40px !important;
  min-height: 40px !important;
  white-space: normal;
  line-height: 1.2;
}

.period-label {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  white-space: normal;
  min-width: 0;
}

.filter-select {
  width: 220px;
  max-width: 280px;
  flex: 0 1 220px;
  min-width: 0;
}

.more-filters-field {
  cursor: pointer;
}

.more-filters-field >>> .v-input__slot,
.more-filters-field >>> input {
  cursor: pointer;
}

.more-filters-panel {
  min-width: 280px;
  max-width: 100vw;
}

.status-checkbox-list {
  max-height: 280px;
  overflow-y: auto;
}

/* Tablet und kleiner: Zeitraum oben, Filter darunter */
@media (max-width: 959px) {
  .dashboard-filter {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-filter__period,
  .dashboard-filter__controls {
    flex: 1 1 auto;
    width: 100%;
    justify-content: flex-start;
  }
}

/* Tablet: Mandant + Weitere Filter nebeneinander */
@media (min-width: 600px) and (max-width: 959px) {
  .dashboard-filter__controls {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 12px;
  }

  .filter-select {
    flex: 1 1 0;
    width: auto;
    max-width: none;
    min-width: 0;
  }
}

/* Smartphone: alles untereinander */
@media (max-width: 599px) {
  .dashboard-filter__toggle {
    display: flex;
    width: 100%;
  }

  .dashboard-filter__toggle >>> .v-btn {
    flex: 1 1 0;
    min-width: 0;
    padding-left: 6px;
    padding-right: 6px;
    font-size: 0.75rem;
  }

  .period-label {
    width: 100%;
    font-size: 0.875rem;
  }

  .dashboard-filter__controls {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
    max-width: none;
    flex: 1 1 100%;
  }

  .more-filters-panel {
    min-width: unset;
    width: calc(100vw - 32px);
    max-width: 360px;
  }
}
</style>
