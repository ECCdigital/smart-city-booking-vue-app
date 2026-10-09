<template>
  <v-form ref="form" @submit.prevent="submit" data-test="tenant-step">
    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-domain</v-icon>
        <span>{{ title || $t("tenant.onboarding.tenant.title") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="onboarding-step__lead">
          {{ intro || $t("tenant.onboarding.tenant.intro") }}
        </p>
        <slot name="notice" />

        <v-alert
          v-if="errorText"
          type="error"
          text
          dense
          data-test="tenant-error"
        >
          {{ errorText }}
          <div v-if="verificationWay" class="mt-2">
            <v-btn
              v-if="verificationWay === 'mail'"
              small
              outlined
              color="error"
              :loading="verificationMail === 'sending'"
              :disabled="verificationMail === 'sent'"
              data-test="verification-resend"
              @click="$emit('resend-verification')"
            >
              {{ $t("tenant.onboarding.verification.resend") }}
            </v-btn>
            <v-btn
              v-else
              small
              outlined
              color="error"
              data-test="verification-sso"
              @click="$emit('sso-login')"
            >
              {{ $t("tenant.onboarding.verification.sso-login") }}
            </v-btn>
          </div>
        </v-alert>
        <v-alert
          v-if="verificationWay === 'mail' && verificationMail === 'sent'"
          type="success"
          text
          dense
          data-test="verification-sent"
        >
          {{ $t("tenant.onboarding.verification.sent") }}
        </v-alert>
        <v-alert
          v-if="verificationWay === 'mail' && verificationMail === 'failed'"
          type="error"
          text
          dense
          data-test="verification-failed"
        >
          {{ verificationFailedText }}
        </v-alert>

        <v-text-field
          v-model="form.name"
          :label="$t('tenant.onboarding.tenant.name')"
          :rules="rules.required"
          :error-messages="fieldError('name')"
          autofocus
          outlined
          dense
          data-test="tenant-name"
        />
        <div class="booking-caption">
          {{ $t("tenant.onboarding.tenant.contact") }}
        </div>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.contactName"
              :label="$t('tenant.onboarding.tenant.contact-name')"
              :rules="rules.required"
              :error-messages="fieldError('contactName')"
              outlined
              dense
              data-test="tenant-contact-name"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.mail"
              :label="$t('tenant.onboarding.tenant.mail')"
              :rules="rules.mail"
              :error-messages="fieldError('mail')"
              type="email"
              outlined
              dense
              data-test="tenant-mail"
            />
          </v-col>
        </v-row>
        <p class="onboarding-step__fine">
          {{ $t("tenant.onboarding.tenant.prefill-hint") }}
        </p>

        <v-expansion-panels flat class="onboarding-step__optional">
          <v-expansion-panel>
            <v-expansion-panel-header class="px-0">
              {{ $t("tenant.onboarding.tenant.optional") }}
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-text-field
                v-model="form.phone"
                :label="$t('tenant.onboarding.tenant.phone')"
                outlined
                dense
              />
              <v-text-field
                v-model="form.website"
                :label="$t('tenant.onboarding.tenant.website')"
                outlined
                dense
              />
              <v-text-field
                v-model="form.location"
                :label="$t('tenant.onboarding.tenant.location')"
                outlined
                dense
                hide-details
              />
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <!-- In a dialog the card is the dialog: the actions close it, and the
           creation is the end, not a step on the way. -->
      <template v-if="dialog">
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn text data-test="tenant-cancel" @click="$emit('cancel')">
            {{ $t("tenant.onboarding.tenant.cancel") }}
          </v-btn>
          <v-btn
            color="primary"
            depressed
            type="submit"
            :loading="inProgress"
            data-test="tenant-submit"
          >
            {{ $t("tenant.onboarding.tenant.submit") }}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>

    <div v-if="!dialog" class="onboarding-actions">
      <v-btn
        color="primary"
        depressed
        type="submit"
        :loading="inProgress"
        data-test="tenant-submit"
      >
        {{ $t("tenant.onboarding.tenant.submit") }}
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
  </v-form>
</template>

<script>
import {
  creationErrorMessage,
  creationFieldErrorKey,
  isFormallyValidMail,
} from "@/utils/tenantOnboarding";
import { rateLimitMessage } from "@/utils/rateLimit";

/**
 * Step 1: the shortened creation - name, contact person and a formally valid
 * mail are required, the rest is optional (supervision spec §9).
 */
export default {
  name: "OnboardingTenantStep",
  props: {
    prefill: { type: Object, default: () => ({}) },
    inProgress: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /** The renewed verification mail: `null`, `sending`, `sent` or `failed`. */
    verificationMail: { type: String, default: null },
    /** The hit limit (`rateLimitOf`) a refused verification mail named. */
    verificationLimit: { type: Object, default: null },
    /** Another heading and lead than the guided setup's own. */
    title: { type: String, default: "" },
    intro: { type: String, default: "" },
    /**
     * The step as the body of a dialog: the actions sit in the card and
     * offer a cancel.
     */
    dialog: { type: Boolean, default: false },
  },
  data() {
    return {
      form: {
        name: "",
        contactName: this.prefill.contactName || "",
        mail: this.prefill.mail || "",
        phone: "",
        website: "",
        location: "",
      },
      rules: {
        required: [
          (v) =>
            !!(v && v.trim()) ||
            this.$t("tenant.onboarding.offer.errors.required"),
        ],
        mail: [
          (v) =>
            isFormallyValidMail(v) ||
            this.$t("tenant.onboarding.errors.mail-invalid"),
        ],
      },
    };
  },
  computed: {
    /**
     * The way to the missing verification proof the refusal names: the
     * verification mail of a local account, or a new sign-in at the identity
     * provider, which is where an SSO account gains its proof.
     */
    verificationWay() {
      if (this.error?.key === "verification-mail") return "mail";
      if (this.error?.key === "verification-identity-provider") return "sso";
      return null;
    },
    verificationFailedText() {
      if (!this.verificationLimit) {
        return this.$t("tenant.onboarding.verification.failed");
      }
      const { key, params } = rateLimitMessage(this.verificationLimit);
      return this.$t(`${key}.message`, params);
    },
    errorText() {
      const message = creationErrorMessage(this.error);
      return message ? this.$t(message.key, message.params) : "";
    },
  },
  methods: {
    fieldError(field) {
      const key = creationFieldErrorKey(this.error, field);
      return key ? [this.$t(key)] : [];
    },
    submit() {
      if (!this.$refs.form.validate()) return;
      this.$emit("submit", { ...this.form });
    },
  },
};
</script>

<style>
/* The step's own vocabulary, shared by every step component of the wizard
   (they render inside `.onboarding-page`), so the sheet is not scoped. */
.onboarding-page .onboarding-step__card {
  margin-bottom: var(--scb-gap-cards);
}

.onboarding-page .onboarding-step__lead {
  font-size: var(--scb-font-size-md);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
  margin-bottom: var(--scb-space-4);
}

.onboarding-page .onboarding-step__fine {
  margin: 0 0 var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-caption);
}

.onboarding-page .onboarding-step__optional .v-expansion-panel {
  background: transparent !important;
}

.onboarding-page .onboarding-step__optional .v-expansion-panel-header {
  min-height: var(--scb-row-height);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
  border-top: 1px solid var(--scb-rule);
}

.onboarding-page .onboarding-step__optional .v-expansion-panel-content__wrap {
  padding-left: 0;
  padding-right: 0;
}
</style>
