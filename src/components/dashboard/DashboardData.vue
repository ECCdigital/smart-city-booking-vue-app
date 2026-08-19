<template>
  <v-container fluid class="dashboard-data-combo">
    <!-- Aktivitäten -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="teal">mdi-shopping</v-icon>
        Aktivitäten
        <span
          v-if="tenantAndStatusLabel"
          class="subtitle-2 grey--text font-weight-regular"
        >
          ({{ tenantAndStatusLabel }})
        </span>
      </h2>
      <v-row>
        <v-col cols="12" md="4" lg="3">
          <v-card outlined class="theme-card theme-card--activity fill-height">
            <v-card-title class="subtitle-1">Gesamt</v-card-title>
            <v-card-text>
              <div class="metric-row mb-5">
                <span>Benutzer:innen</span>
                <strong>{{ formatNumber(totals.users) }}</strong>
              </div>
              <div class="metric-row">
                <span>Buchungen</span>
                <strong>{{ formatNumber(totals.bookings) }}</strong>
              </div>
              <div class="metric-row">
                <span>Stornierungen</span>
                <strong>{{ formatNumber(totals.cancellations) }}</strong>
              </div>
              <div class="caption grey--text">
                Stornoquote:
                <strong class="primary--text">{{ cancellationRate }}</strong>
              </div>
              <v-divider v-if="hasTenantPayload" class="my-3" />
              <div v-if="hasTenantPayload">
                <div
                  v-for="option in statusOptions"
                  :key="option.value"
                  class="metric-row caption grey--text"
                >
                  <span>{{ option.label }}:</span>
                  <strong>{{ getStatusCount(option.value) }}</strong>
                </div>
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

    <!-- Buchungsobjekte -->
    <v-fade-transition>
      <v-expand-transition>
        <section v-if="hasTenantPayload" class="mb-8">
          <h2 class="text-h6 mb-3">
            <v-icon left color="indigo">mdi-cart</v-icon>
            Buchungsobjekte
            <span class="subtitle-2 grey--text font-weight-regular">
              ({{ tenantData.data?.tenantName }})
            </span>
          </h2>
          <v-row>
            <v-col cols="12" md="4" lg="3">
              <v-card
                outlined
                class="theme-card theme-card--bookables fill-height"
              >
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
                    <strong>{{ formatNumber(totals.activeEvents) }}</strong>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="8" lg="9">
              <!-- VERSION A
          <v-card-text>
            <dashboard-chart :option="bookablesRankingOption" height="420px" />
            <div class="text-center mt-2">
              <v-btn
                v-if="hasMoreBookables"
                text
                small
                color="primary"
                @click="showMoreBookables"
              >
                Weitere {{ Math.min(15, remainingBookablesCount) }} anzeigen
              </v-btn>
            </div>
          </v-card-text>
          -->
              <!-- VERSION B -->
              <v-card outlined>
                <v-data-table
                  dense
                  :headers="bookablesTableHeaders"
                  :items="rankedBookables"
                  :items-per-page="bookablesItemsPerPage"
                  :page.sync="bookablesTablePage"
                  :hide-default-footer="!showBookablesPagination"
                  class="elevation-0"
                >
                  <template #item.rank="{ index }">
                    {{
                      (bookablesTablePage - 1) * bookablesItemsPerPage +
                      index +
                      1
                    }}
                  </template>
                  <template #item.bookableTitle="{ item }">
                    <div class="font-weight-medium">
                      {{ truncateTitle(item.bookableTitle, 56) }}
                    </div>
                  </template>
                  <template #item.bookings="{ item }">
                    <div class="text-right">
                      {{ formatNumber(item.bookings) }}
                    </div>
                  </template>
                  <template #item.cancellations="{ item }">
                    <div class="text-right">
                      {{ formatNumber(item.cancellations) }}
                    </div>
                  </template>
                  <template #item.share="{ item }">
                    <v-progress-linear
                      :value="
                        maxBookableBookings
                          ? (item.bookings / maxBookableBookings) * 100
                          : 0
                      "
                      height="8"
                      color="cyan darken-2"
                      rounded
                    />
                  </template>
                  <template #no-data>Keine Buchungsobjekte vorhanden.</template>
                </v-data-table>
              </v-card>

              <!-- VERSION C
          <v-card outlined>
            <v-card-title class="subtitle-1">Top Buchungsobjekte</v-card-title>
            <v-list dense>
              <v-list-item
                v-for="(item, index) in visibleBookables"
                :key="item.bookableId"
              >
                <v-list-item-avatar size="28" color="cyan darken-2">
                  <span class="white--text caption">{{ index + 1 }}</span>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>
                    {{ truncateTitle(item.bookableTitle, 48) }}
                  </v-list-item-title>
                  <v-progress-linear
                    class="mt-1"
                    :value="
                      maxBookableBookings
                        ? (item.bookings / maxBookableBookings) * 100
                        : 0
                    "
                    height="6"
                    color="cyan darken-2"
                    rounded
                  />
                </v-list-item-content>
                <v-list-item-action>
                  <div class="text-right">
                    <div class="font-weight-medium">
                      {{ formatNumber(item.bookings) }}
                    </div>
                    <div class="caption grey--text">
                      {{ formatNumber(item.cancellations) }} Stornos
                    </div>
                  </div>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            <div class="text-center pa-3">
              <v-btn
                v-if="hasMoreBookables"
                text
                small
                color="primary"
                @click="showMoreBookables"
              >
                Weitere {{ Math.min(15, remainingBookablesCount) }} anzeigen
              </v-btn>
            </div>
          </v-card>
          -->
            </v-col>
          </v-row>
        </section>
      </v-expand-transition>
    </v-fade-transition>

    <!-- Finanzen -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="green">mdi-currency-eur</v-icon>
        Finanzen
        <span
          v-if="hasTenantPayload"
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
    <section v-if="!hasTenantPayload" class="mb-8">
      <div class="d-flex align-center justify-space-between mb-3">
        <h2 class="text-h6 mb-0">
          <v-icon left color="primary">mdi-office-building</v-icon>
          Angebote
          <span
            v-if="!!tenantData"
            class="subtitle-2 grey--text font-weight-regular"
          >
            (Alle Mandanten)
          </span>
        </h2>
        <v-btn
          small
          outlined
          color="primary"
          @click="showOfferSection = !showOfferSection"
        >
          {{ showOfferSection ? "Angebote ausblenden" : "Angebote einblenden" }}
        </v-btn>
      </div>
      <v-row v-if="showOfferSection">
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
  </v-container>
