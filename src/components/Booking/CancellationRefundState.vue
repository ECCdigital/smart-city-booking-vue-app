<template>
  <div v-if="state" class="cancellation-refund-state">
    <div class="booking-fact">
      <span class="booking-fact__label">
        {{ $t("booking.refundState.label") }}
      </span>
      <span
        class="booking-fact__value cancellation-refund-state__value"
        :class="{ 'warning--text': isOpen }"
      >
        {{ $t(`booking.refundState.value.${state}`) }}
      </span>
    </div>
    <v-checkbox
      v-if="canMark"
      :key="checkboxKey"
      class="cancellation-refund-state__mark mt-1 pt-0"
      :input-value="!isOpen"
      :label="$t('booking.refundState.mark')"
      :disabled="inProgress"
      dense
      hide-details
      @change="mark"
    />
    <div
      v-if="completedNote"
      class="cancellation-refund-state__note text-caption text--secondary mt-1"
    >
      {{ completedNote }}
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import FormatService from "@/services/FormatService";
import {
  getApiErrorMessage,
  shouldRefetch,
} from "@/services/api/apiErrorMessage";
import { REFUND_STATE, refundStateOf } from "@/utils/cancellationRefund";

/**
 * The refund state of a cancelled booking (glossary „Erstattungsstand“) on
 * its Buchungsseite: offen or erfolgt, and for whoever may edit the booking
 * the tick „Rückerstattung erfolgt“, set over its own route and taken back
 * the same way. Like every action on the page it ends in `reload` - after
 * the tick, and after a refusal that says the screen is stale; a failed tick
 * shows the server's state again. Nothing without a refund state.
 */
export default {
  name: "CancellationRefundState",
  props: {
    booking: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      inProgress: false,
      failures: 0,
    };
  },
  computed: {
    state() {
      return refundStateOf(this.booking);
    },
    isOpen() {
      return this.state === REFUND_STATE.OPEN;
    },
    canMark() {
      return BookingPermissionService.allowUpdate(this.booking);
    },
    /** Draws the box anew on the server's state: after a reload, and after a failed tick. */
    checkboxKey() {
      return `${this.state}-${this.failures}`;
    },
    completedNote() {
      const { refundCompletedAt, refundCompletedByUserId } =
        this.booking.cancellationRefund;
      if (this.isOpen || !refundCompletedAt) return "";
      const date = FormatService.dateTime(refundCompletedAt);
      return refundCompletedByUserId
        ? this.$t("booking.refundState.completedBy", {
            date,
            user: refundCompletedByUserId,
          })
        : this.$t("booking.refundState.completedAt", { date });
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async mark(completed) {
      this.inProgress = true;
      try {
        await ApiBookingService.setRefundState(
          this.booking.id,
          completed ? REFUND_STATE.COMPLETED : REFUND_STATE.OPEN
        );
        this.$emit("reload");
      } catch (error) {
        this.failures += 1;
        await this.addToast({
          title: this.$t("booking.refundState.error.title"),
          message: getApiErrorMessage(
            error,
            this.$t("booking.refundState.error.message")
          ),
          type: "error",
        });
        if (shouldRefetch(error)) {
          this.$emit("reload");
        }
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>
