<template>
  <div class="group-booking-document-actions">
    <BookingDocuments
      :attachments="documents"
      :groups="['receipts', 'invoices', 'cancellations']"
      @download="$emit('download', $event)"
    >
      <template #invoices-action>
        <v-menu v-if="usesInvoicePayment" offset-y>
          <template #activator="{ on, attrs }">
            <v-btn
              text
              x-small
              color="primary"
              class="group-booking-document-actions__invoice"
              :loading="busy.invoice"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon left x-small>mdi-file-plus-outline</v-icon>
              {{ $t("group-booking.page.documents.invoice-menu") }}
              <v-icon right x-small>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item
              class="group-booking-document-actions__invoice-send"
              @click="createGroupInvoice(true)"
            >
              <v-list-item-title>{{ invoiceSendLabel }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              class="group-booking-document-actions__invoice-only"
              @click="createGroupInvoice(false)"
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
          class="group-booking-document-actions__reprint"
          :title="$t('booking.cancellationReceipt.reprint.hint')"
          :loading="busy.cancellationReceipt"
          @click="reprintCancellationReceipt"
        >
          <v-icon left x-small>mdi-file-replace-outline</v-icon>
          {{ $t("group-booking.page.documents.reprint") }}
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
  </div>
</template>

<script>
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingDocuments from "@/components/Booking/BookingDocuments.vue";
import documentProduction from "@/mixins/documentProduction";
import { getGroupBookingErrorMessage } from "@/utils/errorMessages";
import {
  collectGroupCancellationReceipts,
  collectGroupInvoices,
  collectGroupReceipts,
  groupUsesInvoicePayment,
} from "@/utils/groupBookingInvoices";
import { isRejectedOrCancelled } from "@/utils/bookingStatus";

/**
 * The Dokumente block of a Serienbuchungsseite: the members' Belege,
 * Rechnungen and Stornobelege, an aggregated document counted once, with
 * the series' producing actions beside their groups - the "Sammelrechnung"
 * menu where every member pays by invoice, and "Neu ausstellen" of the
 * aggregated cancellation receipt once every member is cancelled, for
 * `booking.reprint` on each (spec E8). The feedback is
 * `documentProduction`'s; every success asks the page to `reload`.
 */
export default {
  name: "GroupBookingDocumentActions",
  components: { BookingDocuments },
  mixins: [documentProduction],
  props: {
    /** The series with its populated `bookings`. */
    groupBooking: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      busy: { invoice: false, cancellationReceipt: false },
      errors: { invoice: null, cancellationReceipt: null },
    };
  },
  computed: {
    members() {
      return (this.groupBooking.bookings || []).filter(Boolean);
    },
    /** The members' documents, an aggregated one counted once; each carries its `bookingId` for the download. */
    documents() {
      return [
        ...collectGroupReceipts(this.members),
        ...collectGroupInvoices(this.members),
        ...collectGroupCancellationReceipts(this.members),
      ];
    },
    usesInvoicePayment() {
      return groupUsesInvoicePayment(this.members);
    },
    hasInvoice() {
      return collectGroupInvoices(this.members).length > 0;
    },
    invoiceSendLabel() {
      return this.$t(
        this.hasInvoice
          ? "group-booking.page.documents.invoice-resend"
          : "group-booking.page.documents.invoice-send"
      );
    },
    invoiceOnlyLabel() {
      return this.$t(
        this.hasInvoice
          ? "group-booking.page.documents.invoice-recreate"
          : "group-booking.page.documents.invoice-only"
      );
    },
    /** The aggregated cancellation receipt exists once every member is cancelled; the right is `booking.reprint` on each. */
    canReprintCancellationReceipt() {
      return (
        this.members.length > 0 &&
        this.members.every(
          (b) =>
            isRejectedOrCancelled(b) && BookingPermissionService.allowReprint(b)
        )
      );
    },
  },
  methods: {
    async createGroupInvoice(sendEmail) {
      await this.produceDocument("invoice", {
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
    /** Reissues the aggregated receipt as a further revision (spec E8); a 409 `not_cancelled` says the screen is stale and reloads too. */
    async reprintCancellationReceipt() {
      await this.produceDocument("cancellationReceipt", {
        call: () =>
          ApiGroupBookingService.reprintGroupCancellationReceipt(
            undefined,
            this.groupBooking.id
          ),
        successKey: "group-booking.cancellationReceipt.reprint.success",
        errorKey: "group-booking.cancellationReceipt.reprint.error",
        errorMessage: getGroupBookingErrorMessage,
      });
    },
  },
};
</script>
