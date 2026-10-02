<template>
  <div>
    <BookingStatusPath
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
  </div>
</template>

<script>
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import {
  INITIAL_STATE,
  initialStateChoices,
  initialStateWire,
  timePaidOf,
  timePaidParts,
} from "@/utils/bookingForm";
import { BOOKING_STATUS, pathOf } from "@/utils/bookingStatus";

/**
 * The "Anfangszustand" of the create form (spec E10, N6): there is no state
 * yet, so the headline is the choice of the state the booking is born in -
 * the draft's path with its segments as radios, named with the state words.
 * The choice stays the act: Angefragt is `requested`, Zahlung offen is
 * `confirmed`, Bestätigt is `paid` on a priced draft (with the payment named
 * under the line) and `confirmed` on a free one. The component reports it as
 * `update:initial-state`; the form turns it into the create PUT's `status`.
 */
export default {
  name: "BookingInitialState",
  components: { BookingStatusPath },
  props: {
    /** The price the booking will be created with, deciding whether Bezahlt is offered. */
    priceEur: {
      type: Number,
      default: 0,
    },
    /** The form's `{ type, title }` payment methods. */
    paymentMethods: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      // The choice; its `timePaid` is derived from the pickers below.
      initialState: { selection: INITIAL_STATE.REQUESTED, paymentMethod: null },
      paymentDate: null,
      paymentTime: null,
      dateMenu: false,
      timeMenu: false,
    };
  },
  computed: {
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
    this.emitInitialState();
  },
  methods: {
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
