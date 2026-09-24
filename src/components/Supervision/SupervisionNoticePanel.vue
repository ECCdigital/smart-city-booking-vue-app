<template>
  <v-card outlined class="section-card notice-panel" data-test="notice-panel">
    <v-card-title class="section-header">
      <v-icon>mdi-email-alert-outline</v-icon>
      <span>{{ $t("supervision.notifications.title") }}</span>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <v-alert
        v-if="errorMessage"
        type="warning"
        text
        dense
        class="mb-0"
        data-test="notice-panel-error"
      >
        {{ errorMessage }}
      </v-alert>
      <template v-else>
        <div class="booking-caption">
          {{ $t("supervision.notifications.panel.failed") }}
        </div>
        <v-skeleton-loader
          v-if="loading && !items.length"
          type="list-item-two-line"
        />
        <p
          v-else-if="!items.length"
          class="notice-panel__none"
          data-test="notice-panel-none"
        >
          {{ $t("supervision.notifications.panel.none-failed") }}
        </p>
        <div v-else class="booking-rows">
          <div
            v-for="item in items"
            :key="item.id"
            class="booking-row notice-panel__row"
            :data-test="`notice-panel-row-${item.id}`"
          >
            <div class="booking-row__main">
              <div class="booking-row__title">{{ typeLabel(item.type) }}</div>
              <div class="booking-row__subtitle">{{ tenantName(item) }}</div>
              <div class="booking-row__subtitle">
                {{ formatDate(item.createdAt) }}
              </div>
            </div>
            <v-btn
              small
              text
              color="primary"
              class="notice-panel__retry"
              :disabled="isRetrying(item)"
              :loading="isRetrying(item)"
              :data-test="`notification-retry-${item.id}`"
              @click="retryNotification(item)"
            >
              {{ $t("supervision.notifications.retry.action") }}
            </v-btn>
          </div>
        </div>
        <p
          v-if="more > 0"
          class="notice-panel__more"
          data-test="notice-panel-more"
        >
          {{ $tc("supervision.notifications.panel.more", more) }}
        </p>
      </template>

      <v-btn
        outlined
        block
        small
        color="primary"
        class="notice-panel__open"
        data-test="notice-panel-open"
        @click="dialog = true"
      >
        {{ $t("supervision.notifications.panel.open") }}
      </v-btn>
      <p class="notice-panel__note">
        {{ $t("supervision.notifications.panel.note") }}
      </p>
    </v-card-text>

    <v-dialog v-model="dialog" max-width="960" scrollable>
      <v-card class="section-card notice-panel__dialog">
        <v-card-title class="section-header">
          <v-icon>mdi-email-alert-outline</v-icon>
          <span>{{ $t("supervision.notifications.title") }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="notice-panel__dialog-body">
          <SupervisionNotificationList v-if="dialog" />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn text data-test="notice-panel-close" @click="dialog = false">
            {{ $t("supervision.notifications.close") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";
import SupervisionNotificationList from "@/components/Supervision/SupervisionNotificationList.vue";
import pagedLoad from "@/mixins/pagedLoad";
import notificationRetry from "@/mixins/notificationRetry";
import { notificationTenantName } from "@/utils/supervisionNotifications";

/** How many undelivered notices the panel names before it counts the rest. */
const SHOWN = 5;

/**
 * The panel beside the review queue: the supervision notices (glossary
 * "Aufsichtsmitteilung") that did not go out, each with its retry, and the
 * way to the whole outbox in a dialog. Drawn as the onboarding's panel is -
 * a section card of facts. The dialog's list loads on its own; closing it
 * reads the panel anew, as a retry there may have emptied it.
 */
export default {
  name: "SupervisionNoticePanel",
  components: { SupervisionNotificationList },
  mixins: [pagedLoad, notificationRetry],
  data() {
    return { dialog: false };
  },
  computed: {
    more() {
      return Math.max(0, this.total - this.items.length);
    },
  },
  watch: {
    dialog(open) {
      if (!open) this.load();
    },
  },
  created() {
    this.load();
  },
  methods: {
    load() {
      return this.loadPaged(
        () =>
          ApiSupervisionNotificationService.getNotifications({
            status: "failed",
            page: 1,
            pageSize: SHOWN,
          }),
        "supervision.notifications.load-failed"
      );
    },
    tenantName: notificationTenantName,
  },
};
</script>

<style scoped>
.notice-panel__none {
  margin: 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-caption);
}

.notice-panel__row {
  align-items: flex-start;
}

.notice-panel__retry {
  flex: none;
  margin-right: -8px;
}

.notice-panel__more {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.notice-panel__open {
  margin-top: var(--scb-space-4);
}

.notice-panel__note {
  margin: var(--scb-space-5) 0 0;
  padding-top: var(--scb-space-3);
  border-top: 1px solid var(--scb-rule);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.notice-panel__dialog-body {
  padding: var(--scb-section-body-padding);
}
</style>
