<template>
  <AdminLayout>
    <div class="page-content">
      <p class="text-body-2 text--secondary">
        {{ $t("supervision.notifications.hint") }}
      </p>

      <v-card flat class="mb-4">
        <v-card-text>
          <v-row dense align="center">
            <v-col cols="12" sm="4">
              <v-select
                v-model="status"
                :items="statusOptions"
                :label="$t('supervision.notifications.filter.status')"
                dense
                outlined
                hide-details
                data-test="notifications-status-filter"
                @change="reload"
              />
            </v-col>
            <v-col cols="12" sm="8" class="text-right">
              <v-btn
                outlined
                small
                :disabled="loading"
                data-test="notifications-reload"
                @click="load"
              >
                <v-icon left small>mdi-refresh</v-icon>
                {{ $t("supervision.notifications.reload") }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-alert
        v-if="loadError"
        type="warning"
        text
        dense
        data-test="notifications-load-error"
      >
        {{ loadError }}
      </v-alert>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :server-items-length="total"
        :options.sync="options"
        :footer-props="{ 'items-per-page-options': [25, 50, 100, 200] }"
        :no-data-text="emptyText"
        show-expand
        single-expand
        item-key="id"
        class="elevation-1"
      >
        <template #[`item.createdAt`]="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>
        <template #[`item.type`]="{ item }">
          {{ typeLabel(item.type) }}
        </template>
        <template #[`item.tenant`]="{ item }">
          {{ tenantName(item) }}
        </template>
        <template #[`item.offers`]="{ item }">
          {{ offerTitles(item).join(", ") || "—" }}
        </template>
        <template #[`item.deliveries`]="{ item }">
          {{ deliveredTo(item).join(", ") || "—" }}
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip small label outlined :color="statusColor(item.status)">
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>
        <template #[`item.lastError`]="{ item }">
          <span
            v-if="item.lastError"
            class="d-inline-block text-truncate notification-error"
            :title="item.lastError"
          >
            {{ item.lastError }}
          </span>
          <span v-else>—</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn
            v-if="item.status === 'failed'"
            small
            text
            color="primary"
            :disabled="isRetrying(item)"
            :loading="isRetrying(item)"
            :data-test="`notification-retry-${item.id}`"
            @click="retry(item)"
          >
            <v-icon left small>mdi-email-sync-outline</v-icon>
            {{ $t("supervision.notifications.retry.action") }}
          </v-btn>
        </template>
        <template #expanded-item="{ headers: columns, item }">
          <td :colspan="columns.length" class="py-3">
            <div v-if="item.lastError" class="mb-2">
              <div class="text-caption text--secondary">
                {{ $t("supervision.notifications.columns.last-error") }}
              </div>
              <div class="text-body-2 notification-error-full">
                {{ item.lastError }}
              </div>
            </div>
            <div class="text-caption text--secondary">
              {{ $t("supervision.notifications.details.deliveries") }}
            </div>
            <div v-if="!item.deliveries || !item.deliveries.length">
              {{ $t("supervision.notifications.details.no-deliveries") }}
            </div>
            <div
              v-for="delivery in item.deliveries || []"
              :key="`${delivery.mailType} ${delivery.to}`"
              class="text-body-2"
            >
              {{ delivery.to }} · {{ formatDate(delivery.deliveredAt) }}
            </div>
            <div v-if="item.sentAt" class="text-body-2 mt-2">
              {{
                $t("supervision.notifications.details.sent-at", {
                  time: formatDate(item.sentAt),
                })
              }}
            </div>
          </td>
        </template>
      </v-data-table>
    </div>
  </AdminLayout>
</template>

<script>
import { mapActions } from "vuex";
import AdminLayout from "@/layouts/Admin.vue";
import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import {
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  notificationOfferTitles,
  notificationTenantName,
} from "@/utils/supervisionNotifications";

/**
 * The outbox of the supervision notices (glossary "Aufsichtsmitteilung") for
 * the instance owner: what did not go out, and sending it again. A retry
 * sends the mail only - the decision behind it and its history stay as they
 * are.
 */
export default {
  name: "SupervisionNotifications",
  components: { AdminLayout },
  data() {
    return {
      status: "failed",
      items: [],
      total: 0,
      loading: false,
      loadError: null,
      retrying: {},
      options: { page: 1, itemsPerPage: 50 },
    };
  },
  computed: {
    headers() {
      const column = (value, key, extra = {}) => ({
        text: this.$t(`supervision.notifications.columns.${key}`),
        value,
        sortable: false,
        ...extra,
      });
      return [
        column("createdAt", "created-at"),
        column("type", "type"),
        column("tenant", "tenant"),
        column("offers", "offers"),
        column("deliveries", "deliveries"),
        column("status", "status"),
        column("attempts", "attempts", { align: "end" }),
        column("lastError", "last-error"),
        { text: "", value: "actions", sortable: false, align: "end" },
        { text: "", value: "data-table-expand" },
      ];
    },
    statusOptions() {
      return [
        ...NOTIFICATION_STATUSES.map((value) => ({
          value,
          text: this.statusLabel(value),
        })),
        { value: null, text: this.$t("supervision.notifications.filter.all") },
      ];
    },
    emptyText() {
      return this.$t(
        this.status === "failed"
          ? "supervision.notifications.empty-failed"
          : "supervision.notifications.empty"
      );
    },
  },
  watch: {
    options: { handler: "load", deep: true, immediate: true },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    reload() {
      if (this.options.page !== 1) {
        this.options.page = 1;
      } else {
        this.load();
      }
    },
    async load() {
      // Loads overlap (filter, paging, reload after a retry): the last wins.
      const run = (this.latestRun = {});
      this.loading = true;
      this.loadError = null;
      try {
        const result = await ApiSupervisionNotificationService.getNotifications(
          {
            status: this.status,
            page: this.options.page,
            pageSize: this.options.itemsPerPage,
          }
        );
        if (run !== this.latestRun) return;
        this.items = result?.items || [];
        this.total = result?.total || 0;
      } catch (error) {
        console.error(error);
        if (run !== this.latestRun) return;
        this.items = [];
        this.total = 0;
        this.loadError = getApiErrorMessage(
          error,
          this.$t("supervision.notifications.load-failed")
        );
      } finally {
        if (run === this.latestRun) this.loading = false;
      }
    },
    isRetrying(item) {
      return this.retrying[item.id] === true;
    },
    async retry(item) {
      // One retry per row at a time: a second click must not send twice.
      if (this.isRetrying(item)) return;
      this.$set(this.retrying, item.id, true);
      try {
        const row = await ApiSupervisionNotificationService.retry(item.id);
        await this.addToast(this.retryResultToast(row));
      } catch (error) {
        await this.addToast({
          message: getApiErrorMessage(
            error,
            this.$t("supervision.notifications.retry.request-failed")
          ),
          type: "error",
        });
      } finally {
        this.$delete(this.retrying, item.id);
      }
      // Also after a refusal: the row is then not what the list shows.
      await this.load();
    },
    retryResultToast(row) {
      if (row?.status === "sent") {
        return {
          message: this.$t("supervision.notifications.retry.sent"),
          type: "success",
        };
      }
      return {
        message: this.$t("supervision.notifications.retry.failed-again", {
          error: row?.lastError || "—",
        }),
        type: "error",
      };
    },
    typeLabel(type) {
      return NOTIFICATION_TYPES.includes(type)
        ? this.$t(`supervision.notifications.types.${type.replace(".", "-")}`)
        : type;
    },
    statusLabel(status) {
      return NOTIFICATION_STATUSES.includes(status)
        ? this.$t(`supervision.notifications.statuses.${status}`)
        : status;
    },
    statusColor(status) {
      if (status === "sent") return "success";
      return status === "failed" ? "error" : "grey";
    },
    tenantName: notificationTenantName,
    offerTitles: notificationOfferTitles,
    deliveredTo(item) {
      return [...new Set((item.deliveries || []).map(({ to }) => to))];
    },
    formatDate(value) {
      if (!value) return "—";
      return new Date(value).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
};
</script>

<style scoped>
.notification-error {
  max-width: 260px;
  vertical-align: bottom;
}
.notification-error-full {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
