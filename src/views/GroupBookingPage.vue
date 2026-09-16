<template>
  <AdminLayout scroll-body :title="pageTitle" class="group-booking-page">
    <template #page-header>
      <BookingPageToolbar
        :state="state"
        :tenant-name="tenantName"
        :link-copied="linkCopied"
        @back="goBack"
        @copy-link="copyLink"
      />
    </template>

    <v-skeleton-loader
      v-if="state === 'loading'"
      type="article, list-item-three-line, table"
    />

    <BookingPageEmptyState
      v-else-if="state === 'non-member'"
      icon="mdi-account-lock-outline"
      :headline="$t('group-booking.page.non-member.headline')"
      :sentence="$t('group-booking.page.non-member.sentence')"
      :detail="queryTenant"
      :button-label="$t('booking.page.to-list')"
      @action="toList"
    />

    <BookingPageEmptyState
      v-else-if="state === 'not-found'"
      icon="mdi-file-search-outline"
      :headline="$t('group-booking.page.not-found.headline')"
      :sentence="notFoundSentence"
      :button-label="$t('booking.page.to-list')"
      @action="toList"
    />

    <BookingPageEmptyState
      v-else-if="state === 'error'"
      icon="mdi-alert-circle-outline"
      :headline="$t('group-booking.page.error.headline')"
      :sentence="errorSentence"
      :button-label="$t('booking.page.retry')"
      @action="load"
    />

    <div v-else-if="state === 'ready'" class="group-booking-page__body">
      <!-- Main column -->
      <div class="group-booking-page__main">
        <BookingStatusPath
          class="mb-4"
          :label="$t('group-booking.status.title')"
          :status="seriesStatus"
          :path="seriesPath"
          :actions="seriesActions"
          :action-label="seriesActionLabel"
          :hint="mixedHint"
          @action="transitionSeries"
        >
          <template v-if="mixed" #default>
            <div class="series-status-counts text-body-2">
              <template v-for="(entry, index) in counts">
                <span
                  v-if="index > 0"
                  :key="`${entry.status}-dot`"
                  class="mx-2 text--disabled"
                  >·</span
                >
                <span
                  :key="entry.status"
                  class="series-status-count font-weight-medium"
                  :class="`${entry.color}--text`"
                  >{{
                    $t("group-booking.status.count", {
                      count: entry.count,
                      state: entry.label,
                    })
                  }}</span
                >
              </template>
            </div>
          </template>
          <template
            v-if="seriesPath && seriesPath.end && seriesPath.end.reason"
            #reason
          >
            <div class="text-caption font-weight-bold error--text">
              {{ $t(`booking.edit.reason.${seriesPath.end.status}`) }}
            </div>
            <div class="text-body-2">{{ seriesPath.end.reason }}</div>
          </template>
        </BookingStatusPath>

        <v-card outlined class="group-booking-page__members section-card">
          <v-card-title class="section-header">
            <v-icon>mdi-calendar-multiple</v-icon>
            <span>{{ $t("group-booking.page.members.title") }}</span>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div class="booking-rows">
              <div
                v-for="item in members"
                :key="item.id"
                class="booking-row group-booking-page__member"
              >
                <v-avatar
                  :color="statusColor(item.status)"
                  size="28"
                  class="group-booking-page__member-avatar"
                >
                  <v-icon dark size="15">{{ statusIcon(item.status) }}</v-icon>
                </v-avatar>
                <div class="booking-row__main">
                  <div class="booking-row__title d-flex align-center">
                    <a
                      class="group-booking-page__member-link"
                      :title="$t('group-booking.page.members.open')"
                      @click.prevent="toMember(item.id)"
                    >
                      {{ item.id }}
                    </a>
                    <span
                      class="group-booking-page__member-state ml-2"
                      :class="`${statusColor(item.status)}--text`"
                    >
                      {{ statusLabel(item.status) }}
                    </span>
                    <v-chip
                      v-if="isFree(item)"
                      x-small
                      label
                      :color="freeChip.color"
                      :text-color="freeChip.textColor"
                      class="ml-2"
                    >
                      {{ freeChip.label }}
                    </v-chip>
                  </div>
                  <div class="booking-row__subtitle">
                    {{ periodOf(item) }} · {{ objectsOf(item) }}
                  </div>
                </div>
                <div class="booking-row__aside">
                  <span>{{ formatCurrency(item.priceEur) }}</span>
                  <v-menu v-if="memberActions(item).length > 0" offset-y left>
                    <template #activator="{ on, attrs }">
                      <v-btn
                        icon
                        small
                        class="group-booking-page__member-menu"
                        v-bind="attrs"
                        v-on="on"
                      >
                        <v-icon small>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list dense>
                      <v-list-item
                        v-for="action in memberActions(item)"
                        :key="action"
                        link
                        class="group-booking-page__member-action"
                        @click="transitionMember(action, item.id)"
                      >
                        <v-list-item-icon>
                          <v-icon small :color="actionColor(action)">
                            {{ actionIcon(action) }}
                          </v-icon>
                        </v-list-item-icon>
                        <v-list-item-title>
                          {{ actionLabel(action, item.status) }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card outlined class="group-booking-page__comments section-card">
          <v-card-title class="section-header">
            <v-icon>mdi-comment-text-outline</v-icon>
            <span>{{ $t("group-booking.page.comments.internal") }}</span>
            <v-spacer />
            <v-btn
              v-if="canEditComment && !editingComment"
              icon
              small
              class="group-booking-page__comment-edit"
              :title="$t('group-booking.page.comments.edit')"
              @click="startEditingComment"
            >
              <v-icon small>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <template v-if="!editingComment">
              <div
                v-if="groupBooking.internalComments"
                class="text-body-2 group-booking-page__comment-text"
              >
                {{ groupBooking.internalComments }}
              </div>
              <div v-else class="text-body-2 text--secondary font-italic">
                {{ $t("group-booking.page.comments.none") }}
              </div>
            </template>
            <template v-else>
              <v-textarea
                v-model="editedComment"
                outlined
                dense
                rows="3"
                auto-grow
                :placeholder="$t('group-booking.page.comments.placeholder')"
                hide-details="auto"
              />
              <div class="d-flex justify-end mt-3">
                <v-btn
                  small
                  text
                  class="mr-2"
                  :disabled="savingComment"
                  @click="cancelEditingComment"
                >
                  {{ $t("group-booking.page.comments.cancel") }}
                </v-btn>
                <v-btn
                  small
                  color="primary"
                  depressed
                  :loading="savingComment"
                  @click="saveComment"
                >
                  {{ $t("group-booking.page.comments.save") }}
                </v-btn>
              </div>
            </template>
          </v-card-text>
        </v-card>
      </div>

      <!-- Detail panel -->
      <v-card outlined class="group-booking-page__panel section-card">
        <!-- The panel's header: who booked, and when - the strip. -->
        <v-card-title
          class="section-header section-header--stacked group-booking-page__strip"
        >
          <div class="group-booking-page__identity">
            <v-icon>mdi-account-outline</v-icon>
            <div class="section-header__text">
              <div class="section-header__title group-booking-page__name">
                {{ customer.name || "–" }}
              </div>
              <div v-if="customer.mail" class="section-header__subtitle">
                {{ customer.mail }}
              </div>
            </div>
          </div>
          <div class="booking-facts group-booking-page__strip-facts">
            <div class="booking-fact group-booking-page__period">
              <span class="booking-fact__label group-booking-page__fact-label">
                {{ $t("group-booking.page.strip.period") }}
              </span>
              <span class="booking-fact__value booking-fact__value--strong">
                {{ period }}
              </span>
              <v-btn
                v-if="members.length > 0"
                icon
                x-small
                class="group-booking-page__ical"
                :title="$t('group-booking.page.strip.download-ical')"
                @click="downloadIcal"
              >
                <v-icon small>mdi-calendar-export</v-icon>
              </v-btn>
            </div>
            <div class="group-booking-page__dates text-caption text--secondary">
              {{
                $t("group-booking.page.strip.dates", {
                  count: members.length,
                })
              }}
            </div>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div class="group-booking-page__payment">
            <div class="booking-caption">
              {{ $t("group-booking.page.payment.title") }}
            </div>
            <div class="booking-facts">
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.payment.total") }}
                </span>
                <span class="booking-fact__value booking-fact__value--strong">
                  {{ formatCurrency(totalPriceEur) }}
                </span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.payment.status") }}
                </span>
                <span class="booking-fact__value">{{ paymentStatus }}</span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.payment.method") }}
                </span>
                <span class="booking-fact__value">{{ paymentMethod }}</span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.payment.aggregated-invoice") }}
                </span>
                <span class="booking-fact__value">
                  {{ aggregatedInvoiceState }}
                </span>
              </div>
            </div>
          </div>

          <div class="group-booking-page__documents">
            <div class="booking-caption booking-caption--spaced">
              {{ $t("group-booking.page.documents.title") }}
            </div>
            <GroupBookingDocumentActions
              :group-booking="groupBooking"
              @download="downloadDocument"
              @reload="reload"
            />
          </div>

          <div class="group-booking-page__details">
            <div class="booking-caption booking-caption--spaced">
              {{ $t("group-booking.page.details.title") }}
            </div>
            <div class="booking-facts">
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.details.number") }}
                </span>
                <span class="booking-fact__value">{{ groupBooking.id }}</span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.details.created") }}
                </span>
                <span class="booking-fact__value">
                  {{
                    groupBooking.timeCreated
                      ? formatDateTime(groupBooking.timeCreated)
                      : "–"
                  }}
                </span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("group-booking.page.details.count") }}
                </span>
                <span class="booking-fact__value">{{ members.length }}</span>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <BookingTransitions
      ref="transitions"
      @transitioned="reload"
      @failed="onTransitionFailed"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import BookingPageEmptyState from "@/components/Booking/BookingPageEmptyState.vue";
