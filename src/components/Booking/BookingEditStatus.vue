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

    <v-sheet v-else class="mb-4 px-4 py-3 status-indicator" rounded>
      <div class="d-flex flex-wrap align-center">
        <v-chip
          class="booking-status-chip mr-2 my-1"
          :color="statusColor(booking.status)"
          text-color="white"
          small
        >
          <v-icon small left>{{ statusIcon(booking.status) }}</v-icon>
          {{ statusLabel(booking.status) }}
        </v-chip>
        <v-chip
          v-if="isFree(booking)"
          class="booking-status-free mr-2 my-1"
          :color="freeMarker().color"
          :text-color="freeMarker().textColor"
          small
        >
          <v-icon small left>{{ freeMarker().icon }}</v-icon>
          {{ freeMarker().label }}
        </v-chip>
        <span
          v-if="paidAt"
          class="booking-status-paid-at text--secondary text-body-2 mr-2 my-1"
        >
          {{ $t("booking.status.paidAt", { date: paidAt }) }}
        </span>
        <v-spacer />
        <v-btn
          v-for="action in actions"
          :key="action"
          class="booking-action ml-2 my-1"
          :color="actionColor(action)"
          :disabled="dirty"
          small
          outlined
          @click="transition(action)"
        >
          <v-icon small left>{{ actionIcon(action) }}</v-icon>
          {{ actionLabel(action, booking.status) }}
        </v-btn>
      </div>
      <div
        v-if="dirty && actions.length"
        class="booking-status-hint text-caption text--secondary mt-1"
      >
        {{ $t("booking.edit.saveFirst") }}
      </div>
    </v-sheet>

    <v-expand-transition>
      <v-sheet
        v-if="isRejectedOrCancelled(booking)"
        class="mb-4 px-4 py-3 status-reason"
        rounded
      >
        <v-textarea
          v-model="booking.rejectionReason"
          :label="rejectionReasonLabel"
          filled
          dense
          background-color="accent"
          rows="2"
          hide-details="auto"
          :rules="rejectionReasonRules"
        />
        <CancellationRefundAudit
          v-if="cancellationRefundAudit"
          :audit="cancellationRefundAudit"
          class="mt-3"
        />
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
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import CancellationRefundAudit from "@/components/Booking/CancellationRefundAudit.vue";
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
  actionColor,
  actionIcon,
  actionLabel,
  freeMarker,
  isFree,
  isRejectedOrCancelled,
  statusColor,
  statusIcon,
  statusLabel,
  transitionActions,
} from "@/utils/bookingStatus";

/**
 * The status section of the edit form (spec E2): the state as one chip and
 * one button per transition the state allows, each run by the mounted
 * `BookingTransitions`. The buttons are locked while the form has unsaved
 * changes - there is no "save, then transition", and no transition on the
 * server's copy while the local one differs. The form hears `transitioned`
 * and `failed` and reloads the booking.
 *
 * In create mode (spec E10) there is no state yet: the section asks for the
 * "Anfangszustand" - Angefragt, Freigegeben, or Bezahlt with the payment
 * named - and reports the choice as `update:initial-state`; the form turns
 * it into the create PUT's `status`.
 */
export default {
  name: "BookingEditStatus",
  components: { BookingTransitions, CancellationRefundAudit },
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
    actions() {
      return transitionActions(this.booking.status);
    },
    paidAt() {
      if (
        this.booking.status !== BOOKING_STATUS.CONFIRMED ||
        !this.booking.timePaid
      ) {
        return null;
      }
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(this.booking.timePaid));
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
    /**
     * A series member is acted on with its series where the members are at
     * hand (`groupBooking.bookings`, populated by the page); without them
     * the module could not tell the series' shared state, so the member is
     * acted on alone.
     */
    transitionTarget() {
      const members = this.groupBooking?.bookings;
      if (Array.isArray(members) && members.length > 0) {
        return {
          booking: this.booking,
          groupBooking: this.groupBooking,
          bookings: members,
        };
      }
      return { booking: this.booking };
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
    actionColor,
    actionIcon,
    actionLabel,
    freeMarker,
    isFree,
    isRejectedOrCancelled,
    statusColor,
    statusIcon,
    statusLabel,
    transition(action) {
      if (this.dirty) return;
      this.$refs.transitions.start(action, this.transitionTarget);
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

<style scoped>
.status-indicator {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-indicator {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.status-reason {
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-reason {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
