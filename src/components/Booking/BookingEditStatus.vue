<template>
  <div>
    <v-sheet
      v-if="isCreateMode"
      class="mb-4 px-4 py-3 status-indicator"
      rounded
    >
      <v-row dense>
        <v-col cols="12" sm="4">
          <v-select
            ref="initialStateSelect"
            class="initial-state-select"
            :value="initialState.selection"
            :items="initialStateItems"
            :label="$t('booking.initialState.label')"
            :hint="initialStateHint"
            persistent-hint
            filled
            dense
            background-color="accent"
            @change="setSelection"
          >
            <template #message="{ message }">
              <span class="initial-state-hint">{{ message }}</span>
            </template>
          </v-select>
        </v-col>
        <template v-if="asksPayment">
          <v-col cols="12" sm="4">
            <v-select
              class="initial-state-payment initial-state-payment-method"
              :value="initialState.paymentMethod"
              :items="paymentMethods"
              item-text="title"
              item-value="type"
              :label="$t('booking.initialState.paymentMethod')"
              filled
              dense
              background-color="accent"
              hide-details
              @change="setPaymentMethod"
            />
          </v-col>
          <v-col cols="6" sm="2">
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
                  filled
                  dense
                  readonly
                  hide-details
                  background-color="accent"
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
          <v-col cols="6" sm="2">
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
                  filled
                  dense
                  readonly
                  hide-details
                  background-color="accent"
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
        </template>
      </v-row>
    </v-sheet>

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
          class="booking-status-reason-input mt-1"
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
  statusLabel,
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
 * In create mode (spec E10) there is no state yet: the section asks for the
 * "Anfangszustand" - Angefragt, Freigegeben, or Bezahlt with the payment
 * named - and reports the choice as `update:initial-state`; the form turns
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
    initialStateItems() {
      return initialStateChoices(this.priceEur).map((value) => ({
        value,
        text: this.$t(`booking.initialState.${value}`),
      }));
    },
    initialStateHint() {
      const { status } = initialStateWire(this.initialState, this.priceEur);
      return this.$t("booking.initialState.hint", {
        status: statusLabel(status),
      });
    },
    asksPayment() {
      return this.initialState.selection === INITIAL_STATE.PAID;
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
    /** Bezahlt is only offered with a price; a draft that turns free falls back to Freigegeben. */
    initialStateItems(items) {
      if (
        this.asksPayment &&
        !items.some((item) => item.value === INITIAL_STATE.PAID)
      ) {
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
