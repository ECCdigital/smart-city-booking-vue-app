<template>
  <v-container
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    "
  >
    <v-card
      class="pa-4 rounded-sm"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center" v-if="fetching">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Bitte warten, Ihre Stornierung wird verarbeitet...</p>
      </v-card-text>

      <v-card-text class="text-center" v-else-if="rejectSuccess">
        <v-icon size="45px" color="success">mdi-check</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung bestätigt</p>
        <p>
          Ihre Stornierung wurde erfolgreich bestätigt. Sie erhalten in Kürze
          eine Bestätigung per E-Mail.
        </p>
        <CancellationRefundPanel
          v-if="showRefundPanel"
          class="text-left mt-4"
          :title="refundWording.title"
          :original-amount-eur="refundPreview.originalAmountEur"
          :refund-amount-eur="refundPreview.refundAmountEur"
          :cancellation-fee-eur="refundPreview.cancellationFeeEur"
          :policy-summary="refundPolicySummary"
          :unpaid="unpaid"
        />
        <v-alert
          v-if="paymentOutcome"
          :type="paymentOutcome.type"
          text
          dense
          class="text-left text-body-2 mt-4 mb-0"
        >
          <div class="font-weight-bold">{{ paymentOutcome.status }}</div>
          <div v-if="paymentOutcome.text">{{ paymentOutcome.text }}</div>
        </v-alert>
      </v-card-text>

      <v-card-text class="text-center" v-else-if="rejectError">
        <v-icon size="45px" color="error">mdi-close</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung nicht möglich</p>
        <p v-if="alreadyCancelled">
          {{ $t("booking.userCancellation.alreadyCancelled") }}
        </p>
        <p v-else>
          Die Stornierung konnte nicht durchgeführt werden. Bitte versuchen Sie
          es erneut oder kontaktieren Sie Ihren Ansprechpartner.
        </p>

        <v-btn
          v-if="!alreadyCancelled"
          color="primary"
          class="mt-4"
          @click="releaseRejectHook"
          :disabled="fetching"
        >
          Erneut versuchen
        </v-btn>
      </v-card-text>

      <v-card-text class="text-center" v-else>
        <v-icon size="45px" color="warning">mdi-help-circle-outline</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung bestätigen</p>
        <p>
          Möchten Sie die Buchung mit der Nummer
          <strong>{{ bookingNumber }}</strong> wirklich stornieren?
        </p>

        <v-skeleton-loader
          v-if="loadingRefundPreview"
          type="list-item-three-line"
          class="mt-4 mb-2"
        />
        <CancellationRefundPanel
          v-else-if="showRefundPanel"
          class="text-left mt-4"
          :title="refundWording.title"
          :original-amount-eur="refundPreview.originalAmountEur"
          :refund-amount-eur="refundPreview.refundAmountEur"
          :cancellation-fee-eur="refundPreview.cancellationFeeEur"
          :policy-summary="refundPolicySummary"
          :unpaid="unpaid"
        />
        <v-alert
          v-else-if="refundPreviewError"
          type="warning"
          text
          dense
          class="mt-4 mb-0 text-left"
        >
          {{ refundWording.previewError }}
        </v-alert>
        <v-alert
          v-if="paymentOutcome"
          :type="paymentOutcome.type"
          text
          dense
          class="text-left text-body-2 mt-4 mb-0"
        >
          <div class="font-weight-bold">{{ paymentOutcome.status }}</div>
          <div v-if="paymentOutcome.text">{{ paymentOutcome.text }}</div>
        </v-alert>
        <!-- Right above the button: the amount is fixed at the confirmation. -->
        <div
          v-if="showFinalAmountHint"
          class="text-left text-caption text--secondary mt-2"
        >
          {{ refundWording.footer }}
        </div>

        <div
          class="mt-4"
          style="display: flex; justify-content: center; gap: 8px"
        >
          <v-btn
            color="primary"
            @click="releaseRejectHook"
            :disabled="fetching"
          >
            Stornierung bestätigen
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import CancellationRefundPanel from "@/components/Booking/CancellationRefundPanel.vue";
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

export default {
  name: "VerifyRejectBooking",
  components: { CancellationRefundPanel },
  props: {
    tenantId: {
      type: String,
    },
  },
  data() {
    return {
      bookingNumber: this.$route.query.id,
      hookId: this.$route.query.hookId,
      rejectSuccess: false,
      rejectError: false,
      // `…/release` answers 409 on a booking that is already cancelled - a
      // retry cannot succeed, so the page says so instead of offering one.
      alreadyCancelled: false,
      fetching: false,
      refundPreview: null,
      loadingRefundPreview: false,
      refundPreviewError: false,
      // The booking's state and price from the public status route: whether
      // it is paid. `null` while unknown - the page then words the preview
      // as before and leaves the payment hint out.
      bookingStatus: null,
    };
  },
  computed: {
    showRefundPanel() {
      return (
        this.refundPreview && Number(this.refundPreview.originalAmountEur) > 0
      );
    },
    /** A price is set but not paid yet: nothing comes back. */
    unpaid() {
      return (
        !!this.bookingStatus &&
        !isFree(this.bookingStatus) &&
        !isPaid(this.bookingStatus)
      );
    },
    /** Shown with the refund panel, under everything else. */
    showFinalAmountHint() {
      return !this.loadingRefundPreview && !!this.showRefundPanel;
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
  },
  methods: {
    /** Only informs the hint: a failure leaves it out, nothing else. */
    async loadBookingStatus() {
      if (!this.bookingNumber || !this.tenantId) return;
      try {
        const response = await ApiBookingService.getBookingStatus(
          this.bookingNumber,
          this.tenantId
        );
        const data = response && response.data;
        this.bookingStatus =
          (Array.isArray(data)
            ? data.find((entry) => entry?.bookingId === this.bookingNumber) ||
              data[0]
            : data) || null;
      } catch (error) {
        console.error(error);
        this.bookingStatus = null;
      }
    },
    async loadRefundPreview() {
      if (!this.bookingNumber || !this.tenantId || !this.hookId) {
        return;
      }

      this.loadingRefundPreview = true;
      this.refundPreviewError = false;
      try {
        this.refundPreview =
          await ApiBookingService.getHookCancellationRefundPreview(
            this.bookingNumber,
            this.tenantId,
            this.hookId
          );
      } catch (error) {
        console.error(error);
        this.refundPreview = null;
        this.refundPreviewError = true;
      } finally {
        this.loadingRefundPreview = false;
      }
    },
    async releaseRejectHook() {
      this.fetching = true;
      this.rejectError = false;
      this.alreadyCancelled = false;

      try {
        const response = await ApiBookingService.releaseBookingHook(
          this.bookingNumber,
          this.tenantId,
          this.hookId
        );

        if (response.status === 200) {
          this.rejectSuccess = true;
        } else {
          this.rejectError = true;
        }
      } catch (error) {
        console.error(error);
        this.rejectError = true;
        this.alreadyCancelled = error?.response?.status === 409;
      } finally {
        this.fetching = false;
      }
    },
  },
  async mounted() {
    await Promise.all([this.loadBookingStatus(), this.loadRefundPreview()]);
  },
};
</script>

<style scoped></style>
