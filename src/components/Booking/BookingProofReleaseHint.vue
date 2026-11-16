<template>
  <div
    v-if="openCount > 0"
    class="booking-proof-release-hint"
    data-test="booking-proof-release-hint"
  >
    <v-alert type="warning" border="left" text class="mb-0 text-body-2">
      {{
        $tc(
          series
            ? "booking.proofState.release-hint-series"
            : "booking.proofState.release-hint",
          openCount,
          { count: openCount }
        )
      }}
    </v-alert>
    <div v-if="missing.length > 0" class="mt-4 text-body-2">
      <p v-if="!series" class="mb-0" data-test="booking-proof-release-missing">
        {{
          $t("booking.proofState.release-missing", {
            labels: missing[0].labels.join(", "),
          })
        }}
      </p>
      <template v-else>
        <p class="mb-1">
          {{ $t("booking.proofState.release-missing-series") }}
        </p>
        <ul class="mb-0" data-test="booking-proof-release-missing">
          <li v-for="entry in missing" :key="entry.id">
            {{
              $t("booking.proofState.release-missing-booking", {
                id: entry.id,
                labels: entry.labels.join(", "),
              })
            }}
          </li>
        </ul>
      </template>
      <div v-if="canRemind" class="mt-3">
        <p
          v-if="sent"
          class="mb-0 success--text"
          data-test="booking-proof-release-sent"
        >
          <v-icon small color="success" class="mr-1">mdi-email-check</v-icon>
          {{ $t("booking.proofState.remind-sent") }}
        </p>
        <v-btn
          v-else
          small
          outlined
          color="primary"
          :loading="sending"
          data-test="booking-proof-release-remind"
          @click="remind"
        >
          <v-icon left small>mdi-email-fast-outline</v-icon>
          {{ $tc("booking.proofState.remind", missingCount) }}
        </v-btn>
        <p
          v-if="error"
          class="mt-2 mb-0 error--text"
          data-test="booking-proof-release-error"
        >
          {{ error }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import {
  missingProofLabelsOf,
  openProofCountOfAll,
} from "@/utils/customerUploads";

/**
 * The hint at the release of a booking or series with proofs open or
 * unchecked: how many in the warning, below it which required ones are
 * still missing, and
 * „Nachweise anfordern“, a mail to the booker of each booking with
 * missing ones. The release stays allowed; the hint only warns.
 */
export default {
  name: "BookingProofReleaseHint",
  props: {
    /** The bookings the release concerns, with `customerUploadState`. */
    bookings: {
      type: Array,
      default: () => [],
    },
    /** The release of a series: the missing proofs per booking. */
    series: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return { sending: false, sent: false, error: null };
  },
  computed: {
    openCount() {
      return openProofCountOfAll(this.bookings);
    },
    missing() {
      return this.bookings
        .filter(Boolean)
        .map((booking) => ({
          id: booking.id,
          tenantId: booking.tenantId,
          labels: missingProofLabelsOf(booking),
        }))
        .filter((entry) => entry.labels.length > 0);
    },
    missingCount() {
      return this.missing.reduce((sum, entry) => sum + entry.labels.length, 0);
    },
    canRemind() {
      return BookingPermissionService.allowReviewProof();
    },
  },
  watch: {
    bookings() {
      this.sent = false;
      this.error = null;
    },
  },
  methods: {
    async remind() {
      this.sending = true;
      this.error = null;
      try {
        for (const entry of this.missing) {
          await ApiBookingService.remindCustomerUploads(
            entry.tenantId,
            entry.id
          );
        }
        this.sent = true;
      } catch (error) {
        this.error = getApiErrorMessage(
          error,
          this.$t("booking.proofState.remind-error")
        );
      } finally {
        this.sending = false;
      }
    },
  },
};
</script>
