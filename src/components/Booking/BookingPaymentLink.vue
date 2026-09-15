<template>
  <div
    v-if="visible"
    class="booking-payment-link booking-page__kv d-flex align-center justify-space-between"
  >
    <div>
      <div class="text-caption grey--text">
        {{ $t("booking.page.payment.link") }}
      </div>
      <div class="text-body-2">
        {{ $t("booking.page.payment.link-pending") }}
      </div>
    </div>
    <div class="d-flex align-center">
      <template v-if="groupBooking">
        <v-menu offset-y>
          <template #activator="{ on, attrs }">
            <v-btn
              icon
              small
              class="booking-payment-link__copy"
              :color="copied ? 'success' : undefined"
              :title="copyTitle"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon small>{{ copyIcon }}</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item @click="copy(false)">
              <v-list-item-title>
                {{ $t("booking.page.payment.link-single") }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item @click="copy(true)">
              <v-list-item-title>{{ seriesLabel }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-menu offset-y>
          <template #activator="{ on, attrs }">
            <v-btn
              icon
              small
              class="booking-payment-link__open"
              :title="$t('booking.page.payment.link-open')"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon small>mdi-open-in-new</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item @click="open(false)">
              <v-list-item-title>
                {{ $t("booking.page.payment.link-single") }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item @click="open(true)">
              <v-list-item-title>{{ seriesLabel }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      <template v-else>
        <v-btn
          icon
          small
          class="booking-payment-link__copy"
          :color="copied ? 'success' : undefined"
          :title="copyTitle"
          @click="copy(false)"
        >
          <v-icon small>{{ copyIcon }}</v-icon>
        </v-btn>
        <v-btn
          icon
          small
          class="booking-payment-link__open"
          :title="$t('booking.page.payment.link-open')"
          @click="open(false)"
        >
          <v-icon small>mdi-open-in-new</v-icon>
        </v-btn>
      </template>
    </div>
  </div>
</template>

<script>
import { isAwaitingPayment } from "@/utils/bookingStatus";

/** How long the copy icon reads "Kopiert" (the codebase's copy pattern). */
const COPIED_MS = 2000;

/**
 * The row "Zahlungslink" of a Buchungsseite's Zahlung block: the customer's
 * payment URL (CONTEXT.md: not the Buchungslink) to copy or open while the
 * payment is pending over a provider other than invoice. A series member
 * chooses between its own link and the series' aggregated one.
 */
export default {
  name: "BookingPaymentLink",
  props: {
    booking: {
      type: Object,
      required: true,
    },
    groupBooking: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      copied: false,
      copiedTimer: null,
    };
  },
  computed: {
    visible() {
      return (
        isAwaitingPayment(this.booking) &&
        !!this.booking.paymentProvider &&
        this.booking.paymentProvider !== "invoice"
      );
    },
    copyIcon() {
      return this.copied ? "mdi-check" : "mdi-content-copy";
    },
    copyTitle() {
      return this.copied
        ? this.$t("booking.page.payment.link-copied")
        : this.$t("booking.page.payment.link-copy");
    },
    seriesLabel() {
      return this.$t("booking.page.payment.link-series", {
        count: this.groupBooking?.bookingIds?.length || 0,
      });
    },
  },
  beforeDestroy() {
    clearTimeout(this.copiedTimer);
  },
  methods: {
    /** The storefront's redirection page, for one booking or the whole series. */
    paymentLink(aggregated) {
      const baseUrl = `${window.location.origin}${process.env.BASE_URL}payment/redirection`;
      const sanitizedBaseUrl = baseUrl.replace(/\/+$/, "");
      const ids =
        aggregated && this.groupBooking?.bookingIds
          ? this.groupBooking.bookingIds.join(",")
          : this.booking.id;
      return `${sanitizedBaseUrl}?ids=${ids}&tenant=${
        this.booking.tenantId
      }&aggregated=${aggregated && !!this.groupBooking?.bookingIds}`;
    },
    async copy(aggregated) {
      await navigator.clipboard.writeText(this.paymentLink(aggregated));
      this.copied = true;
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => {
        this.copied = false;
      }, COPIED_MS);
    },
    open(aggregated) {
      window.open(
        this.paymentLink(aggregated),
        "_blank",
        "noopener,noreferrer"
      );
    },
  },
};
</script>
