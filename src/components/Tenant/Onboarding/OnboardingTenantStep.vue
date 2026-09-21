<template>
  <v-form ref="form" @submit.prevent="submit" data-test="tenant-step">
    <h2 class="text-h5 mb-1">{{ $t("tenant.onboarding.tenant.title") }}</h2>
    <p class="text--secondary">{{ $t("tenant.onboarding.tenant.intro") }}</p>

    <v-alert v-if="created" type="success" text dense>
      {{ $t("tenant.onboarding.tenant.created-hint") }}
    </v-alert>
    <v-alert v-if="errorText" type="error" text dense data-test="tenant-error">
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
      :disabled="created"
      :error-messages="fieldError('name')"
      background-color="accent"
      filled
      dense
      data-test="tenant-name"
    />
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.contactName"
          :label="$t('tenant.onboarding.tenant.contact-name')"
          :rules="rules.required"
          :disabled="created"
          :error-messages="fieldError('contactName')"
          background-color="accent"
          filled
          dense
          data-test="tenant-contact-name"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.mail"
          :label="$t('tenant.onboarding.tenant.mail')"
          :rules="rules.mail"
          :disabled="created"
          :error-messages="fieldError('mail')"
          type="email"
          background-color="accent"
          filled
          dense
          data-test="tenant-mail"
        />
      </v-col>
    </v-row>
    <p v-if="!created" class="text-caption text--secondary">
      {{ $t("tenant.onboarding.tenant.prefill-hint") }}
    </p>

    <v-expansion-panels v-if="!created" flat class="mb-4">
      <v-expansion-panel>
        <v-expansion-panel-header class="px-0">
          {{ $t("tenant.onboarding.tenant.optional") }}
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-text-field
            v-model="form.phone"
            :label="$t('tenant.onboarding.tenant.phone')"
            background-color="accent"
            filled
            dense
          />
          <v-text-field
            v-model="form.website"
            :label="$t('tenant.onboarding.tenant.website')"
            background-color="accent"
            filled
            dense
          />
          <v-text-field
            v-model="form.location"
            :label="$t('tenant.onboarding.tenant.location')"
            background-color="accent"
            filled
            dense
          />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="d-flex flex-wrap mt-4" style="gap: 12px">
      <v-btn
        color="primary"
        type="submit"
        :loading="inProgress"
        data-test="tenant-submit"
      >
        {{
          created
            ? $t("tenant.onboarding.tenant.continue")
            : $t("tenant.onboarding.tenant.submit")
        }}
      </v-btn>
      <v-btn outlined @click="$emit('exit')">
        {{ $t("tenant.onboarding.exit") }}
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
    tenant: { type: Object, default: null },
    prefill: { type: Object, default: () => ({}) },
    inProgress: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /** The renewed verification mail: `null`, `sending`, `sent` or `failed`. */
    verificationMail: { type: String, default: null },
    /** The hit limit (`rateLimitOf`) a refused verification mail named. */
    verificationLimit: { type: Object, default: null },
  },
  data() {
    const source = this.tenant || this.prefill;
    return {
      form: {
        name: this.tenant?.name || "",
        contactName: source.contactName || "",
        mail: source.mail || "",
        phone: this.tenant?.phone || "",
        website: this.tenant?.website || "",
        location: this.tenant?.location || "",
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
    created() {
      return !!this.tenant;
    },
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
      if (this.created) {
        this.$emit("continue");
        return;
      }
      if (!this.$refs.form.validate()) return;
      this.$emit("submit", { ...this.form });
    },
  },
};
</script>
