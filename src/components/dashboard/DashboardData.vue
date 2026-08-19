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
          <v-card outlined class="fill-height chart-card">
            <v-card-title
              class="subtitle-1 d-flex align-center justify-space-between"
            >
              <span>Buchungen im Zeitverlauf</span>
              <v-btn
                icon
                small
                @click="
                  openChartDialog(
                    'Buchungen im Zeitverlauf',
                    bookingsOverTimeOption
                  )
                "
                aria-label="Vollansicht"
              >
                <v-icon small>mdi-fullscreen</v-icon>
              </v-btn>
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

                <!-- Mobile / Tablet schmal: Kartenliste + dezente Sortierung -->
                <div v-else class="pa-1">
                  <div class="bookables-mobile-sort pa-3 pb-0">
                    <v-btn-toggle
                      v-model="bookablesSortMode"
                      dense
                      mandatory
                      color="primary"
                      class="bookables-sort-toggle"
                      aria-label="Buchungsobjekte sortieren"
                    >
                      <v-btn value="bookings" small>
                        <v-icon small left color="grey darken-1"
                          >mdi-sort</v-icon
                        >
                        Buchungen
                      </v-btn>
                      <v-btn value="cancellations" small>
                        <v-icon small left color="grey darken-1"
                          >mdi-sort</v-icon
                        >
                        Stornos
                      </v-btn>
                    </v-btn-toggle>
                  </div>

                  <div class="bookables-mobile-list pa-3 pt-2">
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
          <v-card outlined class="fill-height chart-card">
            <v-card-title
              class="subtitle-1 d-flex align-center justify-space-between"
            >
              <span>Umsatz im Zeitverlauf</span>
              <v-btn
                icon
                small
                @click="
                  openChartDialog(
                    'Umsatz im Zeitverlauf',
                    revenueOverTimeOption
                  )
                "
                aria-label="Vollansicht"
              >
                <v-icon small>mdi-fullscreen</v-icon>
              </v-btn>
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
            <v-card-title
              class="subtitle-1 d-flex align-center justify-space-between"
            >
              <span>Anteil der Benutzer:innen</span>
              <v-btn
                icon
                small
                @click="
                  openChartDialog(
                    'Anteil der Benutzer:innen',
                    usersByTenantOption
                  )
                "
                aria-label="Vollansicht"
              >
                <v-icon small>mdi-fullscreen</v-icon>
              </v-btn>
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
          <v-card outlined class="fill-height chart-card">
            <v-card-title
              class="subtitle-1 d-flex align-center justify-space-between"
            >
              <span>Buchungsobjekte &amp; Events je Mandant</span>
              <v-btn
                icon
                small
                @click="
                  openChartDialog(
                    'Buchungsobjekte & Events je Mandant',
                    offerByTenantOption
                  )
                "
                aria-label="Vollansicht"
              >
                <v-icon small>mdi-fullscreen</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text class="chart-card-text">
              <div class="chart-hscroll">
                <dashboard-chart
                  :option="offerByTenantOption"
                  :height="chartHeight"
                  :min-width="offerChartMinWidth"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Chart Dialog -->
    <v-dialog
      v-model="chartDialog.open"
      :fullscreen="isChartDialogNarrow"
      :max-width="chartDialogMaxWidth"
      persistent
    >
      <v-card
        class="chart-dialog-card"
        :class="{ 'chart-dialog-card--fullscreen': isChartDialogNarrow }"
      >
        <v-card-title class="chart-dialog-title subtitle-1">
          <span class="chart-dialog-title-text">{{ chartDialog.title }}</span>

          <v-btn icon small @click="closeChartDialog" aria-label="Schließen">
            <v-icon small>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="chart-dialog-body">
          <div class="chart-dialog-actions">
            <v-btn
              small
              color="primary"
              outlined
              @click="exportDialogChartImage"
            >
              <v-icon left small>mdi-download</v-icon>
              Bild (PNG)
            </v-btn>
            <v-btn small outlined @click="exportDialogChartData">
              <v-icon left small>mdi-file-download</v-icon>
              Datenbasis (JSON)
            </v-btn>
          </div>

          <div ref="dialogChartEl" class="dialog-chart-el" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import DashboardChart from "@/components/dashboard/DashboardChart.vue";
import * as echarts from "echarts";

