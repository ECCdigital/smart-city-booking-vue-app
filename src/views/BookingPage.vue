<template>
  <AdminLayout scroll-body :title="pageTitle">
    <template #page-header>
      <div class="booking-page__toolbar d-flex align-center flex-wrap mt-1">
        <v-btn text small class="booking-page__back px-0" @click="goBack">
          <v-icon left small>mdi-arrow-left</v-icon>
          {{ $t("booking.page.back") }}
        </v-btn>
        <span class="mx-2 grey--text">·</span>
        <span
          class="booking-page__tenant text-body-2 grey--text text--darken-2"
        >
          {{ $t("booking.page.tenant", { name: tenantName }) }}
        </span>
        <template v-if="state === 'ready' && groupBooking">
          <span class="mx-2 grey--text">·</span>
          <v-chip
            small
            outlined
            color="primary"
            class="booking-page__series"
            @click="toSeries"
          >
            <v-icon left small>mdi-calendar-multiple</v-icon>
            {{ $t("booking.page.series-chip", { id: groupBooking.id }) }}
          </v-chip>
        </template>
        <v-spacer />
        <template v-if="state !== 'loading'">
          <v-btn
            v-if="state === 'ready' && canUpdate"
            text
            small
            class="booking-page__edit mr-2"
            @click="toEditor"
          >
            <v-icon left small>mdi-pencil</v-icon>
            {{ $t("booking.page.edit") }}
          </v-btn>
          <v-btn
            outlined
            small
            class="booking-page__copy"
            :color="linkCopied ? 'success' : undefined"
            @click="copyLink"
          >
            <v-icon left small>
              {{ linkCopied ? "mdi-check" : "mdi-link-variant" }}
            </v-icon>
            {{
              linkCopied
                ? $t("booking.page.link-copied")
                : $t("booking.page.copy-link")
            }}
          </v-btn>
        </template>
      </div>
    </template>

    <v-skeleton-loader
      v-if="state === 'loading'"
      type="article, list-item-three-line, table"
    />

    <BookingPageEmptyState
      v-else-if="state === 'non-member'"
      icon="mdi-account-lock-outline"
      :headline="$t('booking.page.non-member.headline')"
      :sentence="$t('booking.page.non-member.sentence')"
      :detail="queryTenant"
      :button-label="$t('booking.page.to-list')"
      @action="toList"
    />

    <BookingPageEmptyState
      v-else-if="state === 'not-found'"
      icon="mdi-file-search-outline"
      :headline="$t('booking.page.not-found.headline')"
      :sentence="notFoundSentence"
      :button-label="$t('booking.page.to-list')"
      @action="toList"
    />

    <BookingPageEmptyState
      v-else-if="state === 'error'"
      icon="mdi-alert-circle-outline"
      :headline="$t('booking.page.error.headline')"
      :sentence="errorSentence"
      :button-label="$t('booking.page.retry')"
      @action="load"
    />

    <div v-else-if="state === 'ready'" class="booking-page__body">
      <BookingStatusPath
        class="mb-4"
        :status="booking.status"
        :path="path"
        :actions="actions"
        @action="transition"
      >
        <template v-if="path.end && path.end.reason" #reason>
          <div class="text-caption font-weight-bold error--text">
            {{ $t(`booking.edit.reason.${path.end.status}`) }}
          </div>
          <div class="text-body-2">{{ path.end.reason }}</div>
        </template>
      </BookingStatusPath>

      <v-card outlined class="booking-page__strip mb-4">
        <v-row no-gutters>
          <v-col cols="12" md="4" class="booking-page__fact pa-4">
            <div class="d-flex align-center justify-space-between">
              <div class="booking-page__fact-label text-overline">
                <v-icon x-small class="mr-1">mdi-calendar-range</v-icon>
                {{ $t("booking.page.strip.period") }}
              </div>
              <v-btn
                v-if="hasCalendarEntry"
                icon
                x-small
                class="booking-page__ical"
                :title="$t('booking.page.strip.download-ical')"
                @click="downloadIcal"
              >
                <v-icon small>mdi-calendar-export</v-icon>
              </v-btn>
            </div>
            <div class="text-subtitle-1 font-weight-bold">{{ period }}</div>
          </v-col>
          <v-col cols="12" md="4" class="booking-page__fact pa-4">
            <div class="booking-page__fact-label text-overline">
              <v-icon x-small class="mr-1">mdi-account-outline</v-icon>
              {{ $t("booking.page.strip.customer") }}
            </div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ booking.name || "–" }}
            </div>
            <div v-if="booking.mail" class="text-body-2 grey--text">
              {{ booking.mail }}
            </div>
          </v-col>
          <v-col cols="12" md="4" class="booking-page__fact pa-4">
            <div class="booking-page__fact-label text-overline">
              <v-icon x-small class="mr-1">mdi-currency-eur</v-icon>
              {{ $t("booking.page.strip.price") }}
            </div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ formatCurrency(booking.priceEur) }}
            </div>
            <div class="text-body-2 grey--text">{{ paymentStatus }}</div>
          </v-col>
        </v-row>
      </v-card>

      <v-row>
        <v-col cols="12" lg="8">
          <v-card
            v-if="objects.length > 0"
            outlined
            class="booking-page__objects mb-4"
          >
            <div class="booking-page__block-title">
              <v-icon small class="mr-2">mdi-package-variant</v-icon>
              {{ $t("booking.page.objects.title") }} ({{ objects.length }})
            </div>
            <v-simple-table dense>
              <thead>
                <tr>
                  <th>{{ $t("booking.page.objects.object") }}</th>
                  <th>{{ $t("booking.page.objects.type") }}</th>
                  <th class="text-right">
                    {{ $t("booking.page.objects.amount") }}
                  </th>
                  <th class="text-right">
                    {{ $t("booking.page.objects.unit-price") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in objects" :key="index">
                  <td>{{ item._bookableUsed?.title || "–" }}</td>
                  <td>
                    <BookableTypeChip
                      v-if="item._bookableUsed?.type"
                      :type="item._bookableUsed.type"
                    />
                  </td>
                  <td class="text-right">{{ item.amount }}</td>
                  <td class="text-right">
                    {{ formatCurrency(item.userGrossPriceEur) }}
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-card>

          <BookingAccessPoints :booking="booking" class="mb-4" />

          <v-card
            v-if="customerFields.length > 0"
            outlined
            class="booking-page__customer mb-4"
          >
            <div class="booking-page__block-title">
              <v-icon small class="mr-2">mdi-account-outline</v-icon>
              {{ $t("booking.page.customer.title") }}
            </div>
            <div class="booking-page__grid pa-4">
              <div
                v-for="field in customerFields"
                :key="field.key"
                class="booking-page__kv"
              >
                <div class="text-caption grey--text">
                  {{ $t(`booking.page.customer.${field.key}`) }}
                </div>
                <div class="text-body-2">{{ field.value }}</div>
              </div>
            </div>
          </v-card>

          <v-card
            v-if="customFields.length > 0"
            outlined
            class="booking-page__custom-fields mb-4"
          >
            <div class="booking-page__block-title">
              <v-icon small class="mr-2">mdi-form-textbox</v-icon>
              {{ $t("booking.page.custom-fields.title") }}
            </div>
            <div class="booking-page__grid pa-4">
              <div
                v-for="field in customFields"
                :key="field.id"
                class="booking-page__kv"
              >
                <div class="text-caption grey--text">{{ field.caption }}</div>
                <div class="text-body-2">
                  {{ formatCustomFieldValue(field) }}
                </div>
              </div>
            </div>
          </v-card>

          <v-card
            v-if="comments.length > 0"
            outlined
            class="booking-page__comments mb-4"
          >
            <div class="booking-page__block-title">
              <v-icon small class="mr-2">mdi-comment-text-outline</v-icon>
              {{ $t("booking.page.comments.title") }}
            </div>
            <div class="pa-4">
              <div
                v-for="comment in comments"
                :key="comment.key"
                class="booking-page__comment mb-3"
              >
                <div class="text-caption grey--text">
                  {{ $t(`booking.page.comments.${comment.key}`) }}
                </div>
                <div class="text-body-2 booking-page__comment-text">
                  {{ comment.value }}
                </div>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card outlined class="booking-page__payment mb-4">
            <div class="booking-page__block-title">
              <v-icon small class="mr-2">mdi-cash-multiple</v-icon>
              {{ $t("booking.page.payment.title") }}
            </div>
            <div class="pa-4">
              <div class="booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.payment.total") }}
                </div>
                <div class="text-body-1 font-weight-bold">
                  {{ formatCurrency(booking.priceEur) }}
                </div>
              </div>
              <div class="booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.payment.status") }}
                </div>
                <div class="text-body-2">{{ paymentStatus }}</div>
              </div>
              <div class="booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.payment.method") }}
                </div>
                <div class="text-body-2">
                  {{ booking.paymentMethod ? paymentMethod : "–" }}
                </div>
              </div>
              <div class="booking-page__kv">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.payment.provider") }}
                </div>
                <div class="text-body-2">
                  {{ booking.paymentProvider ? paymentProvider : "–" }}
                </div>
              </div>
              <BookingPaymentLink
                class="mt-3"
                :booking="booking"
                :group-booking="groupBooking"
              />
              <CancellationRefundAudit
                v-if="cancellationRefundAudit"
                class="mt-3"
                :audit="cancellationRefundAudit"
              />
            </div>
          </v-card>

          <v-card outlined class="booking-page__documents mb-4">
            <div class="booking-page__block-title">
              <v-icon small class="mr-2"
                >mdi-file-document-multiple-outline</v-icon
              >
              {{ $t("booking.page.documents.title") }}
            </div>
            <BookingDocumentActions
              class="pa-4"
              :booking="booking"
              :group-booking="groupBooking"
              @download="downloadDocument"
              @reload="reload"
            />
          </v-card>

          <v-card outlined class="booking-page__details mb-4">
            <div class="booking-page__block-title">
              <v-icon small class="mr-2">mdi-information-outline</v-icon>
              {{ $t("booking.page.details.title") }}
            </div>
            <div class="pa-4">
              <div class="booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.details.number") }}
                </div>
                <div class="text-body-2">{{ booking.id }}</div>
              </div>
              <div class="booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.details.created") }}
                </div>
                <div class="text-body-2">
                  {{
                    booking.timeCreated
                      ? formatDateTime(booking.timeCreated)
                      : "–"
                  }}
                </div>
              </div>
              <div class="booking-page__kv mb-3">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.details.cancellation-policy") }}
                </div>
                <div class="text-body-2">
                  {{
                    userCancellable
                      ? $t("booking.page.details.user-cancellable")
                      : $t("booking.page.details.admin-only")
                  }}
                </div>
              </div>
              <div class="booking-page__kv">
                <div class="text-caption grey--text">
                  {{ $t("booking.page.details.series") }}
                </div>
                <div class="text-body-2">
                  {{
                    groupBooking
                      ? `#${groupBooking.id}`
                      : $t("booking.page.details.no-series")
                  }}
                </div>
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
import BookingDocumentActions from "@/components/Booking/BookingDocumentActions.vue";
import BookingAccessPoints from "@/components/Booking/BookingAccessPoints.vue";
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import BookingPaymentLink from "@/components/Booking/BookingPaymentLink.vue";
import CancellationRefundAudit from "@/components/Booking/CancellationRefundAudit.vue";
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";
import ProcessingService from "@/services/ProcessingService";
import FormatService from "@/services/FormatService";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ToastService from "@/services/ToastService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import {
  getApiErrorMessage,
  unpackBlobErrorBody,
} from "@/services/api/apiErrorMessage";
import {
  filledCustomFields,
  formatCustomFieldValue,
} from "@/utils/bookingCustomFields";
import { openFileUrl, saveBlob } from "@/utils/fileDownload";
import {
  paymentMethodLabel,
  paymentProviderLabel,
} from "@/utils/paymentLabels";
import {
  pathOf,
  paymentLabel,
  transitionActions,
  transitionTarget,
} from "@/utils/bookingStatus";
import { isTenantMember } from "@/utils/tenantMembership";
import { getCancellationRefundAudit } from "@/utils/cancellationRefund";
import { mapActions, mapGetters } from "vuex";

