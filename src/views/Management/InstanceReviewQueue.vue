<template>
  <AdminLayout scroll-body class="review-queue">
    <div class="review-queue__body">
      <div class="review-queue__main">
        <v-card outlined class="section-card review-queue__card">
          <v-card-title class="section-header">
            <v-icon>mdi-clipboard-list-outline</v-icon>
            <!-- Two registers, drawn as the kind pair below: a joined pair
                 of buttons, one of them always on, each with its counter. -->
            <v-btn-toggle
              v-model="register"
              mandatory
              dense
              color="primary"
              class="review-queue__types review-queue__registers"
              :aria-label="
                $t('supervision.tenant-approval-queue.registers.label')
              "
            >
              <v-btn
                v-for="item in registers"
                :key="item.value"
                :value="item.value"
                small
                class="review-queue__type"
                :data-test="`review-queue-register-${item.value}`"
              >
                <v-icon left small>{{ item.icon }}</v-icon>
                {{ item.text }}
                <span
                  v-if="item.count !== null"
                  class="review-queue__register-count"
                  :data-test="`review-queue-count-${item.value}`"
                >
                  {{ item.count }}
                </span>
              </v-btn>
            </v-btn-toggle>
            <v-btn
              icon
              small
              class="review-queue__reload"
              :title="$t('supervision.queue.reload')"
              :aria-label="$t('supervision.queue.reload')"
              :disabled="loading"
              data-test="review-queue-reload"
              @click="reload"
            >
              <v-icon small>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text v-show="register === registerNames.OFFERS">
            <p class="review-queue__lead">
              {{ $t("supervision.queue.hint") }}
            </p>
            <div class="review-queue__filters">
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
                class="review-queue__filter"
              />
              <!-- Two kinds only, so the filter is a joined pair of buttons;
                   the active one, clicked again, shows both kinds. -->
              <v-btn-toggle
                ref="offerTypeFilter"
                v-model="filters.offerType"
                dense
                color="primary"
                class="review-queue__types"
                :aria-label="$t('supervision.queue.filters.offer-type')"
              >
                <v-btn
                  v-for="type in offerTypes"
                  :key="type.value"
                  :value="type.value"
                  small
                  class="review-queue__type"
                  :data-test="`review-queue-type-${type.value}`"
                >
                  <v-icon left small>{{ type.icon }}</v-icon>
                  {{ type.text }}
                </v-btn>
              </v-btn-toggle>
            </div>
            <v-alert
              v-if="decisionErrorKey"
              type="warning"
              text
              dense
              dismissible
              data-test="review-queue-decision-error"
              @input="decisionErrorKey = null"
            >
              {{ $t(decisionErrorKey) }}
            </v-alert>
            <v-alert
              v-if="errorMessage"
              type="warning"
              text
              dense
              class="mb-0"
              data-test="review-queue-error"
            >
              {{ errorMessage }}
            </v-alert>
            <!-- The order is the backend's (longest waiting first) and the
                 page is cut there, so the list neither sorts nor paginates
                 itself. -->
            <v-data-iterator
              v-else
              :items="items"
              item-key="key"
              :server-items-length="total"
              :page="page"
              :items-per-page="pageSize"
              :footer-props="{
                'items-per-page-options': pageSizes,
                'items-per-page-text': $t('supervision.queue.per-page'),
                'page-text': $t('supervision.queue.page-text'),
              }"
              :loading="loading"
              :loading-text="$t('supervision.queue.loading')"
              :no-data-text="$t('supervision.queue.empty')"
              disable-sort
              @update:options="onOptions"
            >
              <template #default="{ items: rows }">
                <div class="booking-rows">
                  <div
                    v-for="item in rows"
                    :key="item.key"
                    class="booking-row review-queue__row"
                    data-test="review-queue-row"
                  >
                    <div class="booking-row__main">
                      <div class="booking-row__title">
                        {{ item.title || item.offerId }}
                      </div>
                      <div class="booking-row__subtitle">
                        {{ item.tenant }} · {{ offerTypeLabel(item.offerType) }}
                        ·
                        {{
                          $t(
                            `supervision.queue.wish.${
                              item.isPublic ? "yes" : "no"
                            }`
                          )
                        }}
                      </div>
                      <v-btn
                        v-if="item.location"
                        text
                        x-small
                        color="primary"
                        class="review-queue__open px-0"
                        data-test="review-queue-open"
                        @click="open(item)"
                      >
                        <v-icon left x-small>mdi-open-in-app</v-icon>
                        {{ $t("supervision.queue.open") }}
                      </v-btn>
                    </div>
                    <div class="review-queue__aside">
                      <div v-if="item.submittedAt" class="review-queue__wait">
                        <div class="review-queue__wait-word">
                          {{ waiting(item.submittedAt) }}
                        </div>
                        <div class="review-queue__wait-since">
                          {{ dateTime(item.submittedAt) }}
                        </div>
                      </div>
                      <div class="review-queue__decision">
                        <v-btn
                          v-for="action in decisions"
                          :key="action"
                          small
                          :depressed="isApprove(action)"
                          :outlined="!isApprove(action)"
                          :color="decisionColor(action)"
                          :disabled="deciding"
                          class="review-queue__decide"
                          :data-test="`review-queue-${action}`"
                          @click="startDecision(item, action)"
                        >
                          <v-icon left small>{{ decisionIcon(action) }}</v-icon>
                          {{ $t(`supervision.review.actions.${action}`) }}
                        </v-btn>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </v-data-iterator>
          </v-card-text>
          <v-card-text v-show="register === registerNames.TENANTS">
            <TenantApprovalQueue
              ref="tenantQueue"
              @count="tenantCount = $event"
              @changed="load"
            />
          </v-card-text>
        </v-card>
      </div>

      <SupervisionNoticePanel class="review-queue__panel" />
    </div>

    <v-dialog v-model="rejectDialog" max-width="480">
      <v-card v-if="rejecting" class="section-card">
        <v-card-title class="section-header">
          <v-icon>mdi-close-circle-outline</v-icon>
          <span>{{ $t("supervision.review.actions.reject") }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="review-queue__dialog-body">
          <p class="review-queue__dialog-offer">
            {{ rejecting.title || rejecting.offerId }} · {{ rejecting.tenant }}
          </p>
          <v-textarea
            v-model="reasonInput"
            :label="$t('supervision.review.dialog.reason-label')"
            :hint="$t('supervision.review.dialog.reason-hint')"
            persistent-hint
            outlined
            rows="3"
            auto-grow
            data-test="review-queue-reason"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="rejectDialog = false">
            {{ $t("supervision.review.dialog.cancel") }}
          </v-btn>
          <v-btn
            color="error"
            depressed
            :disabled="deciding"
            :loading="deciding"
            data-test="review-queue-reject-confirm"
            @click="confirmReject"
          >
            {{ $t("supervision.review.actions.reject") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AdminLayout>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin.vue";
import SupervisionNoticePanel from "@/components/Supervision/SupervisionNoticePanel.vue";
import TenantApprovalQueue from "@/components/Supervision/TenantApprovalQueue.vue";
import ApiReviewQueueService from "@/services/api/ApiReviewQueueService";
import ApiReviewService from "@/services/api/ApiReviewService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ToastService from "@/services/ToastService";
import FormatService from "@/services/FormatService";
import pagedLoad from "@/mixins/pagedLoad";
import { REVIEW_ACTIONS } from "@/utils/offerReview";
import { reviewQueueLocation } from "@/utils/reviewQueueLink";
import {
  OFFER_TYPE_ICONS,
  OFFER_TYPE_VALUES,
  SUPERVISION_LEVELS,
  offerTypeLabelKey,
  waitingTime,
} from "@/utils/supervision";

/** Every row of the queue is pending: these are the decisions it is open to. */
const DECISIONS = [REVIEW_ACTIONS.APPROVE, REVIEW_ACTIONS.REJECT];

/**
 * The registers of the page, as `?tab=` names them: the offers waiting for a
 * review - where the page opens, so their name is left out of the address -
 * and the tenants waiting for their approval.
 */
const REGISTERS = Object.freeze({ OFFERS: "offers", TENANTS: "tenants" });
const REGISTER_VALUES = Object.values(REGISTERS);

/**
 * The active review queue (glossary "Aktive Prüfliste"): the pending offers
 * of all supervised tenants, for instance owners. A row is approved or
 * rejected right here, or opened in the offer's editor for a closer look. The
 * backend computes the queue on read, so every entry of the view and every
 * decision loads it anew.
 *
 * The page has a second register, the tenants waiting for their approval
 * (`TenantApprovalQueue`, glossary "Freigabeliste der Mandanten"); the card's
 * header switches between the two and counts both.
 *
 * Drawn as the guided setup is: a section card of hairline rows, the waiting
 * time as each row's leading fact, and beside it the panel of the supervision
 * notices that did not go out.
 */
export default {
  name: "InstanceReviewQueue",
  components: { AdminLayout, SupervisionNoticePanel, TenantApprovalQueue },
  mixins: [pagedLoad],
  data() {
    return {
      page: 1,
      pageSize: 25,
      pageSizes: [10, 25, 50, 100],
      filters: { tenantId: null, offerType: null },
      tenants: [],
      decisions: DECISIONS,
      deciding: false,
      decisionErrorKey: null,
      rejectDialog: false,
      rejecting: null,
      reasonInput: "",
      registerNames: REGISTERS,
      register: REGISTERS.OFFERS,
      tenantCount: null,
    };
  },
  computed: {
    ...mapGetters({ currentTenantId: "tenants/currentTenantId" }),
    registers() {
      return [
        {
          value: REGISTERS.OFFERS,
          text: this.$t("supervision.tenant-approval-queue.registers.offers"),
          icon: "mdi-cube-outline",
          count: this.loading || this.errorMessage ? null : this.total,
        },
        {
          value: REGISTERS.TENANTS,
          text: this.$t("supervision.tenant-approval-queue.registers.tenants"),
          icon: "mdi-domain",
          count: this.tenantCount,
        },
      ];
    },
    offerTypes() {
      return OFFER_TYPE_VALUES.map((value) => ({
        value,
        text: this.offerTypeLabel(value),
        icon: OFFER_TYPE_ICONS[value] || "mdi-tag-outline",
      }));
    },
  },
  watch: {
    // The page opens at the offers, and `?tab=` names the other register:
    // the register follows the route - the Navbar entry drops `?tab=` - and
    // the route follows the register.
    "$route.query.tab": {
      immediate: true,
      handler(tab) {
        this.register = REGISTER_VALUES.includes(tab) ? tab : REGISTERS.OFFERS;
      },
    },
    register(register) {
      const { tab, ...query } = this.$route.query;
      const wanted = register === REGISTERS.OFFERS ? undefined : register;
      if (tab === wanted) return;
      this.$router.replace({
        query: wanted ? { ...query, tab: wanted } : query,
      });
    },
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
    /** Both counters sit in the header: the reload reads both registers. */
    reload() {
      this.load();
      this.$refs.tenantQueue.load();
    },
    load() {
      return this.loadPaged(async () => {
        const queue = await ApiReviewQueueService.getReviewQueue({
          page: this.page,
          pageSize: this.pageSize,
          tenantId: this.filters.tenantId || null,
          offerType: this.filters.offerType || null,
        });
        return {
          items: (queue?.items || []).map((row) => ({
            ...row,
            key: `${row.offerType}:${row.tenantId}:${row.offerId}`,
            tenant: row.tenantName || row.tenantId,
            location: reviewQueueLocation(row),
          })),
          total: queue?.total,
        };
      }, "supervision.queue.load-failed");
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
    isApprove(action) {
      return action === REVIEW_ACTIONS.APPROVE;
    },
    /** The approval is the filled green button, the rejection the outlined red one. */
    decisionColor(action) {
      return this.isApprove(action) ? "success" : "error";
    },
    decisionIcon(action) {
      return this.isApprove(action) ? "mdi-check" : "mdi-close";
    },
    /** A rejection asks for a reason first, as the review panel does. */
    startDecision(item, action) {
      if (action !== REVIEW_ACTIONS.REJECT) return this.decide(item, action);
      this.rejecting = item;
      this.reasonInput = "";
      this.rejectDialog = true;
    },
    async confirmReject() {
      await this.decide(
        this.rejecting,
        REVIEW_ACTIONS.REJECT,
        this.reasonInput
      );
      this.rejectDialog = false;
    },
    /**
     * A decided offer leaves the queue, and a 409 says someone else decided
     * it meanwhile: either way the queue is read anew.
     */
    async decide(item, action, reason) {
      this.deciding = true;
      this.decisionErrorKey = null;
      try {
        await ApiReviewService.decide(
          item.tenantId,
          item.offerType,
          item.offerId,
          { action, reason }
        );
      } catch (error) {
        console.error(error);
        this.decisionErrorKey =
          error?.response?.status === 409
            ? "supervision.review.conflict"
            : "supervision.review.failed";
      } finally {
        this.deciding = false;
      }
      await this.load();
    },
    offerTypeLabel(offerType) {
      const key = offerTypeLabelKey(offerType);
      return key ? this.$t(key) : offerType;
    },
    dateTime: (value) => FormatService.dateTime(value),
    waiting(submittedAt) {
      const { key, count } = waitingTime(submittedAt);
      return this.$tc(key, count);
    },
  },
};
</script>

<style scoped>
/* Two columns as the guided setup draws them: the queue in the wide column,
   the notices in a sticky panel beside it. */
.review-queue__body {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
}

.review-queue__main {
  flex: 1;
  min-width: 0;
}

.review-queue__panel {
  width: var(--scb-panel-width);
  flex: none;
  position: sticky;
  top: 0;
  margin-bottom: var(--scb-gap-cards);
}

.review-queue__card {
  margin-bottom: var(--scb-gap-cards);
}

/* The reload sits in the header strip without adding to its height: the
   button's 28px are folded into the strip's own line. */
.review-queue__reload {
  margin: -6px -4px -6px auto;
}

/* The registers are the header's title: the kind pair's switch, folded into
   the strip's line as the reload is. */
.review-queue__registers {
  margin: calc(-1 * var(--scb-space-1)) 0;
}

.review-queue__registers .review-queue__type {
  height: 32px !important;
}

/* A register's counter: a quiet number beside its name. */
.review-queue__register-count {
  margin-left: var(--scb-space-2);
  min-width: 20px;
  padding: 0 var(--scb-space-2);
  border-radius: var(--scb-radius-pill);
  background: var(--scb-hover-tint-strong);
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  line-height: 18px;
  color: var(--scb-text);
}

.review-queue__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.review-queue__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
  margin-bottom: var(--scb-space-3);
}

.review-queue__filter {
  flex: 0 1 200px;
}

/* The kind pair: a segmented switch with one outline, the height of the
   dense select beside it; the active segment is tinted primary. */
.review-queue__types {
  /* The switch draws the one outline itself, rounded once; the segments
     are flat and keep only the hairline between them, so no square corner
     of theirs gets clipped by the rounding. */
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control) !important;
  overflow: hidden;
  background: var(--scb-surface);
}

.review-queue__type {
  height: 38px !important;
  border: 0 !important;
  border-radius: 0 !important;
  padding: 0 var(--scb-space-4) !important;
  text-transform: none;
  letter-spacing: normal;
  font-size: var(--scb-font-size-md);
  background: transparent !important;
}

.review-queue__type + .review-queue__type {
  border-left: 1px solid var(--scb-surface-border) !important;
}

.review-queue__type.v-btn--active {
  background: var(--scb-selected-tint) !important;
}

.review-queue__row {
  align-items: flex-start;
  padding: var(--scb-space-3) 0;
}

/* Beside the offer: its wait over its actions, both against the right edge. */
.review-queue__aside {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--scb-space-1);
}

/* The wait is the row's leading fact: how long the offer has been waiting,
   in words, over the moment it was submitted. */
.review-queue__wait {
  text-align: right;
}

.review-queue__wait-word {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  line-height: var(--scb-line-height-base);
}

.review-queue__wait-since {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-base);
}