</template>

<script>
import DashboardChart from "@/components/dashboard/DashboardChart.vue";

export default {
  name: "DashboardDataCombo",
  components: { DashboardChart },
  data() {
    return {
      showOfferSection: false,
      bookablesTablePage: 1,
      bookablesItemsPerPage: 10,
      statusOptions: [
        { label: "Zahlung ausstehend", value: "status.payment_expected" },
        { label: "Bezahlt / Abgeschlossen", value: "status.paid_completed" },
        {
          label: "Bestätigt ohne Zahlung",
          value: "status.confirmed_without_payment",
        },
      ],
    };
  },
  props: {
    dashboardData: {
      type: Object,
      default: null,
    },
    tenantData: {
      type: Object,
      default: null,
    },
    selectedStatus: {
      type: Array,
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
    hasTenantPayload() {
      return this.tenantPayload && Object.keys(this.tenantPayload).length > 0;
    },
    totals() {
      if (this.tenantData && this.tenantData.data) {
        return this.tenantPayload.totals;
      }
      return this.payload.totals || {};
    },
    cancellationRate() {
      const bookings = Number(this.totals.bookings || 0);
      const cancellations = Number(this.totals.cancellations || 0);
      if (!bookings) return "0 %";
      return `${((cancellations / bookings) * 100).toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      })} %`;
    },
    byTenant() {
      return this.payload.byTenant || [];
    },
    byPeriod() {
      if (this.hasTenantPayload) {
        return this.tenantPayload.byPeriod || [];
      }
      return this.payload.byPeriod || [];
    },
    byBookable() {
      if (this.hasTenantPayload) {
        return this.tenantPayload.byBookable || [];
      }
      return [];
    },
    //Labels
    tenantAndStatusLabel() {
      const values = [];

      if (this.tenantData?.data?.tenantName) {
        values.push(this.tenantData.data.tenantName);
      }

      if (this.selectedStatus.length > 0) {
        const statusLabels = [];
        this.selectedStatus.forEach((status) => {
          let STATUS_LABELS = {
            "status.payment_expected": " Zahlung erwartet",
            "status.awaiting_approval": " Genehmigung ausstehend",
            "status.approved": " Genehmigt",
            "status.rejected": " Abgelehnt",
            "status.cancelled": " Storniert",
          };
          const label = STATUS_LABELS[status] || status;
          statusLabels.push(label);
        });
        values.push("Status:" + statusLabels);
      }

      return values.join(" · ");
    },
    periodLabels() {
      return this.byPeriod?.map((entry) => this.formatPeriod(entry.period));
    },

    //Revenue
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
    hasAnyTenantEvents() {
      return this.byTenant.some((t) => Number(t.events || 0) > 0);
    },
    //Bookables
    bookablesTableHeaders() {
      return [
        { text: "#", value: "rank", sortable: false, width: "56px" },
        { text: "Objekt", value: "bookableTitle", sortable: false },
        {
          text: "Buchungen",
          value: "bookings",
          align: "end",
          sortable: true,
        },
        {
          text: "Stornos",
          value: "cancellations",
          align: "end",
          sortable: true,
        },
        { text: "Anteil", value: "share", sortable: false, width: "28%" },
      ];
    },
    rankedBookables() {
      const temp = [...this.byBookable].sort(
        (a, b) => Number(b.bookings || 0) - Number(a.bookings || 0)
      );
      return temp;
    },
    visibleBookables() {
      return this.rankedBookables;
    },
    showBookablesPagination() {
      return this.rankedBookables.length >= this.bookablesItemsPerPage;
    },
    maxBookableBookings() {
      const first = this.rankedBookables[0];
      return first ? Number(first.bookings || 0) : 0;
    },
    //Graph Options
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
    bookablesRankingOption() {
      const items = [...this.visibleBookables].reverse();
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: "value", minInterval: 1 },
        yAxis: {
          type: "category",
          data: items.map((item) => this.truncateTitle(item.bookableTitle)),
        },
        series: [
          {
            name: "Buchungen",
            type: "bar",
            data: items.map((item) => item.bookings),
            itemStyle: { color: "#00838F" },
          },
        ],
      };
    },
  },
  watch: {
    rankedBookables() {
      this.bookablesTablePage = 1;
    },
  },
  methods: {
    //Formating
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
    truncateTitle(title, max = 42) {
      const text = title || "Ohne Titel";
      return text.length > max ? `${text.slice(0, max)}…` : text;
    },
    getStatusCount(status) {
      return this.tenantPayload.byStatus.find((t) => t.status === status).count;
    },
  },
};
</script>

<style scoped>
.theme-card {
  border-top: 3px solid transparent;
}
.theme-card--bookables {
  border-top-color: #3f51b5;
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
