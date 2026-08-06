<template>
  <div
    class="dashboard-filter d-flex flex-wrap align-center justify-space-between mb-6"
  >
    <div class="d-flex flex-wrap align-center period-group">
      <v-btn-toggle
        :value="value"
        mandatory
        dense
        class="mr-4"
        color="primary"
        @change="$emit('input', $event)"
      >
        <v-btn value="3" small>3 Monate</v-btn>
        <v-btn value="12" small>12 Monate</v-btn>
        <v-btn value="all" small>Gesamter Zeitraum</v-btn>
      </v-btn-toggle>

      <div class="period-label subtitle-2 grey--text text--darken-1">
        <v-icon small left>mdi-calendar-range</v-icon>
        <template v-if="isEntirePeriod"> Gesamter Zeitraum </template>
        <template v-else>
          {{ formatDate(from) }}
          <span class="mx-1">–</span>
          {{ formatDate(to) }}
        </template>
      </div>
    </div>

    <div class="d-flex flex-wrap align-center right-filters">
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
        offset-y
        hide-details
        class="filter-select"
        @change="onTenantChange"
      />

      <v-menu
        v-model="moreFiltersOpen"
        offset-y
        :close-on-content-click="false"
        class="filter-select"
      >
        <template #activator="{ on, attrs }">
          <v-btn
            v-bind="attrs"
            outlined
            dense
            height="40"
            width="180"
            class="more-filters-btn d-flex justify-space-between items-center"
            v-on="on"
          >
            <div class="d-flex items-center">
              <span class="more-filters-label">Weitere Filter</span>
              <v-chip
                v-if="activeMoreFiltersCount > 0"
                x-small
                color="primary"
                class="ml-2"
                label
              >
                {{ activeMoreFiltersCount }}
              </v-chip>
            </div>
            <v-icon right small>
              {{ moreFiltersOpen ? "mdi-menu-up" : "mdi-menu-down" }}
            </v-icon>
          </v-btn>
        </template>

        <div class="more-filters-panel pa-4" :style="moreFiltersPanelStyle">
          <div class="subtitle-2 mb-2">Objekte</div>
          <v-checkbox
            v-model="onlyBookablesToggleValue"
            label="Nur buchbare Objekte"
            @change="onOnlyBookablesChange"
          />

          <div class="subtitle-2 mb-2">Status</div>
          <div class="status-checkbox-list">
            <v-checkbox
              v-for="option in statusOptions"
              :key="option.value"
              :input-value="status === option.value"
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
      type: String,
      default: null,
    },
  },
  data() {
    return {
      moreFiltersOpen: false,
      onlyBookablesToggleValue: this.onlyBookables,
    };
  },
  computed: {
    isEntirePeriod() {
      return !this.from && !this.to;
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
      if (this.status) count += 1;
      return count;
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
    onStatusChange(value) {
      const next = value || null;
      this.$emit("update:status", next);
      this.$emit("status-change", next);
    },
    onStatusCheckboxChange(statusKey, isChecked) {
      if (isChecked) {
        this.onStatusChange(statusKey);
        return;
      }

      if (this.status === statusKey) {
        this.onStatusChange(null);
      }
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
.period-group,
.right-filters {
  gap: 12px;
}
.right-filters {
  flex-wrap: nowrap;
}
.period-label {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.filter-select {
  width: 220px;
  max-width: 280px;
  flex: 0 0 auto;
}
.more-filters-btn {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
}
.more-filters-label {
  opacity: 0.7;
}
.more-filters-panel {
  min-width: 280px;
}
</style>
