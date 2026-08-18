<template>
  <v-container fluid class="dashboard-data-combo">
    <!-- Aktivitäten -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="teal">mdi-calendar-check</v-icon>
        Aktivitäten
        <span
          v-if="!!tenantData"
          class="subtitle-2 grey--text font-weight-regular"
        >
          ({{ tenantData.data?.tenantName }})
        </span>
      </h2>
      <v-row>
        <v-col cols="12" md="4" lg="3">
          <v-card outlined class="theme-card theme-card--activity fill-height">
            <v-card-title class="subtitle-1">Gesamt</v-card-title>
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
        <v-col cols="12" md="8" lg="9">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Buchungen im Zeitverlauf
            </v-card-title>
            <v-card-text>
              <dashboard-chart
                :option="bookingsOverTimeOption"
                height="300px"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Finanzen -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="green">mdi-currency-eur</v-icon>
        Finanzen
        <span
          v-if="!!tenantData"
          class="subtitle-2 grey--text font-weight-regular"
        >
          ({{ tenantData.data?.tenantName }})
        </span>
      </h2>
      <v-row>
        <v-col cols="12" md="4" lg="3">
          <v-card outlined class="theme-card theme-card--finance fill-height">
            <v-card-title class="subtitle-1">Gesamt</v-card-title>
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
              <div v-if="!tenantData" class="metric-row">
                <span>Top-Mandant</span>
                <strong>{{ topRevenueTenant }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8" lg="9">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Umsatz im Zeitverlauf
            </v-card-title>
            <v-card-text>
              <dashboard-chart :option="revenueOverTimeOption" height="300px" />
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
        <span
          v-if="!!tenantData"
          class="subtitle-2 grey--text font-weight-regular"
        >
          (Alle Mandanten)
        </span>
      </h2>
      <v-row>
        <v-col cols="12" sm="5" md="3">
          <v-card outlined class="theme-card theme-card--offer fill-height">
            <v-card-title class="subtitle-1">Gesamt</v-card-title>
            <v-card-text>
              <div class="metric-row">
                <span>Mandanten</span>
                <strong>{{ formatNumber(payload.totals.tenants) }}</strong>
              </div>
              <div class="metric-row">
                <span>Benutzer:innen</span>
                <strong>{{ formatNumber(payload.totals.users) }}</strong>
              </div>

              <div class="metric-row mt-5">
                <span>Buchungsobjekte</span>
                <strong>{{ formatNumber(payload.totals.bookables) }}</strong>
              </div>
              <div class="metric-row">
                <span>Buchbare Angebote</span>
                <strong>{{
                  formatNumber(payload.totals.bookableObjects)
                }}</strong>
              </div>
              <div class="metric-row mt-5">
                <span>Events</span>
                <strong>{{ formatNumber(payload.totals.events) }}</strong>
              </div>
              <div class="metric-row">
                <span>Aktive Events</span>
                <strong>{{ formatNumber(payload.totals.activeEvents) }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="7" md="4">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Anteil der Benutzer:innen
            </v-card-title>
            <v-card-text>
              <dashboard-chart :option="usersByTenantOption" height="300px" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="5">
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
    <pre class="yellow pa-1 text-caption">
      {{ tenantData }}
    </pre>
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
    tenantData: {
      type: Object,
      default: null,
    },
  },
  computed: {
    payload() {
      return (this.dashboardData && this.dashboardData.data) || {};
    },
    tenantPayload() {
      if (!this.tenantData) return {};
      return this.tenantData.data || this.tenantData;
    },
    totals() {
      if (this.tenantData && this.tenantData.data) {
        return this.tenantPayload.totals;
      }
      return this.payload.totals || {};
    },
    byTenant() {
      return this.payload.byTenant || [];
    },
    cancellationRate() {
      const bookings = Number(this.totals.bookings || 0);
      const cancellations = Number(this.totals.cancellations || 0);
      if (!bookings) return "0 %";
      return `${((cancellations / bookings) * 100).toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      })} %`;
    },
    byPeriod() {
      if (this.dashboardData) {
        return this.tenantPayload.byPeriod || [];
      }
      return this.payload.byPeriod || [];
    },
    periodLabels() {
      return this.byPeriod?.map((entry) => this.formatPeriod(entry.period));
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
    hasAnyTenantEvents() {
      return this.byTenant.some((t) => Number(t.events || 0) > 0);
    },
    usersByTenantOption() {
      return {
        tooltip: {
          trigger: "item",
          formatter: "{b}: {c} ({d}%)",
        },
        legend: {
          orient: "horizontal",
          left: "center",
          bottom: 0,
          itemGap: 10,
          textStyle: { fontSize: 11, align: "center" },
        },
        series: [
          {
            type: "pie",
            radius: ["45%", "70%"],
            center: ["50%", "42%"],
            avoidLabelOverlap: true,
            label: { show: true, formatter: "{c}" },
            data: this.byTenant?.map((t) => ({
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
          data: this.byTenant?.map((t) => t.tenantName),
          axisLabel: {
            interval: 0,
            //rotate: 25,
            padding: 5,
            formatter: (value) =>
              String(value || "")
                .replace(/( )/g, "$1\n")
                .trim(),
          },
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "Buchbare Angebote",
            type: "bar",
            data: this.byTenant?.map((t) => t.bookableObjects),
            itemStyle: { color: "#039BE5" },
          },
          this.hasAnyTenantEvents && {
            name: "Aktive Events",
            type: "bar",
            data: this.byTenant?.map((t) => t.activeEvents),
            itemStyle: { color: "#8E24AA" },
          },
        ].filter(Boolean),
      };
    },
    bookingsOverTimeOption() {
      return {
        tooltip: { trigger: "axis" },
        legend: { top: 0 },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: this.periodLabels,
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "Buchungen",
            type: "line",
            showSymbol: false,
            //symbolSize: 4, //kleinere Symbole
            smooth: true,
            data: this.byPeriod?.map((entry) => entry.bookings),
            itemStyle: { color: "#00897B" },
            areaStyle: { color: "rgba(0, 137, 123, 0.12)" },
          },
          {
            name: "Stornierungen",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: this.byPeriod?.map((entry) => entry.cancellations),
            itemStyle: { color: "#F1BB65FF" },
          },
        ],
      };
    },
    revenueOverTimeOption() {
      return {
        tooltip: {
          trigger: "axis",
          valueFormatter: (value) => this.formatCurrency(value),
        },
        legend: { show: false },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: this.periodLabels,
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "Umsatz",
            type: "line",
            showSymbol: false,
            //symbolSize: 4, //kleinere Symbole
            smooth: true,
            data: this.byPeriod?.map((entry) => entry.revenueEur),
            itemStyle: { color: "#43a047" },
            areaStyle: { color: "rgba(0, 137, 123, 0.12)" },
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
    formatPeriod(value) {
      if (!value) return "–";
      const weekMatch = String(value).match(/^(\d{4})-W(\d{2})$/);
      if (weekMatch) {
        return `${weekMatch[1]}\n KW ${weekMatch[2]}`;
      }
      return String(value);
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
