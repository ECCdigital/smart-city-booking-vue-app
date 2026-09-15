<template>
  <div class="booking-document-actions">
    <BookingDocuments
      :attachments="booking.attachments"
      @download="$emit('download', $event)"
    >
      <template #receipts-action>
        <v-btn
          v-if="canCreateReceipt"
          text
          x-small
          color="primary"
          class="booking-document-actions__receipt"
          :loading="busy.receipt"
          @click="createReceipt"
        >
          <v-icon left x-small>mdi-plus</v-icon>
          {{ $t("booking.page.documents.create-receipt") }}
        </v-btn>
      </template>
      <template #receipts-footer>
        <v-alert
          v-if="errors.receipt"
          type="error"
          dense
          outlined
          class="mt-2 mb-0"
        >
          {{ errors.receipt }}
        </v-alert>
      </template>

      <template #invoices-action>
        <v-menu v-if="canCreateInvoice" offset-y>
          <template #activator="{ on, attrs }">
            <v-btn
              text
              x-small
              color="primary"
              class="booking-document-actions__invoice"
              :loading="busy.invoice"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon left x-small>mdi-file-plus-outline</v-icon>
              {{ $t("booking.page.documents.invoice-menu") }}
              <v-icon right x-small>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item
              class="booking-document-actions__invoice-send"
              @click="createInvoice(true)"
            >
              <v-list-item-title>{{ invoiceSendLabel }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              class="booking-document-actions__invoice-only"
              @click="createInvoice(false)"
            >
              <v-list-item-title>{{ invoiceOnlyLabel }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      <template #invoices-footer>
        <v-alert
          v-if="errors.invoice"
          type="error"
          dense
          outlined
          class="mt-2 mb-0"
        >
          {{ errors.invoice }}
        </v-alert>
      </template>

      <template #cancellations-action>
        <v-btn
          v-if="canReprintCancellationReceipt"
          text
          x-small
          color="primary"
          class="booking-document-actions__reprint"
          :title="$t('booking.cancellationReceipt.reprint.hint')"
          :loading="busy.cancellationReceipt"
          @click="reprintCancellationReceipt"
        >
          <v-icon left x-small>mdi-file-replace-outline</v-icon>
          {{ $t("booking.page.documents.reprint") }}
        </v-btn>
      </template>
      <template #cancellations-footer>
        <v-alert
          v-if="errors.cancellationReceipt"
          type="error"
          dense
          outlined
          class="mt-2 mb-0"
        >
          {{ errors.cancellationReceipt }}
        </v-alert>
      </template>
    </BookingDocuments>

    <GroupBookingCreateReceipt
      :open="openAggregatedReceipt"
      :booking-id="booking.id"
      :error="errors.receipt"
      :in-progress="busy.receipt"
      @close="closeAggregatedReceipt"
      @create-single-booking-receipt="createSingleReceipt"
      @create-group-booking-receipt="createGroupReceipt"
    />
    <GroupBookingCreateInvoice
      :open="openAggregatedInvoice"
      :booking-id="booking.id"
      :send-email="pendingInvoiceSendEmail"
      :error="errors.invoice"
      :in-progress="busy.invoice"
      @close="closeAggregatedInvoice"
      @create-single-invoice="createSingleInvoice(pendingInvoiceSendEmail)"
      @create-group-invoice="createGroupInvoice(pendingInvoiceSendEmail)"
    />
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingDocuments from "@/components/Booking/BookingDocuments.vue";
import GroupBookingCreateReceipt from "@/components/Booking/GroupBookingCreateReceipt.vue";
import GroupBookingCreateInvoice from "@/components/Booking/GroupBookingCreateInvoice.vue";
import {
  getBookingErrorMessage,
  getGroupBookingErrorMessage,
} from "@/utils/errorMessages";
import {
  BOOKING_STATUS,
  groupBookingStatus,
  isRejectedOrCancelled,
} from "@/utils/bookingStatus";
import documentProduction from "@/mixins/documentProduction";

/**
 * The Dokumente block of a Buchungsseite with its producing actions beside
 * the groups (CONTEXT.md: the actions that produce a document belong to its
 * group): "Beleg erstellen" at Bestätigt (spec E8) - for a series member
 * only while every member is Bestätigt, with the single / aggregated choice
 * -, the "Rechnung" menu over the invoice provider, and the cancellation
 * receipt's "Neu ausstellen" at Abgelehnt / Storniert for `booking.reprint`.
 * The feedback is `documentProduction`'s: the triggering button shows
 * `loading`, an error stays as an alert inside its group until a retry
 * succeeds, a success toasts and asks the page to `reload`.
 */
export default {
  name: "BookingDocumentActions",
  components: {
    BookingDocuments,
    GroupBookingCreateReceipt,
    GroupBookingCreateInvoice,
  },
  mixins: [documentProduction],
  props: {
    booking: {
      type: Object,
      required: true,
    },
    /** The series with its populated `bookings`, for a member; `null` otherwise. */
    groupBooking: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      openAggregatedReceipt: false,
      openAggregatedInvoice: false,
      pendingInvoiceSendEmail: false,
      busy: {
        receipt: false,
        invoice: false,
        cancellationReceipt: false,
      },
      errors: {
        receipt: null,
        invoice: null,
        cancellationReceipt: null,
      },
    };
  },
  computed: {
    /** The series' members, where the page handed them over (`groupBooking.bookings`). */
    members() {
      return (this.groupBooking?.bookings || []).filter(Boolean);
    },
    /**
     * "Beleg erstellen" is offered at Bestätigt only (spec E8) - for a
     * series member only while every member is Bestätigt, so that the
     * aggregated receipt's `PAYED_STATUS` never reaches the UI. Without the
     * members at hand the member counts as a single booking.
     */
    canCreateReceipt() {
      if (this.members.length > 0) {
        return this.canCreateGroupReceipt;
      }
      return this.booking.status === BOOKING_STATUS.CONFIRMED;
    },
    /** The series' aggregated receipt: offered only while every member is confirmed (spec E8). */
    canCreateGroupReceipt() {
      return groupBookingStatus(this.members) === BOOKING_STATUS.CONFIRMED;
    },
    /** The invoice is the invoice provider's document; nothing else gates it. */
    canCreateInvoice() {
      return this.booking.paymentProvider === "invoice";
    },
    hasInvoice() {
      return (this.booking.attachments || []).some(
        (attachment) => attachment?.type === "invoice"
      );
    },
    invoiceSendLabel() {
      return this.$t(
        this.hasInvoice
          ? "booking.page.documents.invoice-resend"
          : "booking.page.documents.invoice-send"
      );
    },
    invoiceOnlyLabel() {
      return this.$t(
        this.hasInvoice
          ? "booking.page.documents.invoice-recreate"
          : "booking.page.documents.invoice-only"
      );
    },
    /** The cancellation receipt's reprint: at Abgelehnt / Storniert, for `booking.reprint` (spec E8). */
    canReprintCancellationReceipt() {
      return (
        isRejectedOrCancelled(this.booking) &&
        BookingPermissionService.allowReprint(this.booking)
      );
    },
  },
  methods: {
    createReceipt() {
      if (this.canCreateGroupReceipt) {
        this.openAggregatedReceipt = true;
      } else {
        this.createSingleReceipt();
      }
    },
    async createSingleReceipt() {
      await this.produce("receipt", {
        call: () => ApiBookingService.generateReceipt(this.booking.id),
        successKey: "receipt.create.success",
        errorKey: "booking.receipt.error",
        errorMessage: getBookingErrorMessage,
      });
    },
    async createGroupReceipt() {
      await this.produce("receipt", {
        call: () =>
          ApiGroupBookingService.generateGroupReceipt(
            undefined,
            this.groupBooking.id
          ),
        successKey: "receipt.create.success",
        errorKey: "group-booking.receipt.error",
        errorMessage: getGroupBookingErrorMessage,
      });
    },
    closeAggregatedReceipt() {
      this.openAggregatedReceipt = false;
    },

    createInvoice(sendEmail) {
      if (this.groupBooking?.id) {
        this.pendingInvoiceSendEmail = sendEmail;
        this.openAggregatedInvoice = true;
        return;
      }
      this.createSingleInvoice(sendEmail);
    },
    async createSingleInvoice(sendEmail) {
      await this.produce("invoice", {
        call: () =>
          ApiBookingService.generateInvoice(
            this.booking.id,
            sendEmail === true
          ),
        successKey: "invoice.create.success",
        errorKey: "invoice.create.error",
        errorMessage: getBookingErrorMessage,
      });
    },
    async createGroupInvoice(sendEmail) {
      await this.produce("invoice", {
        call: () =>
          ApiGroupBookingService.generateGroupInvoice(
            undefined,
            this.groupBooking.id,
            sendEmail === true
          ),
        successKey: "group-booking.invoice.success",
        errorKey: "group-booking.invoice.error",
        errorMessage: getGroupBookingErrorMessage,
      });
    },
    closeAggregatedInvoice() {
      this.openAggregatedInvoice = false;
    },

    /**
     * Reissues the cancellation receipt as a further revision under the same
     * number (spec E8). A 409 `not_cancelled` says the screen is stale and
     * reloads as well (spec E5).
     */
    async reprintCancellationReceipt() {
      await this.produce("cancellationReceipt", {
        call: () =>
          ApiBookingService.reprintCancellationReceipt(this.booking.id),
        successKey: "booking.cancellationReceipt.reprint.success",
        errorKey: "booking.cancellationReceipt.reprint.error",
        errorMessage: getBookingErrorMessage,
      });
    },

    /**
     * An open aggregated-choice dialog closes as the call starts, so the
     * answer lands in the group's alert.
     */
    produce(group, spec) {
      this.openAggregatedReceipt = false;
      this.openAggregatedInvoice = false;
      return this.produceDocument(group, spec);
    },
  },
};
</script>
