<template>
  <div v-if="state" class="cancellation-refund-state">
    <div class="booking-fact">
      <span class="booking-fact__label">
        {{ $t(`${texts}.label`) }}
      </span>
      <span
        class="booking-fact__value cancellation-refund-state__value"
        :class="{ 'warning--text': isOpen }"
      >
        {{ $t(`${texts}.value.${state}`) }}
      </span>
    </div>
    <div
      v-if="dueNote"
      class="cancellation-refund-state__due text-body-2 warning--text mt-1"
    >
      {{ dueNote }}
    </div>
    <v-checkbox
      v-if="canMark"
      :key="checkboxKey"
      class="cancellation-refund-state__mark mt-1 pt-0"
      :input-value="!isOpen"
      :label="$t(`${texts}.mark`)"
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
import {
  REFUND_STATE,
  amountDueOf,
  paymentStateOf,
  refundStateOf,
} from "@/utils/cancellationRefund";

/**
 * What a cancellation leaves to settle by hand, on the Buchungsseite:
 *
 * - `refund` (glossary „Erstattungsstand“): the refund of a paid booking,
 *   offen or erfolgt, with the tick „Rückerstattung erfolgt“;
 * - `payment`: the fee a booking cancelled before it was paid still owes,
 *   offen or erhalten, with the tick „Restzahlung erhalten“.
 *
 * Each is set over its own route by whoever may edit the booking. Like every
 * action on the page it ends in `reload` - after the mark, and after a
 * refusal that says the screen is stale; a failed tick shows the server's
 * state again. Nothing without such a state.
 */
const KINDS = {
  refund: {
    stateOf: refundStateOf,
    texts: "booking.refundState",
    completedAt: "refundCompletedAt",
    completedBy: "refundCompletedByUserId",
    dueOf: () => 0,
    write: (id, state) => ApiBookingService.setRefundState(id, state),
  },
  payment: {
    stateOf: paymentStateOf,
    texts: "booking.paymentState",
    completedAt: "paymentCompletedAt",
    completedBy: "paymentCompletedByUserId",
    dueOf: amountDueOf,
    write: (id, state) => ApiBookingService.setPaymentState(id, state),
  },
};

export default {
  name: "CancellationRefundState",
  props: {
    booking: {
      type: Object,
      required: true,
    },
    kind: {
      type: String,
      default: "refund",
      validator: (value) => Object.keys(KINDS).includes(value),
    },
  },
  data() {
    return {
      inProgress: false,
      failures: 0,
    };
  },
  computed: {
    config() {
      return KINDS[this.kind];
    },
    texts() {
      return this.config.texts;
    },
    state() {
      return this.config.stateOf(this.booking);
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
    /** What an open payment still owes, from the cancellation's audit. */
    dueNote() {
      if (!this.isOpen) return "";
      const amount = this.config.dueOf(this.booking.cancellationRefund);
      if (amount <= 0) return "";
      return this.$t(`${this.texts}.due`, {
        amount: FormatService.currency(amount),
      });
    },
    completedNote() {
      const audit = this.booking.cancellationRefund;
      const completedAt = audit[this.config.completedAt];
      const completedBy = audit[this.config.completedBy];
      if (this.isOpen || !completedAt) return "";
      const date = FormatService.dateTime(completedAt);
      return completedBy
        ? this.$t(`${this.texts}.completedBy`, { date, user: completedBy })
        : this.$t(`${this.texts}.completedAt`, { date });
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async mark(completed) {
      this.inProgress = true;
      try {
        await this.config.write(
          this.booking.id,
          completed ? REFUND_STATE.COMPLETED : REFUND_STATE.OPEN
        );
        this.$emit("reload");
      } catch (error) {
        this.failures += 1;
        await this.addToast({
          title: this.$t(`${this.texts}.error.title`),
          message: getApiErrorMessage(
            error,
            this.$t(`${this.texts}.error.message`)
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
