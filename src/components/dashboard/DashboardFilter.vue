<template>
  <div
    class="dashboard-period-filter d-flex flex-wrap align-center justify-space-between mb-6"
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
      class="tenant-select"
      @change="onTenantChange"
    />
  </div>
</template>

<script>
export default {
  name: "DashboardPeriodFilter",
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
  },
  computed: {
    isEntirePeriod() {
      return !this.from && !this.to;
    },
    tenantOptions() {
      return (this.tenants || []).map((tenant) => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName || tenant.tenantId,
      }));
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
.period-group {
  gap: 8px;
}
.period-label {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.tenant-select {
  width: 100%;
  max-width: 280px;
  flex: 0 0 auto;
}
</style>