/** How long "Link kopiert" stays on the button (the codebase's copy pattern). */
const LINK_COPIED_MS = 2000;

/**
 * The Buchungsseite (CONTEXT.md): one booking at `/bookings/:bookingId`,
 * reachable by a Buchungslink that names its tenant in `?tenant=`. It is a
 * host of `BookingTransitions` (spec E3): the state as a headline over its
 * path with the state's transitions; every action on the page ends in
 * `reload()`, and so does a refused transition that says the screen is
 * stale (spec E5).
 */
export default {
  name: "BookingPage",
  components: {
    AdminLayout,
    BookableTypeChip,
    BookingAccessPoints,
    BookingDocumentActions,
    BookingPageEmptyState,
    BookingPaymentLink,
    BookingStatusPath,
    BookingTransitions,
    CancellationRefundAudit,
  },
  data() {
    return {
      state: "loading",
      booking: null,
      groupBooking: null,
      error: null,
      cameFromList: false,
      linkCopied: false,
      linkCopiedTimer: null,
      tenantSwitchTimer: null,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
      currentTenant: "tenants/currentTenant",
    }),
    bookingId() {
      return this.$route.params.bookingId;
    },
    /** The tenant the Buchungslink names; absent, the current tenant stands in. */
    queryTenant() {
      const tenant = this.$route.query?.tenant;
      return typeof tenant === "string" && tenant !== "" ? tenant : null;
    },
    pageTitle() {
      return this.$t("booking.page.title", { id: this.bookingId });
    },
    tenantName() {
      return this.currentTenant?.name || this.tenantId;
    },
    canUpdate() {
      return (
        !!this.booking && BookingPermissionService.allowUpdate(this.booking)
      );
    },
    /** An iCal needs a period, or an event behind one of the objects. */
    hasCalendarEntry() {
      return (
        (!!this.booking.timeBegin && !!this.booking.timeEnd) ||
        this.objects.some((item) => item._bookableUsed?.eventId)
      );
    },
    period() {
      const { timeBegin, timeEnd } = this.booking;
      if (!timeBegin || !timeEnd) {
        return "–";
      }
      return `${this.formatDateTime(timeBegin)} – ${this.formatDateTime(
        timeEnd
      )}`;
    },
    paymentStatus() {
      return paymentLabel(this.booking);
    },
    paymentMethod() {
      return paymentMethodLabel(this.booking.paymentMethod);
    },
    paymentProvider() {
      return paymentProviderLabel(this.booking.paymentProvider);
    },
    /** The state read as a path (spec N2). */
    path() {
      return pathOf(this.booking);
    },
    /** The transitions the state allows, for whoever may edit the booking. */
    actions() {
      if (!this.canUpdate) {
        return [];
      }
      return transitionActions(this.booking.status);
    },
    objects() {
      return Object.values(this.booking.bookableItems || {});
    },
    /** The customer as a key-value grid of the filled fields only. */
    customerFields() {
      const keys = {
        name: "name",
        company: "company",
        mail: "mail",
        phone: "phone",
        street: "street",
        "zip-code": "zipCode",
        location: "location",
      };
      return Object.entries(keys)
        .map(([key, field]) => ({ key, value: this.booking[field] }))
        .filter((field) => field.value != null && field.value !== "");
    },
    customFields() {
      return filledCustomFields(this.booking);
    },
    comments() {
      return [
        { key: "customer", value: this.booking.comment },
        { key: "internal", value: this.booking.internalComments },
      ].filter((comment) => comment.value);
    },
    userCancellable() {
      return this.booking?.cancellationPolicy?.userCancellable !== false;
    },
    cancellationRefundAudit() {
      return getCancellationRefundAudit(this.booking);
    },
    /**
     * The backend answers 404 alike for gone and out of reach; only a caller
     * whose Reichweite is *any* can be told the booking is gone.
     */
    notFoundSentence() {
      return BookingPermissionService.allowReadAny()
        ? this.$t("booking.page.not-found.sentence")
        : this.$t("errors.not-found-or-forbidden.message");
    },
    errorSentence() {
      return getApiErrorMessage(
        this.error,
        this.$t("errors.something-wrong.message")
      );
    },
  },
  watch: {
    "$route.fullPath"() {
      this.load();
    },
    /**
     * A navbar switch leaves for the new tenant's list. A switch the
     * middleware made on the way to another Buchungslink is not a reason to
     * leave: then the URL names the new tenant. The middleware selects before
     * the router confirms the route, and the guards after it only await the
     * store, so the URL has settled by the next macrotask - the decision
     * waits for it.
     */
    tenantId(newTenantId) {
      clearTimeout(this.tenantSwitchTimer);
      this.tenantSwitchTimer = setTimeout(() => {
        if (newTenantId !== this.queryTenant) {
          this.toList();
        }
      }, 0);
    },
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      vm.cameFromList = from?.name === "bookings";
    });
  },
  async mounted() {
    await this.load();
  },
  beforeDestroy() {
    clearTimeout(this.linkCopiedTimer);
    clearTimeout(this.tenantSwitchTimer);
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    /**
     * Non-member is decided before any request (spec "The five page states"):
     * the backend would answer 404 alike, and the tenant id of the URL is the
     * one thing the page can say about it.
     */
    async load() {
      this.state = "loading";
      this.error = null;
      this.booking = null;
      this.groupBooking = null;
      if (this.queryTenant && !isTenantMember(this.queryTenant)) {
        this.state = "non-member";
        return;
      }
      await this.fetch();
    },
    /**
     * The same fetch as `load()` after an action, with the body kept in
     * place: the page refreshes rather than flickers through the skeleton.
     */
    async reload() {
      await this.fetch();
    },
    async fetch() {
      try {
        const response = await ApiBookingService.getBooking(
          this.bookingId,
          undefined,
          true
        );
        this.booking = response.data;
        this.groupBooking = await this.loadGroupBooking();
        this.state = "ready";
      } catch (error) {
        if (error?.response?.status === 404) {
          this.state = "not-found";
          return;
        }
        console.error(error);
        this.error = error;
        this.state = "error";
      }
    },
    transition(action) {
      this.$refs.transitions.start(
        action,
        transitionTarget(this.booking, this.groupBooking)
      );
    },
    /** The module has toasted the message already; a stale screen reloads. */
    onTransitionFailed({ refetch }) {
      if (refetch) {
        this.reload();
      }
    },
    /**
     * The series a member belongs to, for the toolbar chip. Its failure
     * leaves the chip off and never fails the page: the booking is the page.
     * A 404 is the backend's answer for a booking without a series and is
     * not worth a log line; anything else is.
     */
    async loadGroupBooking() {
      try {
        const response = await ApiGroupBookingService.getGroupBookingByBooking(
          this.bookingId,
          undefined,
          true
        );
        return response.data?.id ? response.data : null;
      } catch (error) {
        if (error?.response?.status !== 404) {
          console.error(error);
        }
        return null;
      }
    },
    /**
     * The Buchungslink is the address bar: the route with its `?tenant=`, as
     * the openers write it and the middleware reads it.
     */
    async copyLink() {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch (error) {
        await this.addToast(
          ToastService.createToast("errors.something-wrong", "error")
        );
        return;
      }
      this.linkCopied = true;
      clearTimeout(this.linkCopiedTimer);
      this.linkCopiedTimer = setTimeout(() => {
        this.linkCopied = false;
      }, LINK_COPIED_MS);
    },
    toEditor() {
      this.$router.push({
        name: "booking-edit",
        params: { bookingId: this.bookingId },
      });
    },
    toSeries() {
      this.$router.push({
        name: "group-booking-details",
        params: { groupBookingId: this.groupBooking.id },
        query: { tenant: this.tenantId },
      });
    },
    formatCustomFieldValue,
    /**
     * One download per Dokumente group: receipts, invoices and cancellation
     * receipts come as a Blob over the booking's routes, an attachment is
     * opened under its own URL.
     */
    async downloadDocument({ group, item }) {
      const name = item.title || item.name;
      if (group === "attachments") {
        openFileUrl(item.url, name);
        return;
      }
      const fetchers = {
        receipts: ApiBookingService.getReceipt,
        invoices: ApiBookingService.getInvoice,
        cancellations: ApiBookingService.getCancellationReceipt,
      };
      const operationId = ProcessingService.showSnackbar(
        this.$t("booking.page.documents.download-progress")
      );
      try {
        const response = await fetchers[group](this.bookingId, name);
        saveBlob(new Blob([response.data], { type: "application/pdf" }), name);
      } catch (error) {
        // The request asked for a Blob, so the body is unpacked before it is read.
        const unpacked = await unpackBlobErrorBody(error);
        await this.addToast({
          title: this.$t("booking.page.documents.download-error.title"),
          message: getApiErrorMessage(
            unpacked,
            this.$t("booking.page.documents.download-error.message")
          ),
          type: "error",
        });
      } finally {
        ProcessingService.hide(operationId);
      }
    },
    /** The same file the list's "Termin herunterladen" saves. */
    async downloadIcal() {
      try {
        const response = await ApiBookingService.downloadBookingIcal(
          this.bookingId
        );
        saveBlob(
          new Blob([response.data], { type: "text/calendar;charset=utf-8" }),
          `buchung-${this.bookingId}.ics`
        );
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.ical.error", "error")
        );
      }
    },
    formatDateTime(value) {
      return FormatService.dateTime(value);
    },
    formatCurrency(value) {
      return FormatService.currency(value || 0);
    },
    toList() {
      this.$router.push({ name: "bookings" });
    },
    goBack() {
      if (this.cameFromList) {
        this.$router.back();
      } else {
        this.$router.push({ name: "bookings" });
      }
    },
  },
  metaInfo() {
    return { title: this.pageTitle };
  },
};
</script>

<style scoped>
.booking-page__block-title {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.booking-page__fact + .booking-page__fact {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.booking-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px 24px;
}

.booking-page__comment-text {
  white-space: pre-wrap;
}
</style>
