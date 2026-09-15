<template>
  <AdminLayout scroll-body :title="pageTitle">
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

      <v-card outlined class="group-booking-page__strip mb-4">
        <v-row no-gutters>
          <v-col cols="12" md="4" class="group-booking-page__fact pa-4">
            <div class="d-flex align-center justify-space-between">
              <div class="group-booking-page__fact-label text-overline">
                <v-icon x-small class="mr-1">mdi-calendar-range</v-icon>
                {{ $t("group-booking.page.strip.period") }}
              </div>
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
            <div class="text-subtitle-1 font-weight-bold">{{ period }}</div>
            <div class="text-body-2 grey--text">
              {{
                $t("group-booking.page.strip.dates", { count: members.length })
              }}
            </div>
          </v-col>
          <v-col cols="12" md="4" class="group-booking-page__fact pa-4">
            <div class="group-booking-page__fact-label text-overline">
              <v-icon x-small class="mr-1">mdi-account-outline</v-icon>
              {{ $t("group-booking.page.strip.customer") }}
            </div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ customer.name || "–" }}
            </div>
            <div v-if="customer.mail" class="text-body-2 grey--text">
              {{ customer.mail }}
            </div>
          </v-col>
          <v-col cols="12" md="4" class="group-booking-page__fact pa-4">
            <div class="group-booking-page__fact-label text-overline">
              <v-icon x-small class="mr-1">mdi-currency-eur</v-icon>
              {{ $t("group-booking.page.strip.price") }}
            </div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ formatCurrency(totalPriceEur) }}
            </div>
            <div class="text-body-2 grey--text">{{ paymentStatus }}</div>
          </v-col>
        </v-row>
      </v-card>

      <v-row>
        <v-col cols="12" lg="8">
          <v-card outlined class="group-booking-page__members mb-4">
            <div class="group-booking-page__block-title">
              <v-icon small class="mr-2">mdi-format-list-bulleted</v-icon>
              {{ $t("group-booking.page.members.title") }} ({{
                members.length
              }})
            </div>
            <v-simple-table dense>
              <thead>
                <tr>
                  <th>{{ $t("group-booking.page.members.number") }}</th>
                  <th>{{ $t("group-booking.page.members.period") }}</th>
                  <th>{{ $t("group-booking.page.members.object") }}</th>
                  <th>{{ $t("group-booking.page.members.state") }}</th>
                  <th class="text-right">
                    {{ $t("group-booking.page.members.price") }}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in members"
                  :key="item.id"
                  class="group-booking-page__member"
                >
                  <td>
                    <a
                      class="group-booking-page__member-link font-weight-medium"
                      :title="$t('group-booking.page.members.open')"
                      @click.prevent="toMember(item.id)"
                    >
                      {{ item.id }}
                    </a>
                  </td>
                  <td class="text-no-wrap">{{ periodOf(item) }}</td>
                  <td>{{ objectsOf(item) }}</td>
                  <td class="text-no-wrap">
                    <v-chip
                      x-small
                      :color="statusColor(item.status)"
                      text-color="white"
                    >
                      <v-icon left x-small>{{
                        statusIcon(item.status)
                      }}</v-icon>
                      {{ statusLabel(item.status) }}
                    </v-chip>
                    <v-chip
                      v-if="isFree(item)"
                      x-small
                      :color="freeChip.color"
                      :text-color="freeChip.textColor"
                      class="ml-1"
                    >
                      {{ freeChip.label }}
                    </v-chip>
                  </td>
                  <td class="text-right text-no-wrap">
                    {{ formatCurrency(item.priceEur) }}
                  </td>
                  <td class="text-right">
                    <v-menu v-if="memberActions(item).length > 0" offset-y left>
                      <template #activator="{ on, attrs }">
                        <v-btn
                          icon
                          x-small
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
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-card>

          <v-card outlined class="group-booking-page__comments mb-4">
            <div class="group-booking-page__block-title justify-space-between">
              <span>
                <v-icon small class="mr-2">mdi-comment-text-outline</v-icon>
                {{ $t("group-booking.page.comments.title") }}
              </span>
              <v-btn
                v-if="canEditComment && !editingComment"
                icon
                x-small
                class="group-booking-page__comment-edit"
                :title="$t('group-booking.page.comments.edit')"
                @click="startEditingComment"
              >
                <v-icon small>mdi-pencil</v-icon>
              </v-btn>
            </div>
            <div class="pa-4">
              <div class="text-caption grey--text">
                {{ $t("group-booking.page.comments.internal") }}
              </div>
              <template v-if="!editingComment">
                <div
                  v-if="groupBooking.internalComments"
                  class="text-body-2 group-booking-page__comment-text"
                >
                  {{ groupBooking.internalComments }}
                </div>
                <div v-else class="text-body-2 grey--text font-italic">
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
                  class="mt-1"
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
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card outlined class="group-booking-page__payment mb-4">
            <div class="group-booking-page__block-title">
              <v-icon small class="mr-2">mdi-cash-multiple</v-icon>
              {{ $t("group-booking.page.payment.title") }}
            </div>
            <div class="pa-4">
              <div class="group-booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.payment.total") }}
                </div>
                <div class="text-body-1 font-weight-bold">
                  {{ formatCurrency(totalPriceEur) }}
                </div>
              </div>
              <div class="group-booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.payment.status") }}
                </div>
                <div class="text-body-2">{{ paymentStatus }}</div>
              </div>
              <div class="group-booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.payment.method") }}
                </div>
                <div class="text-body-2">{{ paymentMethod }}</div>
              </div>
              <div class="group-booking-page__kv">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.payment.aggregated-invoice") }}
                </div>
                <div class="text-body-2">{{ aggregatedInvoiceState }}</div>
              </div>
            </div>
          </v-card>

          <v-card outlined class="group-booking-page__documents mb-4">
            <div class="group-booking-page__block-title">
              <v-icon small class="mr-2"
                >mdi-file-document-multiple-outline</v-icon
              >
              {{ $t("group-booking.page.documents.title") }}
            </div>
            <GroupBookingDocumentActions
              class="pa-4"
              :group-booking="groupBooking"
              @download="downloadDocument"
              @reload="reload"
            />
          </v-card>

          <v-card outlined class="group-booking-page__details mb-4">
            <div class="group-booking-page__block-title">
              <v-icon small class="mr-2">mdi-information-outline</v-icon>
              {{ $t("group-booking.page.details.title") }}
            </div>
            <div class="pa-4">
              <div class="group-booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.details.number") }}
                </div>
                <div class="text-body-2">{{ groupBooking.id }}</div>
              </div>
              <div class="group-booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.details.created") }}
                </div>
                <div class="text-body-2">
                  {{
                    groupBooking.timeCreated
                      ? formatDateTime(groupBooking.timeCreated)
                      : "–"
                  }}
                </div>
              </div>
              <div class="group-booking-page__kv">
                <div class="text-caption grey--text">
                  {{ $t("group-booking.page.details.count") }}
                </div>
                <div class="text-body-2">{{ members.length }}</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
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
.group-booking-page__block-title {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.group-booking-page__fact + .group-booking-page__fact {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.group-booking-page__member-link {
  cursor: pointer;
}

.group-booking-page__comment-text {
  white-space: pre-wrap;
}
</style>
