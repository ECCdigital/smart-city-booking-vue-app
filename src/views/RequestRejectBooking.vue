<template>
  <v-container
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    "
  >
    <div v-if="!bookingNumber">
      <v-alert type="error" dense> Keine Buchungsnummer gefunden. </v-alert>
    </div>

    <v-card
      v-else-if="loadingStatus"
      class="pa-6 rounded-sm d-flex flex-column align-center"
      style="min-width: 350px; max-width: 500px"
    >
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 mb-0">Buchungsstatus wird geladen...</p>
    </v-card>

    <v-card
      v-else-if="statusError"
      class="pa-4 rounded-sm"
      style="min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center">
        <v-icon size="45px" color="error">mdi-alert-circle</v-icon>
        <p class="text-h6 font-weight-bold mt-2">
          Buchungsstatus konnte nicht ermittelt werden
        </p>
        <p>
          Bitte versuchen Sie es später erneut oder kontaktieren Sie uns, wenn
          das Problem weiterhin besteht.
        </p>
        <v-btn color="primary" outlined @click="getBookingStatus">
          Erneut versuchen
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card
      v-else-if="!isCancellable"
      class="pa-4 rounded-sm"
      style="min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center">
        <v-icon size="45px" color="warning">mdi-cancel</v-icon>
        <p class="text-h6 font-weight-bold mt-2">Stornierung nicht möglich</p>
        <p>
          Die Buchung <strong>#{{ bookingNumber }}</strong> kann nicht über
          dieses Formular storniert werden. Bitte wenden Sie sich an den
          Anbieter, falls Sie eine Stornierung wünschen.
        </p>
      </v-card-text>
    </v-card>

    <v-card
      v-else-if="!rejectSuccess"
      class="pa-4 rounded-sm"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 500px"
    >
      <v-form ref="form" v-model="valid" @submit.prevent="sendRejectRequest">
        <v-card-text class="text-center custom-card">
          <v-alert
            v-if="showVerificationError"
            type="warning"
            class="mb-6"
            dense
          >
            Die eingegebene Name entspricht nicht der Buchung.
          </v-alert>
          <v-alert v-if="submitError" type="error" class="mb-6" dense>
            {{ submitError }}
          </v-alert>

          <v-img :src="appLogo" max-width="150" class="mb-4 mx-auto" />

          <p>
            <strong
              >Möchten Sie die Buchung #{{ bookingNumber }} wirklich
              stornieren?</strong
            >
          </p>

          <v-text-field
            outlined
            v-model="verificationName"
            label="Ihr Name (wie in der Buchung)"
            hint="Bitte geben Sie Ihren Namen ein, so wie er auch in der Buchung hinterlegt wurde."
            :rules="[(v) => !!v || 'Bitte geben Sie Ihren Namen ein.']"
            persistent-hint
            @blur="loadRefundPreview"
            @input="onVerificationNameInput"
          ></v-text-field>

          <v-textarea
            outlined
            v-model="rejectReason"
            rows="3"
            label="Hinweis zur Stornierung"
            :rules="[
              (v) =>
                !!v || 'Bitte geben Sie einen Grund für die Stornierung an.',
            ]"
            class="mt-3"
          ></v-textarea>

          <div v-if="showRefundPanel" class="text-left mt-2">
            <v-skeleton-loader
              v-if="loadingRefundPreview"
              type="list-item-three-line"
              class="mb-2"
            />
            <CancellationRefundPanel
              v-else-if="refundPreview"
              show-divider
              :title="$t('booking.cancellationRefund.expectedTitle')"
              :original-amount-eur="refundPreview.originalAmountEur"
              :refund-amount-eur="refundPreview.refundAmountEur"
              :cancellation-fee-eur="refundPreview.cancellationFeeEur"
              :policy-summary="refundPolicySummary"
              :footer="$t('booking.cancellationRefund.finalAmountHint')"
            />
            <v-alert
              v-else-if="refundPreviewError"
              type="warning"
              text
              dense
              class="mt-3 mb-0"
            >
              {{ $t("booking.cancellationRefund.previewError") }}
            </v-alert>
          </div>

          <div v-if="requiresBankDetails" class="text-left mt-4">
            <v-divider class="mb-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-1">
              Bankverbindung für die Rückzahlung (optional)
            </p>
            <p class="text-caption mb-3">
              Diese Buchung wurde bereits bezahlt
              <span v-if="formattedExpectedRefund">
                (erwartete Erstattung: {{ formattedExpectedRefund }})</span
              ><span
                v-else-if="bookingStatus && bookingStatus.priceEur != null"
              >
                (Betrag: {{ formattedPrice }})</span
              >. Sie können optional Ihre Bankverbindung angeben, um die
              Rückerstattung zu vereinfachen.
            </p>

            <v-text-field
              outlined
              dense
              v-model="bankDetails.accountHolder"
              label="Kontoinhaber (optional)"
              :rules="bankRules.accountHolder"
              :disabled="fetching"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.iban"
              label="IBAN (optional)"
              hint="z. B. DE89 3704 0044 0532 0130 00"
              :rules="bankRules.iban"
              :disabled="fetching"
              @input="onIbanInput"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.bic"
              label="BIC (optional)"
              :rules="bankRules.bic"
              :disabled="fetching"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              v-model="bankDetails.bankName"
              label="Name der Bank (optional)"
              :disabled="fetching"
            ></v-text-field>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            :loading="fetching"
            block
            color="primary"
            type="submit"
            :disabled="!valid || fetching"
          >
            Buchung jetzt stornieren</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>

    <v-card
      v-else
      class="pa-4 rounded-sm"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center">
        <v-icon size="45px" color="primary">mdi-email</v-icon>
        <p class="text-h6 font-weight-bold">Stornierung bestätigen</p>
        <p>
          Wir haben Ihnen eine E-Mail zur Bestätigung Ihrer Stornierung
          gesendet. Bitte überprüfen Sie Ihr Postfach und bestätigen Sie die
          Stornierung, um den Vorgang abzuschließen.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import CancellationRefundPanel from "@/components/Booking/CancellationRefundPanel.vue";