/* The offer's facts may wrap: the decision pair beside them takes its width. */
.review-queue__row .booking-row__subtitle {
  white-space: normal;
}

/* The decision pair: one filled, one outlined, the same height, side by side. */
.review-queue__decision {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-1);
}

.review-queue__decide {
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

.review-queue__open {
  margin-top: 2px;
  text-transform: none;
  letter-spacing: normal;
}

.review-queue__dialog-body {
  padding: var(--scb-section-body-padding);
}

.review-queue__dialog-offer {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

/* $scb-bp-md / $scb-bp-sm / $scb-bp-xs of tokens.scss. */
@media (max-width: 1264px) {
  .review-queue__panel {
    width: var(--scb-panel-width-narrow);
  }
}

@media (max-width: 959px) {
  .review-queue__body {
    flex-direction: column;
    align-items: stretch;
  }
  .review-queue__panel {
    width: 100%;
    position: static;
  }
}

@media (max-width: 599px) {
  .review-queue__row {
    flex-direction: column;
    align-items: stretch;
  }
  .review-queue__aside {
    align-items: flex-start;
  }
  .review-queue__wait {
    text-align: left;
  }
  .review-queue__decision {
    justify-content: flex-start;
  }
}
</style>

<style>
/* The section body padding of the guided setup; the selector is the page's
   own, so the sheet is plain (not scoped). */
.review-queue .section-card > .v-card__text {
  padding: var(--scb-section-body-padding);
}

.review-queue .v-data-iterator .v-data-footer {
  border-top: 1px solid var(--scb-rule);
  margin-top: var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>
