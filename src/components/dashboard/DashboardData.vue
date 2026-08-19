<template>
  <v-container fluid class="dashboard-data-combo">
    <!-- Aktivitäten -->
    <section class="mb-8">
      <h2 class="text-h6 mb-3">
        <v-icon left color="teal">mdi-shopping</v-icon>
        Aktivitäten
        <span
          v-if="tenantAndStatusLabel"
          class="subtitle-2 grey--text font-weight-regular d-block d-sm-inline mt-1 mt-sm-0"
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
                :height="chartHeight"
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
            <span
              class="subtitle-2 grey--text font-weight-regular d-block d-sm-inline mt-1 mt-sm-0"
            >
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
              <v-card outlined>
                <!-- Desktop: Tabelle -->
                <v-data-table
                  v-if="isDesktop"
                  dense
                  :headers="bookablesTableHeaders"
                  :items="rankedBookables"
                  :items-per-page="bookablesItemsPerPage"
                  :page.sync="bookablesTablePage"
                  :hide-default-footer="!showBookablesPagination"
                  class="elevation-0 dashboard-bookables-table"
                >
                  <template #item.rank="{ index }">
                    {{ bookableRank(index) }}
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
                      :value="bookableShare(item)"
                      height="8"
                      color="cyan darken-2"
                      rounded
                    />
                  </template>
                  <template #footer.prepend>
                    <div v-if="tenantPayload.byBookableHasMore" class="mr-4">
                      <v-btn
                        small
                        outlined
                        color="primary"
                        @click="loadMoreBookables"
                      >
                        Weitere laden
                      </v-btn>
                    </div>
                  </template>
                  <template #no-data>Keine Buchungsobjekte vorhanden.</template>
                </v-data-table>

                <!-- Mobile / Tablet schmal: Kartenliste -->
                <div v-else class="bookables-mobile-list pa-3">
                  <div
                    v-if="!paginatedBookables.length"
                    class="caption grey--text text-center py-6"
                  >
                    Keine Buchungsobjekte vorhanden.
                  </div>

                  <v-card
                    v-for="(item, index) in paginatedBookables"
                    :key="item.bookableId"
                    outlined
                    class="bookable-mobile-card mb-3"
                  >
                    <v-card-text class="py-3">
                      <div
                        class="d-flex justify-space-between align-start mb-2"
                      >
                        <v-chip x-small label color="indigo lighten-5">
                          #{{ bookableRank(index) }}
                        </v-chip>
                        <div class="text-right">
                          <div class="font-weight-medium">
                            {{ formatNumber(item.bookings) }} Buchungen
                          </div>
                          <div class="caption grey--text">
                            {{ formatNumber(item.cancellations) }} Stornos
                          </div>
                        </div>
                      </div>

                      <div class="bookable-mobile-title mb-2">
                        {{ item.bookableTitle || "Ohne Titel" }}
                      </div>

                      <v-progress-linear
                        :value="bookableShare(item)"
                        height="8"
                        color="cyan darken-2"
                        rounded
                      />
                    </v-card-text>
                  </v-card>

                  <div
                    class="bookables-mobile-footer d-flex flex-wrap align-center justify-space-between"
                  >
                    <v-btn
                      v-if="tenantPayload.byBookableHasMore"
                      small
                      outlined
                      color="primary"
                      class="mb-2"
                      @click="loadMoreBookables"
                    >
                      Weitere laden
                    </v-btn>

                    <div
                      v-if="bookablesPageCount > 1"
                      class="bookables-mobile-pagination mb-2"
                    >
                      <v-pagination
                        v-model="bookablesTablePage"
                        :length="bookablesPageCount"
                        :total-visible="5"
                        circle
                      />
                    </div>
                  </div>
                </div>
              </v-card>
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
          class="subtitle-2 grey--text font-weight-regular d-block d-sm-inline mt-1 mt-sm-0"
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
              <dashboard-chart
                :option="revenueOverTimeOption"
                :height="chartHeight"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Angebote -->
    <section v-if="!hasTenantPayload" class="mb-8">
      <div
        class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-3"
      >
        <h2 class="text-h6 mb-2 mb-sm-0">
          <v-icon left color="primary">mdi-office-building</v-icon>
          Angebote
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
              <dashboard-chart
                :option="usersByTenantOption"
                :height="chartHeight"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="5">
          <v-card outlined class="fill-height">
            <v-card-title class="subtitle-1">
              Buchungsobjekte &amp; Events je Mandant
            </v-card-title>
            <v-card-text>
              <dashboard-chart
                :option="offerByTenantOption"
                :height="chartHeight"
              />
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
      default: () => [],
    },
  },
  computed: {
    isDesktop() {
      return this.$vuetify.breakpoint.mdAndUp;
    },
    chartHeight() {
      return this.$vuetify.breakpoint.smAndDown ? "240px" : "300px";
    },
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
    tenantAndStatusLabel() {
      const values = [];

      if (this.tenantData?.data?.tenantName) {
        values.push(this.tenantData.data.tenantName);
      }

      if ((this.selectedStatus || []).length > 0) {
        const STATUS_LABELS = {
          "status.payment_expected": "Zahlung erwartet",
          "status.awaiting_approval": "Genehmigung ausstehend",
          "status.approved": "Genehmigt",
          "status.rejected": "Abgelehnt",
          "status.cancelled": "Storniert",
        };
        const statusLabels = this.selectedStatus.map(
          (status) => STATUS_LABELS[status] || status
        );
        values.push(`Status: ${statusLabels.join(", ")}`);
      }

      return values.join(" · ");
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
    hasAnyTenantEvents() {
      return this.byTenant.some((t) => Number(t.events || 0) > 0);
    },
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
      return [...this.byBookable].sort(
        (a, b) => Number(b.bookings || 0) - Number(a.bookings || 0)
      );
    },
    paginatedBookables() {
      const start = (this.bookablesTablePage - 1) * this.bookablesItemsPerPage;
      return this.rankedBookables.slice(
        start,
        start + this.bookablesItemsPerPage
      );
    },
    bookablesPageCount() {
      return Math.max(
        1,
        Math.ceil(this.rankedBookables.length / this.bookablesItemsPerPage)
      );
    },
    showBookablesPagination() {
      return (
        this.rankedBookables.length >= this.bookablesItemsPerPage ||
        !!this.tenantPayload.byBookableHasMore
      );
    },
    maxBookableBookings() {
      const first = this.rankedBookables[0];
      return first ? Number(first.bookings || 0) : 0;
    },
    usersByTenantOption() {
      const manyTenants = (this.byTenant || []).length > 8;
      return {
        tooltip: {
          trigger: "item",
          formatter: "{b}: {c} ({d}%)",
        },
        legend: {
          type: "scroll",
          orient: "horizontal",
          left: "center",
          bottom: 0,
          height: 52,
          itemGap: 8,
          pageIconSize: 8,
          textStyle: {
            fontSize: 10,
            width: manyTenants ? 60 : 100,
            overflow: "truncate",
          },
        },
        series: [
          {
            type: "pie",
            radius: ["45%", "70%"],
            center: ["50%", manyTenants ? "40%" : "42%"],
            avoidLabelOverlap: true,
            label: {
              show: !manyTenants,
              formatter: "{c}",
            },
            labelLine: { show: !manyTenants },
            data: this.byTenant?.map((t) => ({
              name: t.tenantName,
              value: t.users,
            })),
          },
        ],
      };
    },
    offerByTenantOption() {
      const tenantNames = this.byTenant?.map((t) => t.tenantName) || [];
      const manyTenants = tenantNames.length > 8;
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0 },
        grid: {
          left: 8,
          right: 16,
          top: 40,
          bottom: manyTenants ? 48 : 8,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: tenantNames,
          axisLabel: {
            interval: 0,
            hideOverlap: true,
            rotate: manyTenants ? 35 : 0,
            formatter: (value) => {
              const text = String(value || "");
              if (manyTenants && text.length > 14) {
                return `${text.slice(0, 14)}…`;
              }
              return text.replace(/( )/g, "$1\n").trim();
            },
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
    /*usersByTenantOption() {
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
    },*/
    /*offerByTenantOption() {
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0 },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          data: this.byTenant?.map((t) => t.tenantName),
          axisLabel: {
            interval: 0,
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
    },*/
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
            smooth: true,
            data: this.byPeriod?.map((entry) => entry.revenueEur),
            itemStyle: { color: "#43a047" },
            areaStyle: { color: "rgba(0, 137, 123, 0.12)" },
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
    loadMoreBookables() {
      const currentLimit = Number(this.tenantPayload.byBookableLimit || 0);
      this.$emit("more-bookables", currentLimit + 50);
    },
    bookableRank(index) {
      return (
        (this.bookablesTablePage - 1) * this.bookablesItemsPerPage + index + 1
      );
    },
    bookableShare(item) {
      return this.maxBookableBookings
        ? (Number(item.bookings || 0) / this.maxBookableBookings) * 100
        : 0;
    },
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
        return this.$vuetify.breakpoint.smAndDown
          ? `KW ${weekMatch[2]}`
          : `${weekMatch[1]}\n KW ${weekMatch[2]}`;
      }
      return String(value);
    },
    truncateTitle(title, max = 42) {
      const text = title || "Ohne Titel";
      return text.length > max ? `${text.slice(0, max)}…` : text;
    },
    getStatusCount(status) {
      const entry = (this.tenantPayload.byStatus || []).find(
        (t) => t.status === status
      );
      return entry ? entry.count : 0;
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

.dashboard-bookables-table::v-deep th,
.dashboard-bookables-table::v-deep td {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

.bookable-mobile-title {
  font-size: 0.95rem;
  line-height: 1.35;
  word-break: break-word;
}

.bookables-mobile-footer {
  gap: 12px;
}

.bookables-mobile-pagination {
  width: 100%;
  display: flex;
  justify-content: center;
}

@media (max-width: 599px) {
  .bookables-mobile-list {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .bookables-mobile-pagination::v-deep .v-pagination {
    justify-content: center;
  }
}
</style>
