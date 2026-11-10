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
            {{ $t("booking.page.proofs.dialog.deletes") }}
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
import { MAX_PROOF_REASON_LENGTH } from "@/utils/customerUploads";

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
 * upload }`, `upload` only for a check.
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
    close() {
      if (!this.loading) this.$emit("close");
    },
    submit() {
      if (this.needsReason && !this.valid) return;
      this.$emit("submit", this.needsReason ? this.reason.trim() : "");
    },
  },
};
</script>

<style scoped>
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
