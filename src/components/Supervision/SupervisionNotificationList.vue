<template>
  <div class="notification-list" data-test="notification-list">
    <p class="notification-list__lead">
      {{ $t("supervision.notifications.hint") }}
    </p>
    <div class="notification-list__filters">
      <v-select
        v-model="status"
        :items="statusOptions"
        :label="$t('supervision.notifications.filter.status')"
        dense
        outlined
        hide-details
        class="notification-list__filter"
        data-test="notifications-status-filter"
        @change="reload"
      />
      <v-spacer />
      <v-btn
        text
        small
        color="primary"
        :disabled="loading"
        data-test="notifications-reload"
        @click="load"
      >
        <v-icon left small>mdi-refresh</v-icon>
        {{ $t("supervision.notifications.reload") }}
      </v-btn>
    </div>

    <v-alert
      v-if="errorMessage"
      type="warning"
      text
      dense
      data-test="notifications-load-error"
    >
      {{ errorMessage }}
    </v-alert>
    <v-data-iterator
      v-else
      :items="items"
      item-key="id"
      :server-items-length="total"
      :page="options.page"
      :items-per-page="options.itemsPerPage"
      :footer-props="{
        'items-per-page-options': [25, 50, 100, 200],
        'items-per-page-text': $t('supervision.notifications.per-page'),
        'page-text': $t('supervision.notifications.page-text'),
      }"
      :loading="loading"
      :loading-text="$t('supervision.notifications.loading')"
      :no-data-text="emptyText"
      disable-sort
      @update:options="onOptions"
    >
      <template #default="{ items: rows }">
        <div class="booking-rows">
          <div
            v-for="item in rows"
            :key="item.id"
            class="booking-row notification-list__row"
            :data-test="`notification-row-${item.id}`"
          >
            <div class="booking-row__main">
              <div class="notification-list__head">
                <span class="booking-row__title">{{
                  typeLabel(item.type)
                }}</span>
                <v-chip
                  x-small
                  label
                  outlined
                  :color="statusColor(item.status)"
                >
                  {{ statusLabel(item.status) }}
                </v-chip>
              </div>
              <div class="notification-list__line">
                {{ tenantName(item) }}
                <template v-if="offerTitles(item).length">
                  – {{ offerTitles(item).join(", ") }}
                </template>
              </div>
              <div class="notification-list__meta">
                {{ formatDate(item.createdAt) }} ·
                {{
                  $tc(
                    "supervision.notifications.row.attempts",
                    item.attempts || 0
                  )
                }}
                <template v-if="item.sentAt">
                  ·
                  {{
                    $t("supervision.notifications.details.sent-at", {
                      time: formatDate(item.sentAt),
                    })
                  }}
                </template>
              </div>
              <div class="notification-list__meta">
                <template v-if="deliveredTo(item).length">
                  {{
                    $t("supervision.notifications.row.delivered-to", {
                      to: deliveredTo(item).join(", "),
                    })
                  }}
                </template>
                <template v-else>
                  {{ $t("supervision.notifications.details.no-deliveries") }}
                </template>
              </div>
              <div v-if="item.lastError" class="notification-list__error">
                {{ item.lastError }}
              </div>
            </div>
            <div class="booking-row__aside">
              <v-btn
                v-if="isRetryable(item)"
                small
                text
                color="primary"
                :disabled="isRetrying(item)"
                :loading="isRetrying(item)"
                :data-test="`notification-retry-${item.id}`"
                @click="retryNotification(item)"
              >
                <v-icon left small>mdi-email-sync-outline</v-icon>
                {{ $t("supervision.notifications.retry.action") }}
              </v-btn>
            </div>
          </div>
        </div>
      </template>
    </v-data-iterator>
  </div>
</template>

<script>
import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";
import pagedLoad from "@/mixins/pagedLoad";
import notificationRetry from "@/mixins/notificationRetry";
import {
  NOTIFICATION_STATUSES,
  notificationOfferTitles,
  notificationStatusColor,
  notificationTenantName,
} from "@/utils/supervisionNotifications";

/**
 * The whole outbox of the supervision notices (glossary
 * "Aufsichtsmitteilung"): opens on what did not go out, the status filter
 * shows the rest. Drawn as hairline rows, one per notice, with the retry
 * beside it. Lives in the dialog the review queue's panel opens.
 */
export default {
  name: "SupervisionNotificationList",
  mixins: [pagedLoad, notificationRetry],
  data() {
    return {
      status: "failed",
      options: { page: 1, itemsPerPage: 50 },
    };
  },
  computed: {
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
  created() {
    this.load();
  },
  methods: {
    reload() {
      this.options.page = 1;
      this.load();
    },
    load() {
      return this.loadPaged(
        () =>
          ApiSupervisionNotificationService.getNotifications({
            status: this.status,
            page: this.options.page,
            pageSize: this.options.itemsPerPage,
          }),
        "supervision.notifications.load-failed"
      );
    },
    onOptions({ page, itemsPerPage }) {
      const { options } = this;
      if (page === options.page && itemsPerPage === options.itemsPerPage) {
        return;
      }
      // Another page size cuts the list anew: back to its first page.
      this.options = {
        page: itemsPerPage === options.itemsPerPage ? page : 1,
        itemsPerPage,
      };
      this.load();
    },
    statusColor: notificationStatusColor,
    tenantName: notificationTenantName,
    offerTitles: notificationOfferTitles,
    deliveredTo(item) {
      return [...new Set((item.deliveries || []).map(({ to }) => to))];
    },
  },
};
</script>

<style scoped>
.notification-list__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.notification-list__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
  margin-bottom: var(--scb-space-3);
}

.notification-list__filter {
  max-width: 240px;
}

/* A notice takes several lines; the retry stays at its first one. */
.notification-list__row {
  align-items: flex-start;
  padding: var(--scb-space-3) 0;
}

.notification-list__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
}

.notification-list__line {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
  line-height: var(--scb-line-height-base);
  overflow-wrap: anywhere;
}

.notification-list__meta {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-base);
  overflow-wrap: anywhere;
}

.notification-list__error {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--v-error-base);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
