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
import { mapActions } from "vuex";

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
      loading: false,
      state: "", // '' | 'error' | 'success' | 'awaiting_verification' | 'awaiting_link_confirmation'
      errorMessage: "",
      rules: {
        required: (v) => !!v || "Erforderlich.",
        email: (v) => {
          const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
          return pattern.test(v) || "Ungültige Email-Adresse.";
        },
      },
    };
  },

  computed: {
    verifyUrl() {
      const base = window.location.origin;
      return `${base}/email/verify`;
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

    async submitRegistration() {
      if (!this.$refs.registerForm.validate()) return;

      this.loading = true;
      this.state = "";
      this.errorMessage = "";

      try {
        const result = await ApiAuthService.cardSignup({
          appId: this.cardMethod.id,
          publicId: this.publicId,
          secret: this.secret,
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName,
          company: this.company,
        });

        if (result.status === "link_requested") {
          this.state = "awaiting_link_confirmation";
          await this.addToast(
            ToastService.createToast("cardLogin.linkRequested", "success")
          );
        } else {
          this.state = "awaiting_verification";
          await this.addToast(
            ToastService.createToast("cardLogin.verificationSent", "success")
          );
        }
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
