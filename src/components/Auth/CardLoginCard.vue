<template>
  <v-card flat max-width="500">
    <v-card-text class="px-10">
      <v-alert v-if="state === 'success'" dense text type="success">
        Erfolgreich authentifiziert. Sie werden weitergeleitet…
      </v-alert>

      <v-alert
        v-else-if="state === 'awaiting_link_confirmation'"
        dense
        text
        type="info"
      >
        Die Email-Adresse <strong>{{ email }}</strong> ist bereits registriert.
        Wir haben Ihnen eine Bestätigungs-Email gesendet. Bitte klicken Sie den
        Link darin, um die Karte mit Ihrem bestehenden Account zu verknüpfen.
      </v-alert>

      <v-alert
        v-else-if="state === 'awaiting_verification'"
        dense
        text
        type="info"
      >
        Ihr Account wurde erstellt. Bitte bestätigen Sie Ihre Email-Adresse über
        den Link, den wir Ihnen gerade gesendet haben. Danach können Sie sich
        mit Ihrer Karte anmelden.
      </v-alert>

      <v-alert v-if="state === 'error'" dense text type="error">
        {{ errorMessage }}
      </v-alert>

      <v-form
        v-if="step === 'credentials' && state !== 'success'"
        ref="credentialsForm"
        @keydown.enter="submitCredentials"
      >
        <v-text-field
          v-model="publicId"
          outlined
          :label="cardMethod.publicIdField.label || 'Kartennummer'"
          :placeholder="cardMethod.publicIdField.placeholder"
          :hint="cardMethod.publicIdField.helpText"
          :persistent-hint="!!cardMethod.publicIdField.helpText"
          :rules="[rules.required]"
          prepend-inner-icon="mdi-card-account-details"
          class="mb-2"
        />

        <v-text-field
          v-model="secret"
          outlined
          :label="cardMethod.secretField.label || 'Secret'"
          :placeholder="cardMethod.secretField.placeholder"
          :hint="cardMethod.secretField.helpText"
          :persistent-hint="!!cardMethod.secretField.helpText"
          :rules="[rules.required]"
          prepend-inner-icon="mdi-shield-key"
          :type="showSecret ? 'text' : 'password'"
          :append-icon="showSecret ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showSecret = !showSecret"
        />
      </v-form>

      <v-form
        v-else-if="step === 'register' && state !== 'awaiting_verification'"
        ref="registerForm"
        @keydown.enter="submitRegistration"
      >
        <v-alert type="info" text dense class="mb-4">
          Diese Karte ist noch keinem Account zugeordnet. Bitte vervollständigen
          Sie Ihre Daten, um einen Account zu erstellen.
        </v-alert>

        <v-text-field
          v-model="email"
          outlined
          label="Email Adresse"
          placeholder="jemand@domain.de"
          :rules="[rules.required, rules.email]"
          prepend-inner-icon="mdi-email"
          autocomplete="email"
          type="email"
          class="mb-2"
        />

        <v-text-field
          v-model="firstName"
          outlined
          label="Vorname"
          prepend-inner-icon="mdi-account"
          class="mb-2"
        />

        <v-text-field
          v-model="lastName"
          outlined
          label="Nachname"
          prepend-inner-icon="mdi-account"
          class="mb-2"
        />

        <v-text-field
          v-model="company"
          outlined
          label="Unternehmen (optional)"
          prepend-inner-icon="mdi-domain"
        />

        <div
          v-if="requiresDataProtection || requiresTerms"
          class="text-left mt-2"
        >
          <v-checkbox
            v-if="requiresDataProtection"
            v-model="acceptedDataProtection"
            :rules="[rules.acceptedDataProtection]"
            hide-details="auto"
            class="mt-0"
          >
            <template v-slot:label>
              <span class="text-body-2">
                Ich habe die
                <a
                  :href="dataProtectionHref"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  >Datenschutzerklärung</a
                >
                gelesen und akzeptiere sie.
              </span>
            </template>
          </v-checkbox>
          <v-checkbox
            v-if="requiresTerms"
            v-model="acceptedTerms"
            :rules="[rules.acceptedTerms]"
            hide-details="auto"
            class="mt-0"
          >
            <template v-slot:label>
              <span class="text-body-2">
                Ich akzeptiere die
                <a
                  :href="termsHref"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  >Allgemeinen Geschäftsbedingungen</a
                >.
              </span>
            </template>
          </v-checkbox>
        </div>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-10 pb-10">
      <v-btn outlined @click="back">Zurück</v-btn>
      <v-spacer />

      <v-btn
        v-if="step === 'credentials' && state !== 'success'"
        color="primary"
        elevation="0"
        :loading="loading"
        @click="submitCredentials"
      >
        <v-icon left>mdi-card-account-details</v-icon>
        Anmelden
      </v-btn>

      <v-btn
        v-if="step === 'register' && state !== 'awaiting_verification'"
        color="primary"
        elevation="0"
        :loading="loading"
        @click="submitRegistration"
      >
        <v-icon left>mdi-account-plus</v-icon>
        Account erstellen
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import ApiAuthService from "@/services/api/ApiAuthService";
import ToastService from "@/services/ToastService";
import { legalDocumentHref } from "@/utils/instanceLegalDocuments";
import { mapActions, mapGetters } from "vuex";

