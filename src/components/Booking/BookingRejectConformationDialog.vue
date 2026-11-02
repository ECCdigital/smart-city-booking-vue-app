<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">{{ $t(`${dialogKey}.title`) }}</span>
        <v-spacer />
        <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <v-form
          id="booking-reject-form"
          ref="form"
          v-model="valid"
          @submit.prevent="onReject"
        >
          <i18n :path="`${dialogKey}.question`" tag="p">
            <template #id>
              <strong>{{ toReject.id }}</strong>
            </template>
          </i18n>
          <v-alert v-if="error" type="error" border="left">
            {{ error }}
          </v-alert>
          <v-textarea
            outlined
            v-model="rejectReason"
            :label="$t(`${dialogKey}.reasonLabel`)"
            :placeholder="$t(`${dialogKey}.reasonPlaceholder`)"
            :rules="[(v) => !!v || 'Begründung ist erforderlich']"
            rows="2"
          ></v-textarea>
          <!-- A rejected request costs nothing: it never gets a document. -->
          <v-checkbox
            v-if="!isRequest"
            v-model="skipCancellation"
            label="Kein Stornobeleg erstellen"
          ></v-checkbox>

          <CancellationRefundPreview
            v-if="!isRequest && !skipCancellation"
            :preview="refundPreview"
            :loading="previewLoading"
            :error="previewError"
            @update:refund-percentage="refundPercentage = $event"
            @update:valid="refundValid = $event"
          />

          <div v-if="canProvideBankDetails">
            <v-divider class="mb-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-1">
              Bankverbindung des Kunden (optional)
            </p>
            <p class="text-caption mb-3">
              Diese Buchung wurde bereits bezahlt
              <span v-if="formattedPrice"> (Betrag: {{ formattedPrice }})</span
              >. Sie können optional die Bankverbindung des Kunden angeben.
            </p>

            <v-text-field
              outlined
              dense
              v-model="bankDetails.accountHolder"
              label="Kontoinhaber (optional)"
              :rules="bankRules.accountHolder"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.iban"
              label="IBAN (optional)"
              hint="z. B. DE89 3704 0044 0532 0130 00"
              :rules="bankRules.iban"
              @input="onIbanInput"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.bic"
              label="BIC (optional)"
              :rules="bankRules.bic"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.bankName"
              label="Name der Bank (optional)"
            ></v-text-field>
          </div>
          <!-- Last before the actions: what the cancellation leaves the customer. -->
          <v-alert
            :type="paymentOutcome.type"
            text
            dense
            class="booking-reject-payment text-body-2 mt-4 mb-0"
          >
            <div class="font-weight-bold">{{ paymentOutcome.status }}</div>
            <div v-if="paymentOutcome.text">{{ paymentOutcome.text }}</div>
          </v-alert>
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn
          color="error"
          :loading="loading || previewLoading"
          :disabled="!canSubmit"
          type="submit"
          form="booking-reject-form"
        >
          <v-icon left small>mdi-cancel</v-icon>
          {{ submitLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import CancellationRefundPreview from "@/components/Booking/CancellationRefundPreview.vue";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import {
  expectedRefundEur,
  rejectPaymentOutcome,
} from "@/utils/cancellationRefund";
import {
  BOOKING_ACTION,
  BOOKING_STATUS,
  actionLabel,
  isFree,
  isPaid,
} from "@/utils/bookingStatus";

const IBAN_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;
const BIC_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

function normalizeIban(value) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

function normalizeBic(value) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value) {
  const iban = normalizeIban(value);
  if (!IBAN_REGEX.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return (code - 55).toString();
      return ch;
    })
    .join("");
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = remainder.toString() + numeric.substr(i, 7);
    remainder = parseInt(block, 10) % 97;
  }
  return remainder === 1;
}

