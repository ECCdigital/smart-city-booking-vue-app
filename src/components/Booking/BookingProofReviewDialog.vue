<template>
  <v-dialog :value="open" persistent max-width="560px" @input="onInput">
    <v-card v-if="target">
      <v-card-title class="d-flex flex-nowrap align-center py-4 px-6">
        <v-icon left :color="color">{{ icon }}</v-icon>
        <span class="text-h6 booking-proof-review__title">
          {{ $t(`${prefix}.title`) }}
        </span>
        <v-spacer />
        <v-btn icon :disabled="loading" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <v-form
          :id="formId"
          ref="form"
          v-model="valid"
          @submit.prevent="submit"
        >
          <p class="mb-2">
            {{
              $t(`${prefix}.text`, {
                field: target.field.label,
                file: target.upload ? target.upload.originalFileName : "",
              })
            }}
          </p>
          <div
            v-if="deletesFile && alsoFor.length > 0"
            class="booking-proof-review__also-for mb-2"
          >
            <p class="mb-1">
              {{ $t("booking.page.proofs.dialog.also-for") }}
            </p>
            <v-checkbox
              :input-value="true"
              disabled
              dense
              hide-details
              class="mt-0 booking-proof-review__own"
              :label="memberLabel(ownBooking, true)"
            />
            <v-checkbox
              v-for="other in alsoFor"
              :key="other.bookingId"
              v-model="selected"
              :value="other.bookingId"
              :disabled="loading"
              dense
              hide-details
              class="mt-0 booking-proof-review__member"
            >
              <template #label>
                <span>{{ memberLabel(other) }}</span>
                <router-link
                  :to="{
                    name: 'booking-details',
                    params: { bookingId: other.bookingId },
                  }"
                  target="_blank"
                  class="ml-1"
                  :title="$t('booking.page.proofs.dialog.also-for-open')"
                  @click.native.stop
                >
                  <v-icon x-small>mdi-open-in-new</v-icon>
                </router-link>
              </template>
            </v-checkbox>
            <p class="mt-3 mb-0">
              {{ $t(`booking.page.proofs.dialog.also-for-note.${action}`) }}
            </p>
          </div>
          <p v-if="$te(`${prefix}.consequence`)" class="mb-2">
            {{ $t(`${prefix}.consequence`) }}
          </p>
          <v-alert
            v-if="deletesFile"
            type="warning"
            dense
            outlined
            class="booking-proof-review__deletes"
          >
            {{
              alsoFor.length > 0
                ? $tc(
                    "booking.page.proofs.dialog.deletes-series",
                    markedCount,
                    { count: markedCount }
                  )
                : $t("booking.page.proofs.dialog.deletes")
            }}
          </v-alert>
          <v-textarea
            v-if="needsReason"
            v-model="reason"
            outlined
            rows="3"
            auto-grow
            :counter="maxLength"
            :label="$t('booking.page.proofs.dialog.reason')"
            :rules="reasonRules"
            class="booking-proof-review__reason"
          />
          <v-alert v-if="error" type="error" dense border="left" class="mt-4">
            {{ error }}
          </v-alert>
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions
        class="booking-proof-review__actions flex-wrap justify-end px-6 py-4"
      >
        <v-btn outlined :disabled="loading" @click="close">
          {{ $t("booking.page.proofs.dialog.cancel") }}
        </v-btn>
        <v-btn
          :color="color"
          :loading="loading"
          :disabled="needsReason && !valid"
          type="submit"
          :form="formId"
          class="booking-proof-review__submit"
        >
          {{ $t(`${prefix}.submit`) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import FormatService from "@/services/FormatService";
import { alsoForOf, MAX_PROOF_REASON_LENGTH } from "@/utils/customerUploads";

/** "17.11.26, 10:00 – 12:00", the end with its date on another day. */
function timeRangeOf(begin, end) {
  if (!begin) return "";
  const from = FormatService.dateTime(begin);
  if (!end) return from;
  const sameDay =
    new Date(begin).toDateString() === new Date(end).toDateString();
  const to = sameDay
    ? new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(
        new Date(end)
      )
    : FormatService.dateTime(end);
  return `${from} – ${to}`;
}

const ICONS = {
  accepted: "mdi-check-circle-outline",
  rejected: "mdi-close-circle-outline",
  requestAgain: "mdi-refresh",
};

const COLORS = {
  accepted: "success",
  rejected: "error",
  requestAgain: "primary",
};

/**
 * The dialog before a check of a customer upload or „Erneut anfordern“.
 * Accepting and rejecting say „Die Datei wird
 * danach gelöscht.“; a rejection and a new request need a reason, which
 * the customer reads in their mail. Emits `submit` with the reason; the
 * page sends it and closes the dialog.
 *
 * `target`: `{ action: "accepted" | "rejected" | "requestAgain", field,
 * upload }`, `upload` only for a check. An upload of a series that counts
 * for other bookings lists them with their time, each to tick: the check
 * counts for the booking of the dialog and the ones ticked, all at first.
 * `submit` then carries their ids as well.
 */
export default {
  name: "BookingProofReviewDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    target: {
      type: Object,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      reason: "",
      valid: false,
      // The other bookings of a series the check counts for.
      selected: [],
      formId: `booking-proof-review-${this._uid}`,
      maxLength: MAX_PROOF_REASON_LENGTH,
    };
  },
  computed: {
    action() {
      return this.target?.action;
    },
    prefix() {
      return `booking.page.proofs.dialog.${this.action}`;
    },
    needsReason() {
      return this.action === "rejected" || this.action === "requestAgain";
    },
    deletesFile() {
      return this.action === "accepted" || this.action === "rejected";
    },
    /** The other bookings of the series the upload counts for. */
    alsoFor() {
      return alsoForOf(this.target?.upload);
    },
    /** The booking of the dialog, always part of the check. */
    ownBooking() {
      return {
        bookingId: this.target?.bookingId,
        fieldLabel: this.target?.field?.label,
        timeBegin: this.target?.timeBegin,
        timeEnd: this.target?.timeEnd,
      };
    },
    /** The bookings the check counts for: this one and the ones ticked. */
    markedCount() {
      return 1 + this.selected.length;
    },
    icon() {
      return ICONS[this.action];
    },
    color() {
      return COLORS[this.action];
    },
    reasonRules() {
      return [
        (v) =>
          !!(v && v.trim()) ||
          this.$t("booking.page.proofs.dialog.reason-required"),
        (v) =>
          !v ||
          v.length <= this.maxLength ||
          this.$t("booking.page.proofs.dialog.reason-too-long", {
            max: this.maxLength,
          }),
      ];
    },
  },
  watch: {
    target: {
      immediate: true,
      handler() {
        this.selected = alsoForOf(this.target?.upload).map(
          (other) => other.bookingId
        );
      },
    },
    open(value) {
      if (!value) {
        this.reason = "";
        this.$nextTick(() => this.$refs.form?.resetValidation());
      }
    },
  },
  methods: {
    onInput(value) {
      if (!value) this.close();
    },
    /** A booking of the series: number, time and field. */
    /**
     * A booking of the series: number and time. Its field only where it is
     * not the one the dialog names - the file may count for another field
     * of another booking.
     */
    memberLabel(member, own = false) {
      const time = timeRangeOf(member.timeBegin, member.timeEnd);
      const otherField =
        !own &&
        member.fieldLabel &&
        member.fieldLabel !== this.target?.field?.label;
      const key = own
        ? "also-for-own"
        : otherField
        ? "also-for-booking-field"
        : "also-for-booking";
      return this.$t(`booking.page.proofs.dialog.${key}`, {
        id: member.bookingId,
        time,
        field: member.fieldLabel || "",
      });
    },
    close() {
      if (!this.loading) this.$emit("close");
    },
    submit() {
      if (this.needsReason && !this.valid) return;
      this.$emit(
        "submit",
        this.needsReason ? this.reason.trim() : "",
        this.alsoFor.length > 0 ? [...this.selected] : null
      );
    },
  },
};
</script>

<style scoped>
/* The bookings of a series and the warning in the size of the dialog's
   text (`.v-card__text`), not Vuetify's 16px of inputs and alerts. */
.booking-proof-review__also-for ::v-deep .v-label,
.booking-proof-review__deletes ::v-deep .v-alert__content {
  font-size: 0.875rem;
  line-height: 1.375rem;
}

/* Vuetify 2 breaks a card title anywhere; the title breaks between words. */
.booking-proof-review__title {
  word-break: normal;
  overflow-wrap: break-word;
}

/* On a narrow screen the buttons go below each other instead of out of the card. */
.booking-proof-review__actions {
  gap: var(--scb-space-2);
}

.booking-proof-review__actions > .v-btn {
  margin-left: 0 !important;
}
</style>