import BookingPageToolbar from "@/components/Booking/BookingPageToolbar.vue";
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import GroupBookingDocumentActions from "@/components/Booking/GroupBookingDocumentActions.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ToastService from "@/services/ToastService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import bookingPageShell from "@/mixins/bookingPageShell";
import { bookingPageRoute } from "@/utils/bookingPageRoutes";
import { paymentMethodLabel } from "@/utils/paymentLabels";
import {
  collectGroupInvoices,
  groupUsesInvoicePayment,
} from "@/utils/groupBookingInvoices";
import {
  BOOKING_ACTION,
  MIXED,
  actionColor,
  actionIcon,
  actionLabel,
  freeMarker,
  groupAllowsAction,
  groupBookingStatus,
  isFree,
  mixedCounts,
  paymentLabel,
  seriesActionLabel,
  seriesPathOf,
  statusColor,
  statusIcon,
  statusLabel,
  totalPriceOf,
  transitionActions,
  transitionTarget,
} from "@/utils/bookingStatus";

/**
 * The Serienbuchungsseite (CONTEXT.md): one series with its members at
 * `/group-bookings/:groupBookingId`, reachable by a Buchungslink that names
 * its tenant in `?tenant=`. The shell is `bookingPageShell`'s. The page
 * shows the series as a booking (spec E9, N5): the members' shared state as
 * a headline over the series' path (`seriesPathOf`), with a series-wide
 * action - worded "Serie freigeben" and so on - only where that state allows
 * it, through the mounted `BookingTransitions`; there is no series-wide
 * Wiederherstellen. A mixed series is counted per state instead and acts
 * per member: the member rows' menus hand their transition to the same
 * module. Every action ends in `reload()`.
 */
