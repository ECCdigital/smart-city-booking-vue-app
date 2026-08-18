<template>
  <div
    class="dashboard-filter d-flex flex-wrap align-center justify-space-between mb-6"
  >
    <div class="d-flex flex-wrap align-center">
      <v-btn-toggle
        :value="value"
        dense
        hide-details
        color="primary"
        class="mr-2"
        @change="$emit('input', $event)"
      >
        <v-btn value="3" outlined :style="{ height: '40px' }">3 Monate</v-btn>
        <v-btn value="12" outlined :style="{ height: '40px' }">12 Monate</v-btn>
        <v-btn value="all" outlined :style="{ height: '40px' }"
          >Gesamter Zeitraum</v-btn
        >
      </v-btn-toggle>

      <div
        v-if="!isEntirePeriod"
        class="period-label subtitle-2 grey--text text--darken-1"
      >
        <v-icon small left>mdi-calendar-range</v-icon>
        <template>
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
            class="filter-select more-filters-field ml-2"
            v-bind="attrs"
            v-on="on"
          />
        </template>

        <div class="more-filters-panel pa-4" :style="moreFiltersPanelStyle">
          <!--
          <div class="subtitle-2 mb-2">Objekte</div>
          <v-checkbox
            v-model="onlyBookablesToggleValue"
            label="Nur buchbare Objekte"
            @change="onOnlyBookablesChange"
          />
          -->

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
      },
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
.more-filters-field {
  cursor: pointer;
}
.more-filters-field >>> .v-input__slot,
.more-filters-field >>> input {
  cursor: pointer;
}
.more-filters-panel {
  min-width: 280px;
}
</style>