import FormatService from "@/services/FormatService";

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
  name: "RequestRejectBooking",
  components: { CancellationRefundPanel },
  props: {
    tenantId: {
      type: String,
    },
  },
  data() {
    return {
      bookingNumber: this.$route.query.id,
      verificationName: null,
      rejectReason: null,
      showVerificationError: false,
      submitError: null,
      rejectSuccess: false,
      fetching: false,
      valid: false,
      loadingStatus: true,
      statusError: false,
      bookingStatus: null,
      refundPreview: null,
      loadingRefundPreview: false,
      refundPreviewError: false,
      bankDetails: {
        accountHolder: "",
        iban: "",
        bic: "",
        bankName: "",
      },
    };
  },
  computed: {
    appLogo() {
      return process.env.BASE_URL + "/app-logo.png";
    },
    isCancellable() {
      return !!(
        this.bookingStatus &&
        this.bookingStatus.cancellationPolicy &&
        this.bookingStatus.cancellationPolicy.userCancellable === true &&
        this.bookingStatus.isRejected !== true
      );
    },
    showRefundPanel() {
      return (
        this.loadingRefundPreview ||
        this.refundPreviewError ||
        (this.refundPreview &&
          Number(this.refundPreview.originalAmountEur) > 0)
      );
    },
    refundPolicySummary() {
      if (!this.refundPreview) return "";
      const days =
        this.refundPreview.daysBeforeStart === null ||
        this.refundPreview.daysBeforeStart === undefined
          ? "–"
          : this.refundPreview.daysBeforeStart;
      return this.$t("booking.cancellationRefund.userPolicySummary", {
        days,
        percentage: this.refundPreview.suggestedRefundPercentage,
      });
    },
    requiresBankDetails() {
      return !!(
        this.bookingStatus &&
        this.bookingStatus.isPayed === true &&
        typeof this.bookingStatus.priceEur === "number" &&
        this.bookingStatus.priceEur > 0
      );
    },
    formattedPrice() {
      const price = this.bookingStatus && this.bookingStatus.priceEur;
      if (typeof price !== "number") return "";
      return FormatService.currency(price);
    },
    formattedExpectedRefund() {
      if (
        !this.refundPreview ||
        typeof this.refundPreview.refundAmountEur !== "number"
      ) {
        return "";
      }
      return FormatService.currency(this.refundPreview.refundAmountEur);
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
  methods: {
    onVerificationNameInput() {
      this.refundPreview = null;
      this.refundPreviewError = false;
      this.showVerificationError = false;
    },
    onIbanInput(value) {
      const normalized = normalizeIban(value);
      const formatted = normalized.replace(/(.{4})/g, "$1 ").trim();
      if (formatted !== value) {
        this.bankDetails.iban = formatted;
      }
    },
    buildBankDetailsPayload() {
      if (!this.requiresBankDetails) return undefined;
      const accountHolder = (this.bankDetails.accountHolder || "").trim();
      const iban = normalizeIban(this.bankDetails.iban);
      const bic = normalizeBic(this.bankDetails.bic);
      const bankName = (this.bankDetails.bankName || "").trim();

      if (!accountHolder && !iban && !bic && !bankName) return undefined;

      const payload = {};
      if (accountHolder) payload.accountHolder = accountHolder;
      if (iban) payload.iban = iban;
      if (bic) payload.bic = bic;
      if (bankName) payload.bankName = bankName;
      return payload;
    },
    async loadRefundPreview() {
      const name = (this.verificationName || "").trim();
      if (!name || !this.bookingNumber || !this.tenantId) {
        return;
      }

      this.loadingRefundPreview = true;
      this.refundPreviewError = false;
      this.showVerificationError = false;

      try {
        const ownership = await ApiBookingService.verifyBookingOwnership(
          this.tenantId,
          this.bookingNumber,
          name
        );
        if (ownership.status !== 200) {
          this.refundPreview = null;
          this.showVerificationError = true;
          return;
        }

        this.refundPreview =
          await ApiBookingService.getPublicCancellationRefundPreview(
            this.bookingNumber,
            this.tenantId,
            name
          );
      } catch (error) {
        const status = error && error.response && error.response.status;
        this.refundPreview = null;
        if (status === 401 || status === 403 || status === 404) {
          this.showVerificationError = true;
        } else {
          this.refundPreviewError = true;
        }
      } finally {
        this.loadingRefundPreview = false;
      }
    },
    async sendRejectRequest() {
      this.submitError = null;
      if (this.$refs.form && !this.$refs.form.validate()) {
        return;
      }
      try {
        this.fetching = true;
        const bookingResponse = await ApiBookingService.verifyBookingOwnership(
          this.tenantId,
          this.bookingNumber,
          this.verificationName
        );

        if (bookingResponse.status !== 200) {
          this.showVerificationError = true;
          return;
        }
        this.showVerificationError = false;

        if (!this.refundPreview) {
          try {
            this.refundPreview =
              await ApiBookingService.getPublicCancellationRefundPreview(
                this.bookingNumber,
                this.tenantId,
                this.verificationName
              );
          } catch (previewError) {
            // Preview is informational; do not block cancellation request.
            console.error(previewError);
          }
        }

        const bankDetailsPayload = this.buildBankDetailsPayload();
        const rejectResponse = await ApiBookingService.requestRejectBooking(
          this.bookingNumber,
          this.tenantId,
          this.rejectReason,
          bankDetailsPayload
        );

        if (rejectResponse.status === 201) {
          this.rejectSuccess = true;
        } else {
          this.submitError =
            "Die Stornierungsanfrage konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.";
        }
      } catch (error) {
        const status = error && error.response && error.response.status;
        if (status === 401 || status === 403 || status === 404) {
          this.showVerificationError = true;
        } else {
          this.submitError =
            "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
        }
      } finally {
        this.fetching = false;
      }
    },
    async getBookingStatus() {
      this.loadingStatus = true;
      this.statusError = false;
      try {
        const bookingStatusResponse = await ApiBookingService.getBookingStatus(
          this.bookingNumber,
          this.tenantId
        );
        const data = bookingStatusResponse && bookingStatusResponse.data;
        const status = Array.isArray(data)
          ? data.find(
            (entry) => entry && entry.bookingId === this.bookingNumber
          ) || data[0]
          : data;
        if (!status) {
          this.statusError = true;
          return;
        }
        this.bookingStatus = status;
      } catch (error) {
        console.error("Error fetching booking status:", error);
        this.statusError = true;
      } finally {
        this.loadingStatus = false;
      }
    },
  },
  async mounted() {
    if (!this.bookingNumber) return;
    await this.getBookingStatus();
  },
};
</script>

<style scoped></style>
