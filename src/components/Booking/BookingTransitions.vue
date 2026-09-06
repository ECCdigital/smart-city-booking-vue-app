<template>
  <div class="booking-transitions">
    <GroupBookingCommitDialog
      v-if="booking"
      :booking-id="booking.id"
      :open="dialog === 'commitGroup'"
      :in-progress="inProgress"
      :error="error"
      @close="closeDialog"
      @commit-single-booking="confirmSingle"
      @commit-group-booking="confirmGroup"
    />
    <BookingPayDialog
      v-if="booking"
      :booking-id="booking.id"
      :open="dialog === 'pay'"
      :has-group-booking="!!groupBooking"
      :in-progress="inProgress"
      :error="error"
      @close="closeDialog"
      @pay-single-booking="paySingle"
      @pay-group-booking="payGroup"
    />
    <BookingRejectConformationDialog
      v-if="booking"
      :to-reject="booking"
      :open="dialog === 'cancel'"
      :loading="inProgress"
      :error="error"
      @close="closeDialog"
      @reject-booking="cancelSingle"
    />
    <GroupBookingRejectConformationDialog
      v-if="booking"
      :to-reject="booking"
      :group-booking-id="groupBooking?.id"
      :group-bookings="members"
      :open="dialog === 'cancelGroup'"
      :in-progress="inProgress"
      :error="error"
      @close="closeDialog"
      @reject-single-booking="cancelSingle"
      @reject-group-booking="cancelGroup"
    />
    <v-dialog
      v-if="booking"
      :value="dialog === 'reinstate'"
      persistent
      max-width="520px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-restore</v-icon>
          <span class="text-h6">{{
            $t("booking.reinstate.dialog.title")
          }}</span>
        </v-card-title>
        <v-card-text>
          <p class="mb-0 text-body-2">{{ reinstateHint }}</p>
        </v-card-text>
        <v-card-text v-if="error" class="pt-0">
          <v-alert type="error" border="left" elevation="2" class="mb-0">
            {{ error }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn text @click="closeDialog">Abbrechen</v-btn>
          <v-btn color="primary" :loading="inProgress" @click="reinstate">
            {{ $t("booking.action.reinstate") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import GroupBookingCommitDialog from "@/components/Booking/GroupBookingCommitDialog.vue";
import BookingPayDialog from "@/components/Booking/BookingPayDialog.vue";
import BookingRejectConformationDialog from "@/components/Booking/BookingRejectConformationDialog.vue";
import GroupBookingRejectConformationDialog from "@/components/Booking/GroupBookingRejectConformationDialog.vue";
import ProcessingService from "@/services/ProcessingService";
import ToastService from "@/services/ToastService";
import {
  getBookingErrorMessage,
  getGroupBookingErrorMessage,
} from "@/utils/errorMessages";
import {
  BOOKING_ACTION,
  BOOKING_STATUS,
  MIXED,
  allowsAction,
  groupBookingStatus,
} from "@/utils/bookingStatus";
import {
  getApiErrorMessage,
  shouldRefetch,
} from "@/services/api/apiErrorMessage";

/**
 * The one place the admin's four transitions run (spec E2, E3): Freigeben,
 * Als bezahlt markieren, Ablehnen / Stornieren and Wiederherstellen, each an
 * immediate call of its own route. A host mounts this once, renders only the
 * triggers, and drives it through `start(action, target)`; it answers with
 * `transitioned` on success and `failed` after it has handled the error
 * (spec E5): the message is read centrally, toasted, kept inline in the
 * open dialog, and `refetch` tells the host to reload after a 409 or 404.
 */
export default {
  name: "BookingTransitions",
  components: {
    GroupBookingCommitDialog,
    BookingPayDialog,
    BookingRejectConformationDialog,
    GroupBookingRejectConformationDialog,
  },
  data() {
    return {
      target: null,
      dialog: null,
      inProgress: false,
      error: null,
    };
  },
  computed: {
    booking() {
      return this.target?.booking || null;
    },
    groupBooking() {
      return this.target?.groupBooking || null;
    },
    members() {
      return this.target?.bookings || [];
    },
    reinstateHint() {
      const key =
        this.booking?.status === BOOKING_STATUS.CANCELLED
          ? "booking.reinstate.dialog.hint-cancelled"
          : "booking.reinstate.dialog.hint-rejected";
      return this.$t(key, { id: this.booking?.id });
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),

    /**
     * `target` is `{ booking }` for a single booking or
     * `{ booking, groupBooking, bookings }` for a member of a series, where
     * `bookings` are the members and `booking` the one the action was
     * triggered from. Availability is the host's business (`allowsAction`);
     * the module only refuses what the state forbids.
     */
    start(action, target) {
      this.target = target;
      this.error = null;
      if (!allowsAction(this.booking, action)) {
        this.refuse(action, "booking.transition.not-allowed");
        return;
      }
      switch (action) {
        case BOOKING_ACTION.CONFIRM:
          if (this.groupBooking) {
            this.openDialog("commitGroup");
          } else {
            this.confirmSingle();
          }
          break;
        case BOOKING_ACTION.PAY:
          this.openDialog("pay");
          break;
        case BOOKING_ACTION.CANCEL:
          this.openDialog(this.groupBooking ? "cancelGroup" : "cancel");
          break;
        case BOOKING_ACTION.REINSTATE:
          // There is no series-wide reinstate; a member is reinstated alone.
          this.openDialog("reinstate");
          break;
        default:
          break;
      }
    },

    openDialog(dialog) {
      this.dialog = dialog;
    },
    closeDialog() {
      this.dialog = null;
      this.error = null;
    },

    async confirmSingle() {
      const booking = this.booking;
      if (booking.priceEur > 0 && !booking.paymentProvider) {
        return this.refuse(
          BOOKING_ACTION.CONFIRM,
          "booking.commit.no-payment-method"
        );
      }
      return this.run(BOOKING_ACTION.CONFIRM, {
        overlay: "Buchung wird freigegeben...",
        call: () => ApiBookingService.commitBooking(booking.id),
        successKey: "booking.commit.success",
        errorKey: "booking.commit.error",
        result: { bookingId: booking.id },
      });
    },
    async confirmGroup() {
      if (!(await this.groupAllows(BOOKING_ACTION.CONFIRM))) return false;
      return this.run(BOOKING_ACTION.CONFIRM, {
        overlay: "Serienbuchung wird freigegeben...",
        call: () =>
          ApiGroupBookingService.commitGroupBooking(null, this.groupBooking.id),
        successKey: "group-booking.commit.success",
        errorKey: "group-booking.commit.error",
        result: { groupBookingId: this.groupBooking.id },
        group: true,
      });
    },

    async paySingle({ id, paymentMethod, timePaid }) {
      return this.run(BOOKING_ACTION.PAY, {
        overlay: "Zahlung wird verarbeitet...",
        call: () => ApiBookingService.payBooking(id, paymentMethod, timePaid),
        successKey: "booking.pay.success",
        errorKey: "booking.pay.error",
        result: { bookingId: id },
      });
    },
    async payGroup({ paymentMethod, timePaid }) {
      if (!(await this.groupAllows(BOOKING_ACTION.PAY))) return false;
      return this.run(BOOKING_ACTION.PAY, {
        overlay: "Zahlung wird verarbeitet...",
        call: () =>
          ApiGroupBookingService.payGroupBooking({
            id: this.groupBooking.id,
            paymentMethod,
            timePaid,
          }),
        successKey: "group-booking.pay.success",
        errorKey: "group-booking.pay.error",
        result: { groupBookingId: this.groupBooking.id },
        group: true,
      });
    },

    async cancelSingle(
      id,
      rejectReason,
      skipCancellation,
      bankDetails,
      refundPercentage
    ) {
      return this.run(BOOKING_ACTION.CANCEL, {
        overlay:
          this.booking?.status === BOOKING_STATUS.REQUESTED
            ? "Buchung wird abgelehnt..."
            : "Buchung wird storniert...",
        // `POST …/reject` answers 200 with an empty body.
        call: () =>
          ApiBookingService.rejectBooking(
            id,
            null,
            rejectReason,
            skipCancellation,
            bankDetails,
            refundPercentage
          ),
        successKey: "booking.reject.success",
        errorKey: "booking.reject.error",
        result: { bookingId: id },
      });
    },
    async cancelGroup(
      id,
      rejectReason,
      skipCancellation,
      bankDetails,
      refundPercentage
    ) {
      if (!(await this.groupAllows(BOOKING_ACTION.CANCEL))) return false;
      return this.run(BOOKING_ACTION.CANCEL, {
        overlay: "Serienbuchung wird storniert...",
        call: () =>
          ApiGroupBookingService.rejectGroupBooking(
            null,
            this.groupBooking.id,
            rejectReason,
            skipCancellation,
            bankDetails,
            refundPercentage
          ),
        successKey: "group-booking.reject.success",
        errorKey: "group-booking.reject.error",
        result: { groupBookingId: this.groupBooking.id },
        group: true,
      });
    },

    async reinstate() {
      const booking = this.booking;
      return this.run(BOOKING_ACTION.REINSTATE, {
        overlay: "Buchung wird wiederhergestellt...",
        call: () => ApiBookingService.reinstateBooking(booking.id),
        successKey: "booking.reinstate.success",
        errorKey: "booking.reinstate.error",
        result: { bookingId: booking.id },
      });
    },

    /**
     * A series-wide action runs only where the members share one state
     * (spec E9); a mixed series is refused with a word, and its members are
     * acted on one by one.
     */
    async groupAllows(action) {
      const status = groupBookingStatus(this.members);
      if (status === MIXED) {
        await this.refuse(action, "group-booking.transition.mixed");
        return false;
      }
      if (!allowsAction({ status }, action)) {
        await this.refuse(action, "booking.transition.not-allowed");
        return false;
      }
      return true;
    },

    /**
     * One transition end to end: overlay, the call, the consistency check's
     * 200 `{ success: false, errors }`, the thrown error, and the events.
     * On success the open dialog closes; on failure it stays, with the
     * message inline.
     */
    async run(
      action,
      { overlay, call, successKey, errorKey, result, group = false }
    ) {
      const operationId = ProcessingService.showOverlay(overlay);
      this.inProgress = true;
      this.error = null;
      try {
        const data = await call();
        if (data && data.success === false) {
          return this.failConsistency(action, errorKey, data.errors, group);
        }
        await this.addToast(ToastService.createToast(successKey, "success"));
        this.dialog = null;
        this.$emit("transitioned", { action, ...result });
        return true;
      } catch (error) {
        return this.failTransition(action, error, errorKey);
      } finally {
        this.inProgress = false;
        ProcessingService.hide(operationId);
      }
    },

    /**
     * The route answered 200 with `success: false` - today's evaluation
     * stays: the first error's code picks the message, and a body without
     * errors says nothing, as the list did before.
     */
    async failConsistency(action, errorKey, errors, group) {
      if (!errors?.length) {
        return this.fail(action, null, null, false);
      }
      const code = errors[0]?.code;
      const message = group
        ? getGroupBookingErrorMessage(code)
        : getBookingErrorMessage(code);
      await this.addToast(ToastService.createToast(errorKey, "error"));
      return this.fail(action, null, message, false);
    },

    /** The route refused (spec E5). */
    async failTransition(action, error, errorKey) {
      const message =
        // `POST …/reject` answers a bad percentage with the naked string.
        error?.response?.data === "invalid_refund_percentage"
          ? this.$t("booking.cancellationRefund.percentageRange")
          : getApiErrorMessage(error, this.$t(`${errorKey}.message`));
      await this.addToast({
        title: this.$t(`${errorKey}.title`),
        message,
        type: "error",
      });
      return this.fail(action, error, message, shouldRefetch(error));
    },

    /** Nothing was called: the module refused the action itself. */
    async refuse(action, key) {
      await this.addToast(ToastService.createToast(key, "error"));
      return this.fail(action, null, this.$t(`${key}.message`), false);
    },

    fail(action, error, message, refetch) {
      this.error = message;
      this.$emit("failed", { action, error, message, refetch });
      return false;
    },
  },
};
</script>

<style scoped></style>