export default {
  name: "DashboardDataCombo",
  components: { DashboardChart },

  data() {
    return {
      showOfferSection: false,
      bookablesTablePage: 1,
      bookablesItemsPerPage: 10,

      bookablesSortMode: "bookings", // 'bookings' | 'cancellations'

      statusOptions: [
        { label: "Zahlung ausstehend", value: "status.payment_expected" },
        { label: "Bezahlt / Abgeschlossen", value: "status.paid_completed" },
        {
          label: "Bestätigt ohne Zahlung",
          value: "status.confirmed_without_payment",
        },
      ],

      chartDialog: {
        open: false,
        title: "",
        option: null,
      },

      dialogChartInstance: null,
      dialogResizeHandler: null,
      dialogResizeObserver: null,
    };
  },

  props: {
    dashboardData: { type: Object, default: null },
    tenantData: { type: Object, default: null },
    selectedStatus: { type: Array, default: () => [] },
  },

  computed: {
    isDesktop() {
      return this.$vuetify.breakpoint.mdAndUp;
    },

    chartHeight() {
      return this.$vuetify.breakpoint.smAndDown ? "240px" : "300px";
    },

    isChartDialogNarrow() {
      return this.$vuetify.breakpoint.smAndDown;
    },

    chartDialogMaxWidth() {
      if (this.$vuetify.breakpoint.xsOnly) return undefined;
      if (this.$vuetify.breakpoint.smOnly) return "96vw";
      return "1200px";
    },

    // Horizontaler Scroll nur bei Buchungsobjekten je Mandant
    offerChartMinWidth() {
      return this.chartScrollMinWidth((this.byTenant || []).length, 80);
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
      if (this.hasTenantPayload) return this.tenantPayload.byPeriod || [];
      return this.payload.byPeriod || [];
    },

    byBookable() {
      if (this.hasTenantPayload) return this.tenantPayload.byBookable || [];
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
        { text: "Buchungen", value: "bookings", align: "end", sortable: true },
        {
          text: "Stornos",
          value: "cancellations",
          align: "end",
          sortable: true,
        },
        { text: "Anteil", value: "share", sortable: false, width: "28%" },
      ];
    },

    // Sortierung für schmale Screens (sonst bleibt default 'bookings')
    rankedBookables() {
      const key =
        this.bookablesSortMode === "cancellations"
          ? "cancellations"
          : "bookings";

      return [...this.byBookable].sort(
        (a, b) => Number(b[key] || 0) - Number(a[key] || 0)
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

    // Share basiert immer auf max. Buchungen (unabhängig von Sortiermodus)
    maxBookableBookings() {
      const bookings = (this.rankedBookables || []).map((x) =>
        Number(x.bookings || 0)
      );
      return bookings.length ? Math.max(...bookings) : 0;
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
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          appendTo: "body",
        },
        legend: { top: 0, left: 0 },
        grid: {
          left: 8,
          right: 16,
          top: 40,
          bottom: manyTenants ? 16 : 8,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: tenantNames,
          axisLabel: {
            interval: 0,
            hideOverlap: false,
            rotate: manyTenants ? 35 : 0,
            formatter: (value) => {
              const text = String(value || "");
              if (manyTenants && text.length > 18)
                return `${text.slice(0, 18)}…`;
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

    bookingsOverTimeOption() {
      return {
        tooltip: { trigger: "axis", appendTo: "body" },
        legend: { top: 0 },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: this.periodLabels,
          axisLabel: {
            interval: "auto",
            hideOverlap: true,
          },
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
          appendTo: "body",
          valueFormatter: (value) => this.formatCurrency(value),
        },
        legend: { show: false },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: this.periodLabels,
          axisLabel: {
            interval: "auto",
            hideOverlap: true,
          },
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
    "chartDialog.open"(isOpen) {
      if (isOpen) {
        this.$nextTick(() => this.initDialogChart());
      } else {
        this.disposeDialogChart();
      }
    },
    "$vuetify.breakpoint.name"() {
      if (!this.chartDialog.open || !this.dialogChartInstance) return;
      this.$nextTick(() => this.refreshDialogChart());
    },
  },

  beforeDestroy() {
    this.disposeDialogChart();
  },

  methods: {
    chartScrollMinWidth(labelCount, pxPerLabel = 72) {
      const count = Number(labelCount) || 0;
      if (count <= 10) return "";
      return `${Math.max(count * pxPerLabel, 720)}px`;
    },

    openChartDialog(title, option) {
      this.chartDialog.title = title;
      // option contains functions (valueFormatter/formatter). ECharts accepts them.
      // For export-data we will extract only the series/data.
      this.chartDialog.option = option;
      this.chartDialog.open = true;
    },

    closeChartDialog() {
      this.chartDialog.open = false;
    },

    toDialogOption(option) {
      if (!option) return option;

      const isNarrow = this.isChartDialogNarrow;
      const xData = option.xAxis && option.xAxis.data;
      const manyCategories = Array.isArray(xData) && xData.length > 8;
      const isPie = (option.series || []).some((s) => s && s.type === "pie");
      const isBar = (option.series || []).some((s) => s && s.type === "bar");
      const legendHidden = option.legend && option.legend.show === false;

      const dialogOption = {
        ...option,
        tooltip: {
          ...(option.tooltip || {}),
          appendTo: "body",
        },
      };

      if (option.grid || !isPie) {
        dialogOption.grid = {
          ...(option.grid || {}),
          left: isNarrow ? 4 : 12,
          right: isNarrow ? 8 : 16,
          top: legendHidden ? 16 : 44,
          bottom: manyCategories ? (isNarrow ? 12 : 20) : 8,
          containLabel: true,
        };
      }

      if (option.xAxis) {
        dialogOption.xAxis = {
          ...option.xAxis,
          axisLabel: {
            ...(option.xAxis.axisLabel || {}),
            interval: "auto",
            hideOverlap: true,
            rotate: isBar && manyCategories ? (isNarrow ? 50 : 30) : 0,
            fontSize: isNarrow ? 10 : 12,
          },
        };
      }

      if (isPie) {
        dialogOption.legend = {
          ...(option.legend || {}),
          type: "scroll",
          orient: "horizontal",
          left: "center",
          bottom: 0,
          textStyle: {
            ...((option.legend && option.legend.textStyle) || {}),
            fontSize: isNarrow ? 10 : 12,
          },
        };
        dialogOption.series = (option.series || []).map((s) => {
          if (!s || s.type !== "pie") return s;
          return {
            ...s,
            center: ["50%", isNarrow ? "40%" : "42%"],
            radius: isNarrow ? ["38%", "60%"] : ["45%", "70%"],
          };
        });
      }

      return dialogOption;
    },

    initDialogChart() {
      this.disposeDialogChart();

      const el = this.$refs.dialogChartEl;
      if (!el || !this.chartDialog.option) return;

      this.dialogChartInstance = echarts.init(el, null, { renderer: "canvas" });
      this.dialogChartInstance.setOption(
        this.toDialogOption(this.chartDialog.option),
        {
          notMerge: true,
          lazyUpdate: false,
        }
      );

      this.dialogResizeHandler = () => this.refreshDialogChart();
      window.addEventListener("resize", this.dialogResizeHandler);

      if (typeof ResizeObserver !== "undefined") {
        this.dialogResizeObserver = new ResizeObserver(() => {
          if (this.dialogChartInstance) this.dialogChartInstance.resize();
        });
        this.dialogResizeObserver.observe(el);
      }

      this.$nextTick(() => {
        requestAnimationFrame(() => {
          if (this.dialogChartInstance) this.dialogChartInstance.resize();
        });
      });
    },

    refreshDialogChart() {
      if (!this.dialogChartInstance || !this.chartDialog.option) return;
      this.dialogChartInstance.setOption(
        this.toDialogOption(this.chartDialog.option),
        { notMerge: true }
      );
      this.dialogChartInstance.resize();
    },

    disposeDialogChart() {
      if (this.dialogResizeHandler) {
        window.removeEventListener("resize", this.dialogResizeHandler);
      }
      this.dialogResizeHandler = null;

      if (this.dialogResizeObserver) {
        this.dialogResizeObserver.disconnect();
        this.dialogResizeObserver = null;
      }

      if (this.dialogChartInstance) {
        this.dialogChartInstance.dispose();
      }
      this.dialogChartInstance = null;
    },

    exportDialogChartImage() {
      if (!this.dialogChartInstance) return;

      const title = this.chartDialog.title || "chart";
      const fileName = title.replace(/[^\w\d-_]+/g, "_").slice(0, 80);

      // PNG export
      const dataUrl = this.dialogChartInstance.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    exportDialogChartData() {
      const title = this.chartDialog.title || "chart";
      const option = this.chartDialog.option || {};

      const payload = {
        title,
        // nur die Daten extrahieren (damit kein JSON an Functions scheitert)
        xAxis: option.xAxis?.data || null,
        series: (option.series || []).map((s) => ({
          name: s.name || null,
          type: s.type || null,
          data: s.data || null,
        })),
      };

      const fileName = title.replace(/[^\w\d-_]+/g, "_").slice(0, 80);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    },

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
.dashboard-data-combo >>> .v-col {
  min-width: 0;
}

.chart-card {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

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

/* Tabellen */
.dashboard-bookables-table::v-deep th,
.dashboard-bookables-table::v-deep td {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

/* Bookables mobile */
.bookables-mobile-sort {
  opacity: 0.95;
}

.bookables-sort-toggle::v-deep .v-btn {
  min-width: 0 !important;
  padding-left: 10px !important;
  padding-right: 10px !important;
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

/* Charts: Breite an die Karte binden; nur Mandanten-Chart innen scrollen */
.chart-card-text {
  overflow: hidden;
}

.chart-hscroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 6px;
}

.chart-hscroll >>> .dashboard-chart {
  display: block;
}

/* Dialog: gesamte Graphik sichtbar, ohne Scroll */
.chart-dialog-card {
  display: flex;
  flex-direction: column;
  height: min(90vh, 800px);
  max-height: 90vh;
}

.chart-dialog-card--fullscreen {
  height: 100%;
  max-height: 100%;
}

.chart-dialog-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 8px;
}

.chart-dialog-title-text {
  flex: 1 1 auto;
  min-width: 0;
  padding-right: 8px;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}

.chart-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 16px !important;
}

.chart-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 0 auto;
  margin-bottom: 12px;
}

.dialog-chart-el {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 220px;
}

/* Smartphone */
@media (max-width: 599px) {
  .bookables-mobile-list {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  .bookables-mobile-pagination::v-deep .v-pagination {
    justify-content: center;
  }
  .chart-dialog-body {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  .dialog-chart-el {
    min-height: 240px;
  }
}
</style>
