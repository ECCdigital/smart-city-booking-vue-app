<template>
  <div>
    <BookingStatusPath
      v-if="isCreateMode"
      class="mb-4"
      chooser
      :label="$t('booking.initialState.label')"
      :status="draftStatus"
      :path="draftPath"
      :value="draftStatus"
      @input="choose"
    >
      <template v-if="asksPayment" #payment>
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-select
              class="initial-state-payment initial-state-payment-method"
              :value="initialState.paymentMethod"
              :items="paymentMethods"
              item-text="title"
              item-value="type"
              :label="$t('booking.initialState.paymentMethod')"
              outlined
              dense
              hide-details
              @change="setPaymentMethod"
            />
          </v-col>
          <v-col cols="6" sm="3">
            <v-menu
              v-model="dateMenu"
              :close-on-content-click="false"
              offset-y
              min-width="auto"
            >
              <template #activator="{ on, attrs }">
                <v-text-field
                  class="initial-state-payment initial-state-payment-date"
                  :value="paymentDateLabel"
                  :label="$t('booking.initialState.date')"
                  prepend-inner-icon="mdi-calendar"
                  outlined
                  dense
                  readonly
                  hide-details
                  v-bind="attrs"
                  v-on="on"
                />
              </template>
              <v-date-picker
                v-model="paymentDate"
                locale="de-DE"
                :first-day-of-week="1"
                @input="dateMenu = false"
              />
            </v-menu>
          </v-col>
          <v-col cols="6" sm="3">
            <v-menu
              v-model="timeMenu"
              :close-on-content-click="false"
              offset-y
              max-width="290px"
              min-width="290px"
            >
              <template #activator="{ on, attrs }">
                <v-text-field
                  class="initial-state-payment initial-state-payment-time"
                  :value="paymentTime"
                  :label="$t('booking.initialState.time')"
                  prepend-inner-icon="mdi-clock-outline"
                  outlined
                  dense
                  readonly
                  hide-details
                  v-bind="attrs"
                  v-on="on"
                />
              </template>
              <v-time-picker
                v-if="timeMenu"
                v-model="paymentTime"
                format="24hr"
                full-width
                @click:minute="timeMenu = false"
              />
            </v-menu>
          </v-col>
        </v-row>
      </template>
    </BookingStatusPath>

    <BookingStatusPath
      v-else
      class="mb-4"
      :status="booking.status"
      :path="path"
      :actions="actions"
      :disabled="dirty"
      :hint="dirty && actions.length ? $t('booking.edit.saveFirst') : null"
      @action="transition"
    >
      <template v-if="isRejectedOrCancelled(booking)" #reason>
        <div class="text-caption font-weight-bold error--text">
          {{ rejectionReasonLabel }}
        </div>
        <v-textarea
          class="mt-1"
          :value="booking.rejectionReason"
          outlined
          dense
          rows="2"
          hide-details="auto"
          :rules="rejectionReasonRules"
          @input="$emit('update:rejection-reason', $event)"
        />
      </template>
    </BookingStatusPath>

    <v-expand-transition>
      <v-sheet
        v-if="cancellationRefundAudit"
        class="mb-4 px-4 py-3"
        outlined
        rounded
      >
        <CancellationRefundAudit :audit="cancellationRefundAudit" />
      </v-sheet>
    </v-expand-transition>

    <BookingTransitions
      v-if="!isCreateMode"
      ref="transitions"
      @transitioned="$emit('transitioned', $event)"
      @failed="$emit('failed', $event)"
    />
  </div>
</template>

<script>
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import CancellationRefundAudit from "@/components/Booking/CancellationRefundAudit.vue";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { getCancellationRefundAudit } from "@/utils/cancellationRefund";
import {
  INITIAL_STATE,
  initialStateChoices,
  initialStateWire,
  timePaidOf,
  timePaidParts,
} from "@/utils/bookingForm";
import {
  BOOKING_STATUS,
  isRejectedOrCancelled,
  pathOf,
  transitionActions,
  transitionTarget,
} from "@/utils/bookingStatus";

/**
 * The status section of the edit form (spec E2, N4): the state as a
 * headline over its path, with the one action along the path as a button
 * and the side ways in the menu, each run by the mounted
 * `BookingTransitions`. Button and menu are locked while the form has
 * unsaved changes - there is no "save, then transition", and no transition
 * on the server's copy while the local one differs. At Abgelehnt /
 * Storniert the reason is edited under the path; the section reports the
 * edit as `update:rejection-reason` and leaves the booking to the form. The
 * form hears `transitioned` and `failed` and reloads the booking.
 *
 * In create mode (spec E10, N6) there is no state yet: the same headline is
 * the choice of the "Anfangszustand" - the draft's path with its segments
 * as radios, named with the state words. The choice stays the act: Angefragt
 * is `requested`, Zahlung offen is `confirmed`, Bestätigt is `paid` on a
 * priced draft (with the payment named under the line) and `confirmed` on a
 * free one. The section reports it as `update:initial-state`; the form turns
 * it into the create PUT's `status`.
 */
