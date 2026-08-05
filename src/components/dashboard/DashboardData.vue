<template>
  <v-container fluid class="dashboard-data-combo">
    <!-- Nutzung -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="indigo">mdi-account-group</v-icon>
        Nutzung
      </h2>
      <v-row>
        <!-- dense -->
        <v-col cols="12" md="4">
          <v-card outlined class="theme-card theme-card--usage fill-height">
            <v-card-title class="subtitle-1">Nutzung gesamt</v-card-title>
            <v-card-text>
              <div class="metric-row">
                <span>Mandanten</span>
                <strong>{{ formatNumber(totals.tenants) }}</strong>
              </div>
              <div class="metric-row">
                <span>Benutzer:innen</span>
                <strong>{{ formatNumber(totals.users) }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Anteil der Benutzer:innen
            </v-card-title>
            <v-card-text>
              <dashboard-chart :option="usersByTenantOption" height="200px" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Angebote -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="primary">mdi-office-building</v-icon>
        Angebote
      </h2>
      <v-row>
        <v-col cols="12" md="4">
          <v-card outlined class="theme-card theme-card--offer fill-height">
            <v-card-title class="subtitle-1">Gesamt</v-card-title>
            <v-card-text>
              <div class="metric-row">
                <span>Buchungsobjekte</span>
                <strong>{{ formatNumber(totals.bookables) }}</strong>
              </div>
              <div class="metric-row">
                <span>Buchbare Angebote</span>
                <strong>{{ formatNumber(totals.bookableObjects) }}</strong>
              </div>
              <div class="metric-row mt-5">
                <span>Events</span>
                <strong>{{ formatNumber(totals.events) }}</strong>
              </div>
              <div class="metric-row">
                <span>Aktive Events</span>
                <!--<strong>{{ formatNumber(totals.events) }}</strong>-->
                <strong>?</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Buchungsobjekte &amp; Events je Mandant
            </v-card-title>
            <v-card-text>
              <dashboard-chart :option="offerByTenantOption" height="300px" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Aktivitäten -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="teal">mdi-calendar-check</v-icon>
        Aktivitäten
      </h2>
      <v-row>
        <v-col cols="12" md="4">
          <v-card outlined class="theme-card theme-card--activity fill-height">
            <v-card-title class="subtitle-1">Aktivität gesamt</v-card-title>
            <v-card-text>
              <div class="metric-row">
                <span>Buchungen</span>
                <strong>{{ formatNumber(totals.bookings) }}</strong>
              </div>
              <div class="metric-row">
                <span>Stornierungen</span>
                <strong>{{ formatNumber(totals.cancellations) }}</strong>
              </div>
              <v-divider class="my-3" />
              <div class="caption grey--text">
                Stornoquote:
                <strong class="primary--text">{{ cancellationRate }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Ranking: Buchungen je Mandant
            </v-card-title>
            <v-card-text>
              <dashboard-chart :option="bookingsRankingOption" height="300px" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Finanzen -->
    <section class="mb-4">
      <h2 class="text-h6 mb-3">
        <v-icon left color="green">mdi-currency-eur</v-icon>
        Finanzen
      </h2>
      <v-row>
        <v-col cols="12" md="4">
          <v-card outlined class="theme-card theme-card--finance fill-height">
            <v-card-title class="subtitle-1">Finanzen gesamt</v-card-title>
            <v-card-text>
              <div
                class="text-h4 font-weight-medium green--text text--darken-2 mb-2"
              >
                {{ formatCurrency(totals.revenueEur) }}
              </div>
              <div class="caption grey--text mb-4">Gesamtumsatz</div>
              <div class="metric-row">
                <span>Ø Umsatz / Buchung</span>
                <strong>{{ formatCurrency(avgRevenuePerBooking) }}</strong>
              </div>
              <div class="metric-row">
                <span>Top-Mandant</span>
                <strong>{{ topRevenueTenant }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Ranking: Umsatz je Mandant
            </v-card-title>
            <v-card-text>
              <dashboard-chart :option="revenueRankingOption" height="300px" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>
  </v-container>
</template>

<script>
import DashboardChart from "@/components/dashboard/DashboardChart.vue";

export default {
  name: "DashboardDataCombo",
  components: { DashboardChart },
  props: {
    dashboardData: {
      type: Object,
      default: null,
    },
  },
  computed: {
    payload() {
      return (this.dashboardData && this.dashboardData.data) || {};
    },
    totals() {
      return this.payload.totals || {};
    },
    byTenant() {
      return this.payload.byTenant || [];
    },
    periodLabel() {
      const { from, to } = this.payload;
      if (!from && !to) return "Gesamter Zeitraum";
      if (from && to) return `${from} – ${to}`;
      return from || to || null;
    },
    cancellationRate() {
      const bookings = Number(this.totals.bookings || 0);
      const cancellations = Number(this.totals.cancellations || 0);
      if (!bookings) return "0 %";
      return `${((cancellations / bookings) * 100).toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      })} %`;
    },
    avgRevenuePerBooking() {
      const bookings = Number(this.totals.bookings || 0);
      const revenue = Number(this.totals.revenueEur || 0);
      if (!bookings) return 0;
      return revenue / bookings;
    },
    topRevenueTenant() {
      if (!this.byTenant.length) return "–";
      const top = [...this.byTenant].sort(
        (a, b) => Number(b.revenueEur || 0) - Number(a.revenueEur || 0)
      )[0];
      return top.tenantName;
    },
    tenantsByBookings() {
      return [...this.byTenant].sort(
        (a, b) => Number(a.bookings || 0) - Number(b.bookings || 0)
      );
    },
    tenantsByRevenue() {
      return [...this.byTenant].sort(
        (a, b) => Number(a.revenueEur || 0) - Number(b.revenueEur || 0)
      );
    },
    usersByTenantOption() {
      return {
        tooltip: {
          trigger: "item",
          formatter: "{b}: {c} ({d}%)",
        },
        legend: {
          type: "scroll",
          orient: "vertical",
          right: 0,
          top: "middle",
          textStyle: { fontSize: 11 },
        },
        series: [
          {
            type: "pie",
            radius: ["45%", "70%"],
            center: ["35%", "50%"],
            avoidLabelOverlap: true,
            label: { show: false },
            data: this.byTenant.map((t) => ({
              name: t.tenantName,
              value: t.users,
            })),
          },
        ],
      };
    },
    offerByTenantOption() {
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0 },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          data: this.byTenant.map((t) => t.tenantName),
          axisLabel: { interval: 0, rotate: 25 },
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "Buchungsobjekte",
            type: "bar",
            data: this.byTenant.map((t) => t.bookableObjects),
            itemStyle: { color: "#039BE5" },
          },
          {
            name: "Events",
            type: "bar",
            data: this.byTenant.map((t) => t.events),
            itemStyle: { color: "#8E24AA" },
          },
        ],
      };
    },
    bookingsRankingOption() {
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: "value" },
        yAxis: {
          type: "category",
          data: this.tenantsByBookings.map((t) => t.tenantName),
        },
        series: [
          {
            type: "bar",
            name: "Buchungen",
            data: this.tenantsByBookings.map((t) => t.bookings),
            itemStyle: { color: "#00897B" },
          },
        ],
      };
    },
    revenueRankingOption() {
      return {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          valueFormatter: (value) => this.formatCurrency(value),
        },
        grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: "value" },
        yAxis: {
          type: "category",
          data: this.tenantsByRevenue.map((t) => t.tenantName),
        },
        series: [
          {
            type: "bar",
            name: "Umsatz",
            data: this.tenantsByRevenue.map((t) => t.revenueEur),
            itemStyle: { color: "#43A047" },
          },
        ],
      };
    },
  },
  methods: {
    formatNumber(value) {
      return Number(value || 0).toLocaleString("de-DE");
    },
    formatCurrency(value) {
      return Number(value || 0).toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
      });
    },
  },
};
</script>

<style scoped>
.theme-card {
  border-top: 3px solid transparent;
}
.theme-card--usage {
  border-top-color: #3949ab;
}
.theme-card--offer {
  border-top-color: #039be5;
}
.theme-card--activity {
  border-top-color: #00897b;
}
.theme-card--finance {
  border-top-color: #43a047;
}
.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
}
</style>
