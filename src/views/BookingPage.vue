<template>
  <AdminLayout scroll-body :title="pageTitle" class="booking-page">
    <template #page-header>
      <BookingPageToolbar
        :state="state"
        :tenant-name="tenantName"
        :link-copied="linkCopied"
        @back="goBack"
        @copy-link="copyLink"
      >
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
        <template #actions>
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
        </template>
      </BookingPageToolbar>
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
      <!-- Main column -->
      <div class="booking-page__main">
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

        <v-card
          v-if="objects.length > 0"
          outlined
          class="booking-page__objects"
        >
          <v-card-text>
            <div class="booking-caption">
              {{ $t("booking.page.objects.title") }}
            </div>
            <div class="booking-rows">
              <div
                v-for="(item, index) in objects"
                :key="index"
                class="booking-row booking-page__object"
              >
                <div class="booking-row__main">
                  <div class="booking-row__title">
                    {{ item._bookableUsed?.title || "–" }}
                  </div>
                  <div class="booking-row__subtitle">
                    {{ objectType(item) }}
                  </div>
                </div>
                <div class="booking-row__aside">
                  <span class="text--secondary">{{ item.amount }} ×</span>
                  <span>{{ formatCurrency(item.userGrossPriceEur) }}</span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <BookingAccessPoints :booking="booking" />

        <v-card
          v-if="customerFields.length > 0"
          outlined
          class="booking-page__customer"
        >
          <v-card-text>
            <div class="booking-caption">
              {{ $t("booking.page.customer.title") }}
            </div>
            <div class="booking-facts booking-facts--grid">
              <div
                v-for="field in customerFields"
                :key="field.key"
                class="booking-fact"
              >
                <span class="booking-fact__label">
                  {{ $t(`booking.page.customer.${field.key}`) }}
                </span>
                <span class="booking-fact__value">{{ field.value }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card
          v-if="customFields.length > 0"
          outlined
          class="booking-page__custom-fields"
        >
          <v-card-text>
            <div class="booking-caption">
              {{ $t("booking.page.custom-fields.title") }}
            </div>
            <div class="booking-facts booking-facts--grid">
              <div
                v-for="field in customFields"
                :key="field.id"
                class="booking-fact"
              >
                <span class="booking-fact__label">{{ field.caption }}</span>
                <span class="booking-fact__value">
                  {{ formatCustomFieldValue(field) }}
                </span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card
          v-if="comments.length > 0"
          outlined
          class="booking-page__comments"
        >
          <v-card-text>
            <div class="booking-caption">
              {{ $t("booking.page.comments.title") }}
            </div>
            <div
              v-for="(comment, index) in comments"
              :key="comment.key"
              class="booking-page__comment"
              :class="{ 'mt-3': index > 0 }"
            >
              <div class="booking-page__comment-label">
                {{ $t(`booking.page.comments.${comment.key}`) }}
              </div>
              <div class="text-body-2 booking-page__comment-text">
                {{ comment.value }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Detail panel -->
      <v-card outlined class="booking-page__panel">
        <v-card-text>
          <div class="booking-page__strip">
            <div class="text-h6 text-break booking-page__name">
              {{ booking.name || "–" }}
            </div>
            <div v-if="booking.mail" class="text-body-2 text--secondary">
              {{ booking.mail }}
            </div>
            <div class="booking-facts mt-3">
              <div class="booking-fact booking-page__period">
                <span class="booking-fact__label booking-page__fact-label">
                  {{ $t("booking.page.strip.period") }}
                </span>
                <span class="booking-fact__value booking-fact__value--strong">
                  {{ period }}
                </span>
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
            </div>
          </div>

          <div class="booking-page__payment">
            <div class="booking-caption booking-caption--spaced">
              {{ $t("booking.page.payment.title") }}
            </div>
            <div class="booking-facts">
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.payment.total") }}
                </span>
                <span class="booking-fact__value booking-fact__value--strong">
                  {{ formatCurrency(booking.priceEur) }}
                </span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.payment.status") }}
                </span>
                <span class="booking-fact__value">{{ paymentStatus }}</span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.payment.method") }}
                </span>
                <span class="booking-fact__value">
                  {{ booking.paymentMethod ? paymentMethod : "–" }}
                </span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.payment.provider") }}
                </span>
                <span class="booking-fact__value">
                  {{ booking.paymentProvider ? paymentProvider : "–" }}
                </span>
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

          <div class="booking-page__documents">
            <div class="booking-caption booking-caption--spaced">
              {{ $t("booking.page.documents.title") }}
            </div>
            <BookingDocumentActions
              :booking="booking"
              :group-booking="groupBooking"
              @download="downloadDocument"
              @reload="reload"
            />
          </div>

          <div class="booking-page__details">
            <div class="booking-caption booking-caption--spaced">
              {{ $t("booking.page.details.title") }}
            </div>
            <div class="booking-facts">
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.details.number") }}
                </span>
                <span class="booking-fact__value">{{ booking.id }}</span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.details.created") }}
                </span>
                <span class="booking-fact__value">
                  {{
                    booking.timeCreated
                      ? formatDateTime(booking.timeCreated)
                      : "–"
                  }}
                </span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.details.cancellation-policy") }}
                </span>
                <span class="booking-fact__value">
                  {{
                    userCancellable
                      ? $t("booking.page.details.user-cancellable")
                      : $t("booking.page.details.admin-only")
                  }}
                </span>
              </div>
              <div class="booking-fact">
                <span class="booking-fact__label">
                  {{ $t("booking.page.details.series") }}
                </span>
                <span class="booking-fact__value">
                  {{
                    groupBooking
                      ? `#${groupBooking.id}`
                      : $t("booking.page.details.no-series")
                  }}
                </span>
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
import BookingDocumentActions from "@/components/Booking/BookingDocumentActions.vue";
import BookingAccessPoints from "@/components/Booking/BookingAccessPoints.vue";
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import BookingPaymentLink from "@/components/Booking/BookingPaymentLink.vue";
import CancellationRefundAudit from "@/components/Booking/CancellationRefundAudit.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import bookingPageShell from "@/mixins/bookingPageShell";
import { groupBookingPageRoute } from "@/utils/bookingPageRoutes";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import {
  filledCustomFields,
  formatCustomFieldValue,
} from "@/utils/bookingCustomFields";
import { openFileUrl } from "@/utils/fileDownload";
import { getTypeText } from "@/utils/bookables";
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
import { getCancellationRefundAudit } from "@/utils/cancellationRefund";

/**
 * The Buchungsseite (CONTEXT.md): one booking at `/bookings/:bookingId`,
 * reachable by a Buchungslink that names its tenant in `?tenant=`. It is a
 * host of `BookingTransitions` (spec E3): the state as a headline over its
 * path with the state's transitions; every action on the page ends in
 * `reload()`, and so does a refused transition that says the screen is
 * stale (spec E5). The shell - states, toolbar, load / reload, "Link
 * kopieren", the tenant switch - is `bookingPageShell`'s.
 */
export default {
  name: "BookingPage",
  components: {
    AdminLayout,
    BookingAccessPoints,
    BookingDocumentActions,
    BookingPageEmptyState,
    BookingPageToolbar,
    BookingPaymentLink,
    BookingStatusPath,
    BookingTransitions,
    CancellationRefundAudit,
  },
  mixins: [bookingPageShell],
  data() {
    return {
      booking: null,
      groupBooking: null,
    };
  },
  computed: {
    pageI18nPrefix() {
      return "booking.page";
    },
    bookingId() {
      return this.$route.params.bookingId;
    },
    pageTitle() {
      return this.$t("booking.page.title", { id: this.bookingId });
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
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      vm.cameFromList = from?.name === "bookings";
    });
  },
  methods: {
    resetEntity() {
      this.booking = null;
      this.groupBooking = null;
    },
    async fetch() {
      const response = await ApiBookingService.getBooking(
        this.bookingId,
        undefined,
        true
      );
      this.booking = response.data;
      this.groupBooking = await this.loadGroupBooking();
    },
    transition(action) {
      this.$refs.transitions.start(
        action,
        transitionTarget(this.booking, this.groupBooking)
      );
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
    toEditor() {
      this.$router.push({
        name: "booking-edit",
        params: { bookingId: this.bookingId },
      });
    },
    toSeries() {
      this.$router.push(
        groupBookingPageRoute(this.groupBooking.id, this.tenantId)
      );
    },
    formatCustomFieldValue,
    /** The row's subtitle: the object's kind in words, or nothing. */
    objectType(item) {
      return getTypeText(item._bookableUsed?.type) || "–";
    },
    /**
     * One download per Dokumente group: receipts, invoices and cancellation
     * receipts come as a Blob over the booking's routes, an attachment is
     * opened under its own URL.
     */
    downloadDocument({ group, item }) {
      const name = item.title || item.name;
      if (group === "attachments") {
        openFileUrl(item.url, name);
        return;
      }
      return this.downloadBookingDocument(this.bookingId, group, name);
    },
    /** The same file the list's "Termin herunterladen" saves. */
    downloadIcal() {
      return this.downloadCalendar(
        () => ApiBookingService.downloadBookingIcal(this.bookingId),
        `buchung-${this.bookingId}.ics`
      );
    },
  },
  metaInfo() {
    return { title: this.pageTitle };
  },
};
</script>

<style scoped>
/* Two columns as the media library draws them: the booking in the wide
   column, its facts in a sticky panel beside it. */
.booking-page__body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.booking-page__main {
  flex: 1;
  min-width: 0;
}

.booking-page__main > .v-card,
.booking-page__main > .section-card {
  margin-bottom: 16px !important;
}

.booking-page__panel {
  width: 380px;
  flex: none;
  position: sticky;
  top: 0;
  margin-bottom: 16px;
}

.booking-page__name {
  line-height: 1.3;
}

.booking-page__period .booking-page__ical {
  flex: none;
  margin: -4px -4px -4px 0;
  align-self: center;
}

.booking-page__comment-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 2px;
}

.theme--dark .booking-page__comment-label {
  color: rgba(255, 255, 255, 0.7);
}

.booking-page__comment-text {
  white-space: pre-wrap;
}

@media (max-width: 1264px) {
  .booking-page__panel {
    width: 320px;
  }
}

@media (max-width: 959px) {
  .booking-page__body {
    flex-direction: column;
  }
  .booking-page__panel {
    width: 100%;
    position: static;
  }
}
</style>
