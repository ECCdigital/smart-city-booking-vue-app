<template>
  <div class="tenant-queue">
    <p class="tenant-queue__lead">
      {{ $t("supervision.tenant-approval-queue.hint") }}
    </p>
    <v-alert
      v-if="decisionError"
      type="warning"
      text
      dense
      dismissible
      data-test="tenant-queue-decision-error"
      @input="decisionError = ''"
    >
      {{ decisionError }}
    </v-alert>
    <v-alert
      v-if="errorMessage"
      type="warning"
      text
      dense
      class="mb-0"
      data-test="tenant-queue-error"
    >
      {{ errorMessage }}
    </v-alert>
    <!-- The offers' register's rows, not AppList, so both registers read
         alike; as there, the backend orders and cuts the queue. -->
    <v-data-iterator
      v-else
      :items="items"
      item-key="tenantId"
      :server-items-length="total"
      :page="page"
      :items-per-page="pageSize"
      :footer-props="{
        'items-per-page-options': pageSizes,
        'items-per-page-text': $t('supervision.tenant-approval-queue.per-page'),
        'page-text': $t('supervision.queue.page-text'),
      }"
      :loading="loading"
      :loading-text="$t('supervision.tenant-approval-queue.loading')"
      :no-data-text="$t('supervision.tenant-approval-queue.empty')"
      disable-sort
      @update:options="onOptions"
    >
      <template #default="{ items: rows }">
        <div class="booking-rows">
          <div
            v-for="row in rows"
            :key="row.tenantId"
            class="booking-row tenant-queue__row"
            data-test="tenant-queue-row"
          >
            <div class="booking-row__main">
              <div class="booking-row__title">
                {{ row.tenantName || row.tenantId }}
              </div>
              <div class="booking-row__subtitle" data-test="tenant-queue-facts">
                {{ facts(row) }}
              </div>
              <div
                v-if="origin(row.lastChange)"
                class="booking-row__subtitle"
                data-test="tenant-queue-origin"
              >
                {{ origin(row.lastChange) }}
              </div>
              <!-- Flush with the facts: the buttons' own padding is pulled
                   into the row's left edge. -->
              <div class="tenant-queue__links">
                <TenantBookingsLink :tenant="tenantOf(row)">
                  {{ $t("supervision.tenant-approval-queue.bookings") }}
                </TenantBookingsLink>
                <v-btn
                  text
                  small
                  color="primary"
                  class="tenant-queue__link"
                  data-test="tenant-queue-history"
                  @click="openHistory(row)"
                >
                  <v-icon left small>mdi-history</v-icon>
                  {{ $t("supervision.history.open") }}
                </v-btn>
              </div>
            </div>
            <div class="tenant-queue__aside">
              <div v-if="row.waitingSince" class="tenant-queue__wait">
                <div class="tenant-queue__wait-word">
                  {{ waiting(row.waitingSince) }}
                </div>
                <div class="tenant-queue__wait-since">
                  {{ dateTime(row.waitingSince) }}
                </div>
              </div>
              <div class="tenant-queue__decision">
                <!-- A split button: the approval as supervised is the rule,
                     the one as free the exception behind the arrow. -->
                <div class="tenant-queue__split">
                  <v-btn
                    small
                    depressed
                    color="success"
                    :disabled="deciding"
                    class="tenant-queue__decide tenant-queue__split-main"
                    data-test="tenant-queue-approve"
                    @click="decide(row, levels.SUPERVISED)"
                  >
                    <v-icon left small>mdi-check</v-icon>
                    {{ $t("supervision.tenant-approval-queue.approve") }}
                  </v-btn>
                  <v-menu offset-y left>
                    <template #activator="{ on, attrs }">
                      <v-btn
                        small
                        depressed
                        color="success"
                        :disabled="deciding"
                        class="tenant-queue__decide tenant-queue__split-more"
                        :title="
                          $t('supervision.tenant-approval-queue.approve-more')
                        "
                        :aria-label="
                          $t('supervision.tenant-approval-queue.approve-more')
                        "
                        data-test="tenant-queue-approve-more"
                        v-bind="attrs"
                        v-on="on"
                      >
                        <v-icon small>mdi-menu-down</v-icon>
                      </v-btn>
                    </template>
                    <v-list dense>
                      <v-list-item
                        data-test="tenant-queue-approve-free"
                        @click="decide(row, levels.FREE)"
                      >
                        <v-list-item-title>
                          {{
                            $t("supervision.tenant-approval-queue.approve-free")
                          }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
                <v-btn
                  small
                  outlined
                  color="error"
                  :disabled="deciding"
                  class="tenant-queue__decide"
                  data-test="tenant-queue-decline"
                  @click="startDecline(row)"
                >
                  <v-icon left small>mdi-close</v-icon>
                  {{ $t("supervision.tenant-approval-queue.decline") }}
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-data-iterator>

    <SupervisionHistoryDialog
      :open="historyOpen"
      :tenant="historyTenant"
      @close="historyOpen = false"
    />
    <TenantDeclineDialog
      :open="declineOpen"
      :tenant="declining || {}"
      @declined="onDeclined"
      @stale="refresh"
      @close="declineOpen = false"
    />
  </div>
</template>

<script>
import { mapActions } from "vuex";
import ApiTenantApprovalQueueService from "@/services/api/ApiTenantApprovalQueueService";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import {
  getApiErrorMessage,
  shouldRefetch,
} from "@/services/api/apiErrorMessage";
import FormatService from "@/services/FormatService";
import ToastService from "@/services/ToastService";
import pagedLoad from "@/mixins/pagedLoad";
import SupervisionHistoryDialog from "@/components/Supervision/SupervisionHistoryDialog.vue";
import TenantBookingsLink from "@/components/Supervision/TenantBookingsLink.vue";
import TenantDeclineDialog from "@/components/Supervision/TenantDeclineDialog.vue";
import {
  SUPERVISION_LEVELS,
  levelLabelKey,
  waitingTime,
} from "@/utils/supervision";

/** A tenant's history starting with one of these reads as newly created. */
const NEW_TENANT_EVENTS = ["tenant.created", "tenant.levelInitialized"];

/**
 * The tenant approval queue (glossary "Freigabeliste der Mandanten"): the
 * tenants at "Freigabe ausstehend", longest waiting first, as the second
 * register of the review queue. A row is approved right here, through the
 * level change of the tenant and without a reason.
 *
 * It tells the page its counter with `count` - `null` while it loads and
 * when the load failed - and with `changed` that a level changed, by a decision
 * here or, as a 409 says, by someone else: a supervised tenant's pending
 * offers enter the offers' register, which the page then reads anew.
 */
export default {
  name: "TenantApprovalQueue",
  components: {
    SupervisionHistoryDialog,
    TenantBookingsLink,
    TenantDeclineDialog,
  },
  mixins: [pagedLoad],
  data() {
    return {
      page: 1,
      pageSize: 25,
      pageSizes: [10, 25, 50, 100],
      levels: SUPERVISION_LEVELS,
      deciding: false,
      decisionError: "",
      declineOpen: false,
      declining: null,
      historyOpen: false,
      historyTenant: null,
    };
  },
  created() {
    this.load();
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async load() {
      this.$emit("count", null);
      await this.loadPaged(
        () =>
          ApiTenantApprovalQueueService.getTenantApprovalQueue({
            page: this.page,
            pageSize: this.pageSize,
          }),
        "supervision.tenant-approval-queue.load-failed"
      );
      // An answer overtaken by a later load leaves the register loading.
      const known = !this.loading && !this.errorMessage;
      this.$emit("count", known ? this.total : null);
    },
    /**
     * The page reads both registers anew: this one for the tenant that
     * left it, the offers' one for the offers a level change moves.
     */
    refresh() {
      this.load();
      this.$emit("changed");
    },
    /**
     * Setting the level that is already effective is a no-op 200: the
     * answer names the effective level, and the toast says it.
     */
    async decide(row, level) {
      this.deciding = true;
      this.decisionError = "";
      try {
        const answer = await ApiSupervisionService.setTenantLevel(
          row.tenantId,
          { level }
        );
        this.announce(this.tenantOf(row), answer?.supervisionLevel || level);
      } catch (error) {
        console.error(error);
        this.decisionError = getApiErrorMessage(
          error,
          this.$t("supervision.level.change.failed")
        );
        if (!shouldRefetch(error)) return;
      } finally {
        this.deciding = false;
      }
      this.refresh();
    },
    /** The row's tenant as the dialogs and the bookings link take it. */
    tenantOf(row) {
      return { id: row.tenantId, name: row.tenantName };
    },
    openHistory(row) {
      this.historyTenant = this.tenantOf(row);
      this.historyOpen = true;
    },
    /** The decline has a dialog of its own, which sends the change itself. */
    startDecline(row) {
      this.decisionError = "";
      this.declining = {
        ...this.tenantOf(row),
        supervisionLevel: SUPERVISION_LEVELS.PENDING,
      };
      this.declineOpen = true;
    },
    onDeclined({ supervisionLevel }) {
      this.declineOpen = false;
      this.announce(
        this.declining,
        supervisionLevel || SUPERVISION_LEVELS.DECLINED
      );
      this.refresh();
    },
    announce(tenant, level) {
      this.addToast(
        ToastService.createToast(
          "supervision.level.change.success",
          "success",
          5000,
          { tenant: tenant.name || tenant.id, level: this.levelName(level) }
        )
      );
    },
    /** A level the UI does not know is named as it is stored. */
    levelName(level) {
      const key = levelLabelKey(level);
      return key ? this.$t(key) : level;
    },
    onOptions({ page, itemsPerPage }) {
      if (page === this.page && itemsPerPage === this.pageSize) return;
      // Another page size cuts the queue anew: back to its first page.
      this.page = itemsPerPage === this.pageSize ? page : 1;
      this.pageSize = itemsPerPage;
      this.load();
    },
    /** Who to talk to and what there is: contact, owners, offer count. */
    facts(row) {
      const owners = (row.owners || [])
        .map((owner) => owner.displayName || owner.mail || owner.userId)
        .join(", ");
      return [
        row.contact?.contactName,
        row.contact?.mail,
        row.contact?.location,
        owners || this.$t("supervision.tenant-approval-queue.no-owner"),
        this.$tc("supervision.tenant-approval-queue.offers", row.offerCount),
      ]
        .filter(Boolean)
        .join(" · ");
    },
    /**
     * How the tenant came to wait, from the newest row of its history: a
     * creation is new, a change to `pending` a reset, named with the level
     * it came from and the reason given.
     */
    origin(lastChange) {
      const eventType = lastChange?.eventType;
      if (NEW_TENANT_EVENTS.includes(eventType)) {
        return this.$t("supervision.tenant-approval-queue.origin.created");
      }
      if (eventType !== "tenant.levelChanged") return null;
      const level = this.levelName(lastChange.from);
      if (!lastChange.reason) {
        return this.$t("supervision.tenant-approval-queue.origin.reset", {
          level,
        });
      }
      return this.$t("supervision.tenant-approval-queue.origin.reset-reason", {
        level,
        reason: lastChange.reason,
      });
    },
    dateTime: (value) => FormatService.dateTime(value),
    waiting(since) {
      const { key, count } = waitingTime(since);
      return this.$tc(key, count);
    },
  },
};
</script>

<style scoped>
/* Drawn as the offers' register draws its rows: the tenant's facts in the
   wide column, its wait over the decision against the right edge. */
.tenant-queue__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.tenant-queue__row {
  align-items: flex-start;
  padding: var(--scb-space-3) 0;
}

/* The facts may wrap: the decision beside them takes its width. */
.tenant-queue__row .booking-row__subtitle {
  white-space: normal;
}

.tenant-queue__links {
  display: flex;
  flex-wrap: wrap;
  margin: 2px 0 0 calc(-1 * var(--scb-space-3));
}

.tenant-queue__link {
  text-transform: none !important;
  letter-spacing: normal;
}

.tenant-queue__aside {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--scb-space-1);
}

.tenant-queue__wait {
  text-align: right;
}

.tenant-queue__wait-word {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  line-height: var(--scb-line-height-base);
}

.tenant-queue__wait-since {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-base);
}

.tenant-queue__decision {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-1);
}

.tenant-queue__decide {
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

/* The split button: two halves joined into one, the card's background
   showing through as the hairline between them. */
.tenant-queue__split {
  display: flex;
  gap: 1px;
}

.tenant-queue__split-main {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.tenant-queue__split-more {
  min-width: 0 !important;
  padding: 0 var(--scb-space-1) !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

/* $scb-bp-xs of tokens.scss. */
@media (max-width: 599px) {
  .tenant-queue__row {
    flex-direction: column;
    align-items: stretch;
  }
  .tenant-queue__aside {
    align-items: flex-start;
  }
  .tenant-queue__wait {
    text-align: left;
  }
  .tenant-queue__decision {
    justify-content: flex-start;
  }
}
</style>