export default {
  name: "CardLoginCard",

  emits: ["success"],

  props: {
    cardMethod: { type: Object, required: true },
  },

  data() {
    return {
      step: "credentials", // 'credentials' | 'register'
      publicId: "",
      secret: "",
      showSecret: false,
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      acceptedDataProtection: false,
      acceptedTerms: false,
      loading: false,
      state: "", // '' | 'error' | 'success' | 'awaiting_verification' | 'awaiting_link_confirmation'
      errorMessage: "",
      rules: {
        required: (v) => !!v || "Erforderlich.",
        email: (v) => {
          const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
          return pattern.test(v) || "Ungültige Email-Adresse.";
        },
        acceptedDataProtection: (v) =>
          v === true || "Bitte stimmen Sie der Datenschutzerklärung zu",
        acceptedTerms: (v) => v === true || "Bitte stimmen Sie den AGB zu",
      },
    };
  },

  computed: {
    ...mapGetters({
      instance: "instance/instance",
    }),
    verifyUrl() {
      const base = window.location.origin;
      return `${base}/email/verify`;
    },
    dataProtection() {
      return this.instance?.dataProtection || {};
    },
    termsAndConditions() {
      return this.instance?.termsAndConditions || {};
    },
    requiresDataProtection() {
      return !!this.dataProtection.url;
    },
    requiresTerms() {
      return !!this.termsAndConditions.url;
    },
    dataProtectionHref() {
      return legalDocumentHref(this.dataProtection.url);
    },
    termsHref() {
      return legalDocumentHref(this.termsAndConditions.url);
    },
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
    }),

    async submitCredentials() {
      if (!this.$refs.credentialsForm.validate()) return;

      this.loading = true;
      this.state = "";
      this.errorMessage = "";

      try {
        const result = await ApiAuthService.cardLogin(
          this.cardMethod.id,
          this.publicId,
          this.secret
        );

        if (result.requiresRegistration) {
          this.email = result.prefill?.email || "";
          this.firstName = result.prefill?.firstName || "";
          this.lastName = result.prefill?.lastName || "";
          this.company = result.prefill?.company || "";
          this.step = "register";
          return;
        }

        await this.updateUser({
          user: result.user,
          permissions: result.permissions,
        });

        this.state = "success";
        await this.addToast(
          ToastService.createToast("login.success.default", "success")
        );

        setTimeout(() => {
          this.$emit("success");
        }, 1500);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.loading = false;
      }
    },

    buildLegalAcceptance() {
      const acceptance = {};
      const acceptedAt = new Date().toISOString();
      if (this.requiresDataProtection) {
        acceptance.dataProtection = {
          accepted: this.acceptedDataProtection,
          url: this.dataProtection.url,
          fileName: this.dataProtection.fileName || "",
          source: this.dataProtection.source || "url",
          acceptedAt,
        };
      }
      if (this.requiresTerms) {
        acceptance.termsAndConditions = {
          accepted: this.acceptedTerms,
          url: this.termsAndConditions.url,
          fileName: this.termsAndConditions.fileName || "",
          source: this.termsAndConditions.source || "url",
          acceptedAt,
        };
      }
      return acceptance;
    },

    async submitRegistration() {
      if (!this.$refs.registerForm.validate()) return;

      this.loading = true;
      this.state = "";
      this.errorMessage = "";

      try {
        const payload = {
          appId: this.cardMethod.id,
          publicId: this.publicId,
          secret: this.secret,
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName,
          company: this.company,
        };

        const legalAcceptance = this.buildLegalAcceptance();
        if (Object.keys(legalAcceptance).length > 0) {
          payload.legalAcceptance = legalAcceptance;
        }

        const result = await ApiAuthService.cardSignup(payload);

        if (result.status === "link_requested") {
          this.state = "awaiting_link_confirmation";
        } else {
          this.state = "awaiting_verification";
        }

        await this.addToast(
          ToastService.createToast("register.success.default", "success")
        );
      } catch (error) {
        this.handleError(error);
      } finally {
        this.loading = false;
      }
    },

    handleError(error) {
      this.state = "error";
      const reason = error.response?.data?.reason;
      const status = error.response?.status;
      const backendMsg = error.response?.data?.message;

      const messages = {
        not_found: "Karte nicht gefunden.",
        secret_mismatch: `Ungültige(r/s) ${
          this.cardMethod.secretField.label || "Secret"
        }.`,
        expired: "Diese Karte ist abgelaufen.",
        email_not_verified:
          "Bitte bestätigen Sie zuerst Ihre Email-Adresse, bevor Sie sich anmelden.",
      };

      if (messages[reason]) {
        this.errorMessage = messages[reason];
      } else if (status === 409) {
        this.errorMessage =
          backendMsg ||
          "Diese Karte oder Email ist bereits einem Account zugeordnet.";
      } else if (status === 403) {
        this.errorMessage = backendMsg || "Ihr Account ist gesperrt.";
      } else if (status === 503) {
        this.errorMessage =
          "Der Karten-Service ist aktuell nicht erreichbar. Bitte versuchen Sie es später erneut.";
      } else {
        this.errorMessage =
          backendMsg ||
          "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.";
      }
    },

    back() {
      if (this.step === "register" && this.state !== "awaiting_verification") {
        this.step = "credentials";
        this.state = "";
        this.errorMessage = "";
        return;
      }
      this.$router.push({ name: "login" });
    },
  },
};
</script>