export default {
  name: "BookingEditStatus",
  components: {
    BookingStatusPath,
    BookingTransitions,
    CancellationRefundAudit,
  },
  props: {
    booking: {
      type: Object,
      required: true,
    },
    /** True while the form has unsaved changes; locks the actions. */
    dirty: {
      type: Boolean,
      default: false,
    },
    /** The series the booking belongs to, with its `bookings` where the page loaded them populated. */
    groupBooking: {
      type: Object,
      default: null,
    },
    /** Create mode: the price the booking will be created with, deciding whether Bezahlt is offered. */
    priceEur: {
      type: Number,
      default: 0,
    },
    /** Create mode: the form's `{ type, title }` payment methods. */
    paymentMethods: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      // Create mode: the choice; its `timePaid` is derived from the pickers below.
      initialState: { selection: INITIAL_STATE.REQUESTED, paymentMethod: null },
      paymentDate: null,
      paymentTime: null,
      dateMenu: false,
      timeMenu: false,
    };
  },
  computed: {
    isCreateMode() {
      return !this.booking.id;
    },
    /** The choices the price allows; Bezahlt only with something to pay. */
    initialStateChoices() {
      return initialStateChoices(this.priceEur);
    },
    asksPayment() {
      return this.initialState.selection === INITIAL_STATE.PAID;
    },
    /** The state the draft would be born in - what the headline wears and checks. */
    draftStatus() {
      return initialStateWire(this.initialState, this.priceEur).status;
    },
    /** The draft read as a path: the chosen step current, the paid date under Bestätigt. */
    draftPath() {
      return pathOf({
        status: this.draftStatus,
        priceEur: this.priceEur,
        timePaid: this.asksPayment ? this.timePaid : null,
      });
    },
    timePaid() {
      return timePaidOf(this.paymentDate, this.paymentTime);
    },
    paymentDateLabel() {
      if (!this.paymentDate) return "";
      return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
        new Date(this.paymentDate)
      );
    },
    path() {
      return pathOf(this.booking);
    },
    /** The state's transitions, for whoever may edit the booking - the gate the list and the drawer use. */
    actions() {
      if (!BookingPermissionService.allowUpdate(this.booking)) return [];
      return transitionActions(this.booking.status);
    },
    rejectionReasonLabel() {
      return this.booking.status === BOOKING_STATUS.CANCELLED
        ? this.$t("booking.edit.reason.cancelled")
        : this.$t("booking.edit.reason.rejected");
    },
    rejectionReasonRules() {
      return [(v) => !!v?.trim() || this.$t("booking.edit.reason.required")];
    },
    cancellationRefundAudit() {
      return getCancellationRefundAudit(this.booking);
    },
  },
  watch: {
    /** Bezahlt is only offered with a price; a paid draft that turns free falls back to `confirmed`. */
    initialStateChoices(choices) {
      if (this.asksPayment && !choices.includes(INITIAL_STATE.PAID)) {
        this.setSelection(INITIAL_STATE.CONFIRMED);
      }
    },
    timePaid() {
      this.emitInitialState();
    },
  },
  created() {
    if (this.isCreateMode) {
      this.emitInitialState();
    }
  },
  methods: {
    isRejectedOrCancelled,
    transition(action) {
      if (this.dirty) return;
      this.$refs.transitions.start(
        action,
        transitionTarget(this.booking, this.groupBooking)
      );
    },
    /**
     * A segment names a state; the choice is the act that gets there:
     * Angefragt `requested`, Zahlung offen `confirmed`, Bestätigt `paid`
     * where there is something to pay, else `confirmed`.
     */
    choose(status) {
      let selection = INITIAL_STATE.REQUESTED;
      if (status === BOOKING_STATUS.PAYMENT_DUE) {
        selection = INITIAL_STATE.CONFIRMED;
      } else if (status === BOOKING_STATUS.CONFIRMED) {
        selection = this.initialStateChoices.includes(INITIAL_STATE.PAID)
          ? INITIAL_STATE.PAID
          : INITIAL_STATE.CONFIRMED;
      }
      this.setSelection(selection);
    },
    setSelection(selection) {
      this.initialState.selection = selection;
      if (selection === INITIAL_STATE.PAID && !this.paymentDate) {
        // A booking born paid needs its `timePaid`; now is the honest default.
        const { paymentDate, paymentTime } = timePaidParts(Date.now());
        this.paymentDate = paymentDate;
        this.paymentTime = paymentTime;
      }
      this.emitInitialState();
    },
    setPaymentMethod(paymentMethod) {
      this.initialState.paymentMethod = paymentMethod;
      this.emitInitialState();
    },
    emitInitialState() {
      this.$emit("update:initial-state", {
        selection: this.initialState.selection,
        paymentMethod: this.initialState.paymentMethod,
        timePaid: this.timePaid,
      });
    },
  },
};
</script>
