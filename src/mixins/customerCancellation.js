import ApiBookingService from "@/services/api/ApiBookingService";
import { isFree, isPaid } from "@/utils/bookingStatus";
import {
  customerRefundWording,
  expectedRefundEur,
  formatAppliedTierRule,
  formatTimeBeforeStartForBooker,
  hasBegun,
  refundPolicyText,
  rejectPaymentOutcome,
} from "@/utils/cancellationRefund";

/**
 * What the pages of the cancellation link tell the customer about the money:
 * whether the booking is paid, the wording of the refund panel - a refund,
 * or what drops away and what is still due - and the payment hint.
 *
 * The page keeps `bookingNumber`, the `tenantId` prop and the refund preview
 * (`refundPreview`, `loadingRefundPreview`, `refundPreviewError`); the mixin
 * adds `bookingStatus`, `null` while unknown: the page then words the panel
 * for a refund and leaves the hint out.
 */
export default {
  data() {
    return {
      bookingStatus: null,
    };
  },
  computed: {
    /** A price is set but not paid yet: nothing comes back. */
    unpaid() {
      return (
        !!this.bookingStatus &&
        !isFree(this.bookingStatus) &&
        !isPaid(this.bookingStatus)
      );
    },
    refundWording() {
      return customerRefundWording(this.unpaid);
    },
    paymentOutcome() {
      if (!this.bookingStatus) return null;
      return rejectPaymentOutcome({
        customer: true,
        free: isFree(this.bookingStatus),
        paid: isPaid(this.bookingStatus),
        priceEur: this.bookingStatus.priceEur,
        refundAmountEur: expectedRefundEur(this.refundPreview),
        previewFailed: this.refundPreviewError,
      });
    },
    refundPolicySummary() {
      if (!this.refundPreview) return "";
      return refundPolicyText(this.refundWording.policyKey, {
        time: formatTimeBeforeStartForBooker(this.refundPreview),
        tier: formatAppliedTierRule(this.refundPreview),
        begun: hasBegun(this.refundPreview),
        percentage: this.refundPreview.suggestedRefundPercentage,
      });
    },
    /** The note on the final amount, with the panel, right above the button. */
    showFinalAmountHint() {
      return (
        !this.loadingRefundPreview &&
        !!this.refundPreview &&
        Number(this.refundPreview.originalAmountEur) > 0
      );
    },
  },
  methods: {
    /**
     * The booking's entry of the public status route: its state and price.
     * Throws where the route fails; the page decides what that means.
     */
    async fetchBookingStatus() {
      const response = await ApiBookingService.getBookingStatus(
        this.bookingNumber,
        this.tenantId
      );
      const data = response && response.data;
      if (!Array.isArray(data)) return data || null;
      return (
        data.find((entry) => entry && entry.bookingId === this.bookingNumber) ||
        data[0] ||
        null
      );
    },
  },
};
