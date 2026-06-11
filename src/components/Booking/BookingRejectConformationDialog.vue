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
            Sind Sie sicher, dass Sie die Buchung
            <strong>{{ toReject.id }}</strong> stornieren wollen?
          </span>
        </v-card-text>
        <v-card-text>
          <v-textarea
            outlined
            v-model="rejectReason"
            label="Begründung der Stornierung"
            placeholder="Aus welchem Grund wird die Stornierung durchgeführt?"
            :rules="[(v) => !!v || 'Begründung ist erforderlich']"
            rows="2"
          ></v-textarea>
          <v-checkbox
            v-model="skipCancellation"
            label="Kein Stornobeleg erstellen"
          ></v-checkbox>

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
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-col class="shrink">
            <v-btn
              color="primary"
              :loading="loading"
              :disabled="!valid"
              type="submit"
              >Ja</v-btn
            >
          </v-col>
          <v-col class="shrink">
            <v-btn outlined @click="closeDialog">Nein</v-btn>
          </v-col>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
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
  name: "BookingDeleteConformationDialog",
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
  },
  data() {
    return {
      rejectReason: null,
      valid: false,
      skipCancellation: false,
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
  methods: {
    closeDialog() {
      this.rejectReason = null;
      this.resetBankDetails();
      this.$emit("close");
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
    async onReject() {
      if (this.valid) {
        this.$emit(
          "reject-booking",
          this.toReject.id,
          this.rejectReason,
          this.skipCancellation,
          this.buildBankDetailsPayload()
        );
      }
    },
  },
};
</script>

<style scoped></style>
