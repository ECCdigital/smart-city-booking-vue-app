<template>
  <div class="dashboard-period-filter d-flex flex-wrap align-center mb-6">
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
      <template v-if="isEntirePeriod">
        Gesamter Zeitraum
      </template>
      <template v-else>
        {{ formatDate(from) }}
        <span class="mx-1">–</span>
        {{ formatDate(to) }}
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: "DashboardPeriodFilter",
  props: {
    /** Aktuelle Auswahl: '3' | '12' | 'all' */
    value: {
      type: String,
      default: "all",
    },
    /** dashboardData.data.from */
    from: {
      type: [String, Date],
      default: null,
    },
    /** dashboardData.data.to */
    to: {
      type: [String, Date],
      default: null,
    },
  },
  computed: {
    isEntirePeriod() {
      return !this.from && !this.to;
    },
  },
  methods: {
    formatDate(value) {
      if (!value) return "–";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        // bereits formatiert oder YYYY-MM-DD ohne Zeit
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
  },
};
</script>

<style scoped>
.period-label {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
</style>