export default {
  name: "GroupBookingPage",
  components: {
    AdminLayout,
    BookingPageEmptyState,
    BookingPageToolbar,
    BookingStatusPath,
    BookingTransitions,
    GroupBookingDocumentActions,
  },
  mixins: [bookingPageShell],
  data() {
    return {
      groupBooking: null,
      editingComment: false,
      editedComment: "",
      savingComment: false,
    };
  },
  computed: {
    pageI18nPrefix() {
      return "group-booking.page";
    },
    groupBookingId() {
      return this.$route.params.groupBookingId;
    },
    pageTitle() {
      return this.$t("group-booking.page.title", { id: this.groupBookingId });
    },
    /** The members from the populated `bookings`. */
    members() {
      return (this.groupBooking?.bookings || []).filter(Boolean);
    },
    /** The series' customer: the members share one; the first stands for all. */
    customer() {
      return this.members[0] || {};
    },
    /**
     * The overall range: the earliest begin to the latest end over the
     * members. A member's time may come as a number or a date string.
     */
    period() {
      const times = (field) =>
        this.members
          .map((m) => new Date(m[field]).getTime())
          .filter(Number.isFinite);
      const begins = times("timeBegin");
      const ends = times("timeEnd");
      if (begins.length === 0 || ends.length === 0) {
        return "–";
      }
      return `${this.formatDateTime(
        Math.min(...begins)
      )} – ${this.formatDateTime(Math.max(...ends))}`;
    },
    totalPriceEur() {
      return totalPriceOf(this.members);
    },
    /** `paymentLabel` over the members: their shared word, Nein where they differ. */
    paymentStatus() {
      const labels = [...new Set(this.members.map(paymentLabel))];
      return labels.length === 1
        ? labels[0]
        : this.$t("booking.payment.unpaid");
    },
    /** The members' payment method where they share one. */
    paymentMethod() {
      const methods = [...new Set(this.members.map((m) => m.paymentMethod))];
      if (methods.length !== 1) {
        return methods.length === 0
          ? "–"
          : this.$t("group-booking.page.payment.mixed");
      }
      return methods[0] ? paymentMethodLabel(methods[0]) : "–";
    },
    usesInvoicePayment() {
      return groupUsesInvoicePayment(this.members);
    },
    invoices() {
      return collectGroupInvoices(this.members);
    },
    aggregatedInvoiceState() {
      if (!this.usesInvoicePayment) {
        return this.$t("group-booking.page.payment.not-invoice");
      }
      return this.$t(
        this.invoices.length > 0
          ? "group-booking.page.payment.aggregated-invoice-issued"
          : "group-booking.page.payment.aggregated-invoice-none"
      );
    },
    freeChip() {
      return freeMarker();
    },
    seriesStatus() {
      return groupBookingStatus(this.members);
    },
    mixed() {
      return this.seriesStatus === MIXED;
    },
    /** The series' path; `null` while the series is mixed, so the headline shows the count instead. */
    seriesPath() {
      return seriesPathOf(this.groupBooking, this.members);
    },
    counts() {
      return mixedCounts(this.members);
    },
    canEditEveryMember() {
      return this.members.every((b) => BookingPermissionService.allowUpdate(b));
    },
    /**
     * The series has no right of its own; its comment is saved over the
     * members, so whoever may update every member may edit it - the same
     * rule as the series-wide actions.
     */
    canEditComment() {
      return this.canEditEveryMember;
    },
    /** Why a mixed series offers no action - for whoever could act on the members. */
    mixedHint() {
      return this.mixed && this.canEditEveryMember
        ? this.$t("group-booking.status.mixedHint")
        : null;
    },
    /** The series-wide transitions: the shared state's, for whoever may edit every member. */
    seriesActions() {
      if (!this.canEditEveryMember) {
        return [];
      }
      return transitionActions(this.seriesStatus).filter(
        (action) =>
          action !== BOOKING_ACTION.REINSTATE &&
          groupAllowsAction(this.members, action)
      );
    },
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      vm.cameFromList = from?.name === "bookings";
    });
  },
  methods: {
    seriesActionLabel,
    actionColor,
    actionIcon,
    actionLabel,
    isFree,
    statusColor,
    statusIcon,
    statusLabel,
    /** A member row's transitions: its state's, for whoever may edit it. */
    memberActions(member) {
      if (!BookingPermissionService.allowUpdate(member)) {
        return [];
      }
      return transitionActions(member.status);
    },
    periodOf(member) {
      if (!member.timeBegin || !member.timeEnd) {
        return "–";
      }
      return `${this.formatDateTime(member.timeBegin)} – ${this.formatDateTime(
        member.timeEnd
      )}`;
    },
    objectsOf(member) {
      const titles = Object.values(member.bookableItems || {})
        .map((item) => item?._bookableUsed?.title)
        .filter(Boolean);
      return titles.length > 0 ? titles.join(", ") : "–";
    },
    toMember(bookingId) {
      this.$router.push(bookingPageRoute(bookingId, this.tenantId));
    },
    startEditingComment() {
      this.editedComment = this.groupBooking.internalComments || "";
      this.editingComment = true;
    },
    cancelEditingComment() {
      this.editingComment = false;
      this.editedComment = "";
    },
    /** The series has no editor; the comment is saved here and the page reloaded. */
    async saveComment() {
      this.savingComment = true;
      try {
        await ApiGroupBookingService.updateGroupBooking(
          this.groupBooking.tenantId,
          this.groupBooking.id,
          { ...this.groupBooking, internalComments: this.editedComment }
        );
        this.editingComment = false;
        this.editedComment = "";
        await this.addToast(
          ToastService.createToast("group-booking.update.success", "success")
        );
        await this.reload();
      } catch (error) {
        console.error(error);
        await this.addToast(
          ToastService.createToast("group-booking.update.error", "error")
        );
      } finally {
        this.savingComment = false;
      }
    },
    /**
     * One download per Dokumente group, over the route of the member the
     * document hangs on (`item.bookingId`).
     */
    downloadDocument({ group, item }) {
      return this.downloadBookingDocument(
        item.bookingId,
        group,
        item.title || item.name
      );
    },
    /** The same file the list's "Termine für alle Buchungen" saved: every member's dates. */
    downloadIcal() {
      return this.downloadCalendar(
        () =>
          ApiBookingService.downloadGroupBookingIcal(
            this.members.map((member) => member.id)
          ),
        `serienbuchung-${this.groupBookingId}.ics`
      );
    },
    /**
     * A series-wide button acts on the whole series: `seriesOnly` keeps the
     * group dialogs from offering "Nur diese Buchung", which would otherwise
     * act on an arbitrary member.
     */
    transitionSeries(action) {
      this.$refs.transitions.start(action, {
        ...transitionTarget(this.members[0], this.groupBooking),
        seriesOnly: true,
      });
    },
    /** A member row's menu: the member with its series, so the dialogs can still offer the series where it is uniform. */
    transitionMember(action, bookingId) {
      const member = this.members.find((booking) => booking.id === bookingId);
      if (!member) return;
      this.$refs.transitions.start(
        action,
        transitionTarget(member, this.groupBooking)
      );
    },
    resetEntity() {
      this.groupBooking = null;
    },
    async fetch() {
      const response = await ApiGroupBookingService.getGroupBooking(
        this.groupBookingId,
        undefined,
        true
      );
      this.groupBooking = response.data;
    },
  },
  metaInfo() {
    return { title: this.pageTitle };
  },
};
</script>

