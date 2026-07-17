<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-form ref="form" v-model="valid" @submit.prevent="onReject">
        <v-card-title>
          <v-icon class="mr-2" color="error">mdi-alert</v-icon>
          <span class="text-h5">Buchung stornieren</span>
        </v-card-title>
        <v-card-text>
          <span class="text-h6">
            Die Buchung
            <strong>{{ toReject.id }}</strong> ist Teil einer Serienbuchung.
          </span>
          <v-radio-group v-model="cancellationScope" class="mt-4">
            <v-radio
              value="group"
              :label="$t('booking.cancellationRefund.cancelGroup')"
            />
            <v-radio
              value="single"
              :label="$t('booking.cancellationRefund.cancelSingle')"
            />
          </v-radio-group>
        </v-card-text>
        <v-card-text v-if="error" class="text-center">
          <v-alert type="error" border="left" elevation="2">
            {{ error }}
          </v-alert>
        </v-card-text>
        <v-card-text>
          <v-textarea
            outlined
            v-model="rejectReason"
            label="Begründung der Stornierung"
            placeholder="Aus welchem Grund wird die Stornierung durchgeführt?"
            :rules="[
              (value) => !!value?.trim() || 'Begründung ist erforderlich',
            ]"
            rows="2"
          ></v-textarea>
          <v-checkbox
            v-model="skipCancellation"
            label="Kein Stornobeleg erstellen"
          ></v-checkbox>
          <CancellationRefundPreview
            v-if="!skipCancellation"
            :preview="refundPreview"
            :loading="previewLoading"
            :error="previewError"
            @update:refund-percentage="refundPercentage = $event"
            @update:valid="refundValid = $event"
          />

          <div v-if="canProvideBankDetails">
            <v-divider class="mb-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-1">
              {{ $t("booking.cancellationRefund.bankDetailsTitle") }}
            </p>
            <p class="text-caption mb-3">
              {{
                cancellationScope === "group"
                  ? $t("booking.cancellationRefund.bankDetailsHintGroup", {
                      amount: formattedPrice
                        ? ` (Betrag: ${formattedPrice})`
                        : "",
                    })
                  : $t("booking.cancellationRefund.bankDetailsHintSingle", {
                      amount: formattedPrice
                        ? ` (Betrag: ${formattedPrice})`
                        : "",
                    })
              }}
            </p>

            <v-text-field
              outlined
              dense
              v-model="bankDetails.accountHolder"
              :label="$t('booking.cancellationRefund.accountHolder')"
              :rules="bankRules.accountHolder"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.iban"
              :label="$t('booking.cancellationRefund.iban')"
              :hint="$t('booking.cancellationRefund.ibanHint')"
              :rules="bankRules.iban"
              @input="onIbanInput"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.bic"
              :label="$t('booking.cancellationRefund.bic')"
              :rules="bankRules.bic"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.bankName"
              :label="$t('booking.cancellationRefund.bankName')"
            ></v-text-field>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            :loading="inProgress || previewLoading"
            :disabled="!canSubmit"
            type="submit"
          >
            {{
              cancellationScope === "group"
                ? $t("booking.cancellationRefund.cancelGroup")
                : $t("booking.cancellationRefund.cancelSingle")
            }}
          </v-btn>
          <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import CancellationRefundPreview from "@/components/Booking/CancellationRefundPreview.vue";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

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
  name: "GroupBookingRejectConformationDialog",
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
    groupBookingId: {
      type: String,
      default: null,
    },
    inProgress: {
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
      skipCancellation: false,
      cancellationScope: "group",
      valid: false,
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
    canProvideBankDetails() {
      return !!(
        this.toReject &&
        this.toReject.isPayed === true &&
        typeof this.toReject.priceEur === "number" &&
        this.toReject.priceEur > 0 &&
        this.skipCancellation === false
      );
    },
    canSubmit() {
      return (
        this.valid &&
        !this.previewLoading &&
        (this.skipCancellation ||
          (!!this.refundPreview && !this.previewError && this.refundValid))
      );
    },
    formattedPrice() {
      const amount =
        this.cancellationScope === "group" &&
        typeof this.refundPreview?.originalAmountEur === "number"
          ? this.refundPreview.originalAmountEur
          : this.toReject?.priceEur;
      if (typeof amount !== "number") return "";
      try {
        return new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(amount);
      } catch (e) {
        return `${amount.toFixed(2)} €`;
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
    cancellationScope() {
      if (this.open && !this.skipCancellation) {
        this.loadRefundPreview();
      }
    },
    skipCancellation(value) {
      if (!value && this.open) {
        this.loadRefundPreview();
      }
      if (value) {
        this.refundPercentage = undefined;
      }
    },
    groupBookingId(value, oldValue) {
      if (this.open && value && value !== oldValue) {
        this.loadRefundPreview();
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
      this.cancellationScope = "group";
      this.refundPreview = null;
      this.previewLoading = false;
      this.previewError = null;
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
      if (this.skipCancellation || !this.toReject?.id) return;
      if (this.cancellationScope === "group" && !this.groupBookingId) return;
      this.previewLoading = true;
      this.previewError = null;
      this.refundPreview = null;
      try {
        if (this.cancellationScope === "group") {
          this.refundPreview =
            await ApiGroupBookingService.getCancellationRefundPreview(
              null,
              this.groupBookingId
            );
        } else {
          this.refundPreview =
            await ApiBookingService.getCancellationRefundPreview(
              this.toReject.id
            );
        }
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
      if (!this.canSubmit) return;
      const refundPercentage = this.skipCancellation
        ? undefined
        : this.refundPercentage;
      const bankDetails = this.buildBankDetailsPayload();
      if (this.cancellationScope === "group") {
        this.$emit(
          "reject-group-booking",
          this.toReject.id,
          this.rejectReason,
          this.skipCancellation,
          bankDetails,
          refundPercentage
        );
        return;
      }
      this.$emit(
        "reject-single-booking",
        this.toReject.id,
        this.rejectReason,
        this.skipCancellation,
        bankDetails,
        refundPercentage
      );
    },
  },
};
</script>

<style scoped></style>
