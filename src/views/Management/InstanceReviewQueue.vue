<template>
  <AdminLayout>
    <v-row class="mb-16">
      <v-col cols="12">
        <p class="text-body-2 text--secondary">
          {{ $t("supervision.queue.hint") }}
        </p>
        <div class="d-flex align-center flex-wrap mb-2">
          <v-select
            ref="tenantFilter"
            v-model="filters.tenantId"
            :items="tenants"
            item-text="name"
            item-value="id"
            :label="$t('supervision.queue.filters.tenant')"
            clearable
            dense
            outlined
            hide-details
            class="review-queue-filter mr-4 mb-2"
          />
          <v-select
            ref="offerTypeFilter"
            v-model="filters.offerType"
            :items="offerTypes"
            :label="$t('supervision.queue.filters.offer-type')"
            clearable
            dense
            outlined
            hide-details
            class="review-queue-filter mr-4 mb-2"
          />
          <v-spacer />
          <v-btn
            text
            color="primary"
            class="mb-2"
            :disabled="loading"
            data-test="review-queue-reload"
            @click="load"
          >
            <v-icon left small>mdi-refresh</v-icon>
            {{ $t("supervision.queue.reload") }}
          </v-btn>
        </div>
        <v-alert
          v-if="errorMessage"
          type="warning"
          text
          dense
          data-test="review-queue-error"
        >
          {{ errorMessage }}
        </v-alert>
        <!-- The order is the backend's (longest waiting first) and the page
             is cut there, so the table neither sorts nor paginates itself. -->
        <v-data-table
          v-else
          :headers="headers"
          :items="items"
          item-key="key"
          :server-items-length="total"
          :page="page"
          :items-per-page="pageSize"
          :footer-props="{
            'items-per-page-options': pageSizes,
            'items-per-page-text': $t('supervision.queue.per-page'),
          }"
          disable-sort
          :loading="loading"
          :loading-text="$t('supervision.queue.loading')"
          :no-data-text="$t('supervision.queue.empty')"
          class="accent elevation-1"
          @update:options="onOptions"
        >
          <template v-slot:item.offerType="{ item }">
            {{ offerTypeLabel(item.offerType) }}
          </template>
          <template v-slot:item.title="{ item }">
            {{ item.title || item.offerId }}
          </template>
          <template v-slot:item.submittedAt="{ item }">
            <template v-if="item.submittedAt">
              <div>{{ dateTime(item.submittedAt) }}</div>
              <div class="text-caption text--secondary">
                {{ waiting(item.submittedAt) }}
              </div>
            </template>
          </template>
          <template v-slot:item.isPublic="{ item }">
            {{
              $t(`supervision.queue.is-public.${item.isPublic ? "yes" : "no"}`)
            }}
          </template>
          <template v-slot:item.controls="{ item }">
            <v-btn
              v-if="item.location"
              small
              text
              color="primary"
              data-test="review-queue-open"
              @click="open(item)"
            >
              <v-icon left small>mdi-open-in-app</v-icon>
              {{ $t("supervision.queue.open") }}
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </AdminLayout>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin.vue";
import ApiReviewQueueService from "@/services/api/ApiReviewQueueService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ToastService from "@/services/ToastService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import { reviewQueueLocation } from "@/utils/reviewQueueLink";
import { SUPERVISION_LEVELS } from "@/utils/supervision";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const whole = (duration, unit) => Math.floor(duration / unit);

/**
 * The active review queue (glossary "Aktive Prüfliste"): the pending offers
 * of all supervised tenants, for instance owners. It lists and links only -
 * the review itself happens in the offer's editor. The backend computes the
 * queue on read, so every entry of the view loads it anew.
 */