<style scoped>
/* Two columns as the media library draws them: the series in the wide
   column, its facts in a sticky panel beside it. */
.group-booking-page__body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.group-booking-page__main {
  flex: 1;
  min-width: 0;
}

.group-booking-page__main > .v-card {
  margin-bottom: 16px;
}

.group-booking-page__panel {
  width: 380px;
  flex: none;
  position: sticky;
  top: 0;
  margin-bottom: 16px;
}

/* The strip stacks the identity over the period, and its facts keep the
   weight of facts rather than the header's. */
.group-booking-page__identity {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.group-booking-page__strip-facts {
  margin-top: 12px;
  font-weight: 400;
}

.group-booking-page__period .group-booking-page__ical {
  flex: none;
  margin: -4px -4px -4px 0;
  align-self: center;
}

.group-booking-page__dates {
  text-align: right;
  margin-top: -2px;
}

.group-booking-page__member-avatar {
  flex: none;
}

.group-booking-page__member-link {
  cursor: pointer;
}

.group-booking-page__member-state {
  font-size: 12px;
  font-weight: 500;
}

.group-booking-page__member .booking-row__aside .v-btn {
  margin-right: -6px;
}

.group-booking-page__comment-text {
  white-space: pre-wrap;
}

@media (max-width: 1264px) {
  .group-booking-page__panel {
    width: 320px;
  }
}

@media (max-width: 959px) {
  .group-booking-page__body {
    flex-direction: column;
    align-items: stretch;
  }
  .group-booking-page__panel {
    width: 100%;
    position: static;
  }
}
</style>