export default {
  name: "BookingRejectConformationDialog",
  components: { CancellationRefundPreview },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toReject: {
      type: Object,
      required: true,
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
      rejectReason: null,
      valid: false,
      skipCancellation: false,
      refundPreview: null,
      previewLoading: false,
      previewError: null,
      refundPercentage: undefined,
      refundValid: true,
      bankDetails: {
        bankName: "",
        accountHolder: "",
        iban: "",
        bic: "",
      },
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    /** A request is turned down, anything else cancelled: the dialog's words follow. */
    isRequest() {
      return this.toReject?.status === BOOKING_STATUS.REQUESTED;
    },
    dialogKey() {
      return `booking.reject.dialog.${this.isRequest ? "request" : "booking"}`;
    },
    submitLabel() {
      return actionLabel(BOOKING_ACTION.CANCEL, this.toReject?.status);
    },
    paymentOutcome() {
      return rejectPaymentOutcome({
        request: this.isRequest,
        free: isFree(this.toReject),
        paid: isPaid(this.toReject),
        priceEur: this.toReject?.priceEur,
        refundAmountEur: expectedRefundEur(
          this.refundPreview,
          this.refundPercentage
        ),
      });
    },
    canProvideBankDetails() {
      return !!(
        this.toReject &&
        this.toReject.status === BOOKING_STATUS.CONFIRMED &&
        typeof this.toReject.priceEur === "number" &&
        this.toReject.priceEur > 0 &&
        this.skipCancellation === false
      );
    },
    canSubmit() {
      return (
        this.valid &&
        !this.previewLoading &&
        (this.isRequest ||
          this.skipCancellation ||
          (!!this.refundPreview && !this.previewError && this.refundValid))
      );
    },
    formattedPrice() {
      const price = this.toReject && this.toReject.priceEur;
      if (typeof price !== "number") return "";
      try {
        return new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(price);
      } catch (e) {
        return `${price.toFixed(2)} €`;
      }
    },
    bankRules() {
      return {
        accountHolder: [],
        iban: [
          (v) =>
            !v || isValidIban(v) || "Bitte geben Sie eine gültige IBAN an.",
        ],
        bic: [
          (v) =>
            !v ||
            BIC_REGEX.test(normalizeBic(v)) ||
            "Bitte geben Sie eine gültige BIC an.",
        ],
      };
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.loadRefundPreview();
      } else {
        this.resetDialog();
      }
    },
    skipCancellation(value) {
      if (!value && this.open && !this.refundPreview) {
        this.loadRefundPreview();
      }
      if (value) {
        this.refundPercentage = undefined;
      }
    },
    "toReject.id"(value, oldValue) {
      if (this.open && value && value !== oldValue) {
        this.loadRefundPreview();
      }
    },
  },
  methods: {
    closeDialog() {
      this.resetDialog();
      this.$emit("close");
    },
    resetDialog() {
      this.rejectReason = null;
      this.skipCancellation = false;
      this.refundPreview = null;
      this.previewError = null;
      this.previewLoading = false;
      this.refundPercentage = undefined;
      this.refundValid = true;
      this.resetBankDetails();
      this.$nextTick(() => this.$refs.form?.resetValidation());
    },
    resetBankDetails() {
      this.bankDetails = {
        bankName: "",
        accountHolder: "",
        iban: "",
        bic: "",
      };
    },
    onIbanInput(value) {
      const normalized = normalizeIban(value);
      const formatted = normalized.replace(/(.{4})/g, "$1 ").trim();
      if (formatted !== value) {
        this.bankDetails.iban = formatted;
      }
    },
    buildBankDetailsPayload() {
      if (!this.canProvideBankDetails) return undefined;
      const accountHolder = (this.bankDetails.accountHolder || "").trim();
      const iban = normalizeIban(this.bankDetails.iban);
      const bic = normalizeBic(this.bankDetails.bic);
      const bank = (this.bankDetails.bankName || "").trim();

      if (!accountHolder && !iban && !bic && !bank) return undefined;

      const payload = {};
      if (bank) payload.bankName = bank;
      if (accountHolder) payload.accountHolder = accountHolder;
      if (iban) payload.iban = iban;
      if (bic) payload.bic = bic;
      return payload;
    },
    async loadRefundPreview() {
      if (!this.toReject?.id || this.isRequest || this.skipCancellation) {
        return;
      }
      this.previewLoading = true;
      this.previewError = null;
      this.refundPreview = null;
      try {
        this.refundPreview =
          await ApiBookingService.getCancellationRefundPreview(
            this.toReject.id
          );
      } catch (error) {
        this.previewError = getApiErrorMessage(
          error,
          this.$t("booking.cancellationRefund.previewError")
        );
      } finally {
        this.previewLoading = false;
      }
    },
    async onReject() {
      if (this.canSubmit) {
        this.$emit(
          "reject-booking",
          this.toReject.id,
          this.rejectReason,
          this.skipCancellation,
          this.buildBankDetailsPayload(),
          this.skipCancellation ? undefined : this.refundPercentage
        );
      }
    },
  },
};
</script>

<style scoped></style>