export default {
  name: "InstanceReviewQueue",
  components: { AdminLayout },
  data() {
    return {
      loading: false,
      errorMessage: null,
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      pageSizes: [10, 25, 50, 100],
      filters: { tenantId: null, offerType: null },
      tenants: [],
    };
  },
  computed: {
    ...mapGetters({ currentTenantId: "tenants/currentTenantId" }),
    headers() {
      return [
        { text: this.$t("supervision.queue.columns.tenant"), value: "tenant" },
        {
          text: this.$t("supervision.queue.columns.offer-type"),
          value: "offerType",
        },
        { text: this.$t("supervision.queue.columns.title"), value: "title" },
        {
          text: this.$t("supervision.queue.columns.submitted-at"),
          value: "submittedAt",
        },
        {
          text: this.$t("supervision.queue.columns.is-public"),
          value: "isPublic",
        },
        { text: "", value: "controls", align: "end" },
      ];
    },
    offerTypes() {
      return ["bookable", "event"].map((value) => ({
        value,
        text: this.offerTypeLabel(value),
      }));
    },
  },
  watch: {
    filters: {
      deep: true,
      handler() {
        this.page = 1;
        this.load();
      },
    },
  },
  created() {
    this.load();
    this.fetchTenants();
  },
  methods: {
    ...mapActions({ selectTenant: "tenants/select", addToast: "toasts/add" }),
    async load() {
      // Loads overlap (filter, page, reload): the one asked for last wins.
      const run = (this.latestRun = {});
      this.loading = true;
      try {
        const queue = await ApiReviewQueueService.getReviewQueue({
          page: this.page,
          pageSize: this.pageSize,
          tenantId: this.filters.tenantId || null,
          offerType: this.filters.offerType || null,
        });
        if (run !== this.latestRun) return;
        this.errorMessage = null;
        this.items = (queue?.items || []).map((row) => ({
          ...row,
          key: `${row.offerType}:${row.tenantId}:${row.offerId}`,
          tenant: row.tenantName || row.tenantId,
          location: reviewQueueLocation(row),
        }));
        this.total = queue?.total || 0;
      } catch (error) {
        console.error(error);
        if (run !== this.latestRun) return;
        this.items = [];
        this.total = 0;
        this.errorMessage = getApiErrorMessage(
          error,
          this.$t("supervision.queue.load-failed")
        );
      } finally {
        if (run === this.latestRun) this.loading = false;
      }
    },
    async fetchTenants() {
      try {
        // Names only: the public projection, as Navbar and Dashboard read
        // it - of the supervised tenants, the only ones with a queue.
        this.tenants =
          (
            await ApiTenantService.getTenants(true, {
              supervisionLevel: SUPERVISION_LEVELS.SUPERVISED,
            })
          ).data || [];
      } catch (error) {
        console.error(error);
      }
    },
    onOptions({ page, itemsPerPage }) {
      if (page === this.page && itemsPerPage === this.pageSize) return;
      // Another page size cuts the queue anew: back to its first page.
      this.page = itemsPerPage === this.pageSize ? page : 1;
      this.pageSize = itemsPerPage;
      this.load();
    },
    /**
     * The editors work in the current tenant, and the row's path names none:
     * the row's tenant becomes the current one before the editor opens.
     */
    async open(item) {
      const previousTenantId = this.currentTenantId;
      await this.selectTenant(item.tenantId);
      if (previousTenantId && previousTenantId !== item.tenantId) {
        this.addToast(
          ToastService.createToast(
            "booking.page.tenant-switched",
            "info",
            5000,
            { name: item.tenant }
          )
        );
      }
      this.$router.push(item.location);
    },
    offerTypeLabel(offerType) {
      const key = `supervision.queue.offer-types.${offerType}`;
      return this.$te(key) ? this.$t(key) : offerType;
    },
    dateTime(value) {
      return new Date(value).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    waiting(submittedAt) {
      const waited = Math.max(0, Date.now() - new Date(submittedAt).getTime());
      if (waited >= DAY) {
        return this.$tc("supervision.queue.waiting.days", whole(waited, DAY));
      }
      if (waited >= HOUR) {
        return this.$tc("supervision.queue.waiting.hours", whole(waited, HOUR));
      }
      return this.$tc(
        "supervision.queue.waiting.minutes",
        Math.max(1, whole(waited, MINUTE))
      );
    },
  },
};
</script>

<style scoped>
.review-queue-filter {
  max-width: 280px;
}
</style>
