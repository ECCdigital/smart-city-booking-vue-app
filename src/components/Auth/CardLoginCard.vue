<template>
  <v-card flat max-width="500">
    <v-card-text class="px-10">
      <!-- Erfolg -->
      <v-alert v-if="state === 'success'" dense text type="success">
        Erfolgreich authentifiziert. Sie werden weitergeleitet…
      </v-alert>

      <!-- Fehler -->
      <v-alert v-if="state === 'error'" dense text type="error">
        {{ errorMessage }}
      </v-alert>

      <!-- Formular -->
      <v-form v-if="state !== 'success'" ref="form" @keydown.enter="submit">
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
    </v-card-text>

    <v-card-actions class="px-10 pb-10">
      <v-btn outlined @click="back">Zurück</v-btn>
      <v-spacer />
      <v-btn
        v-if="state !== 'success'"
        color="primary"
        elevation="0"
        :loading="loading"
        @click="submit"
      >
        <v-icon left>mdi-card-account-details</v-icon>
        Anmelden
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
      email: "",
      publicId: "",
      secret: "",
      showSecret: false,
      loading: false,
      state: "", // '' | 'error' | 'success'
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

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
    }),

    async submit() {
      if (!this.$refs.form.validate()) return;

      this.loading = true;
      this.state = "";
      this.errorMessage = "";

      try {
        const response = await ApiAuthService.cardLogin(
          this.cardMethod.id,
          this.publicId,
          this.secret,
          this.email
        );


        const { user, permissions } = response;
        await this.updateUser({ user, permissions });

        this.state = "success";
        await this.addToast(
          ToastService.createToast("login.success.default", "success")
        );

        setTimeout(() => {
          this.$emit("success");
        }, 1500);
      } catch (error) {
        this.state = "error";
        const reason = error.response?.data?.reason;
        const status = error.response?.status;

        const messages = {
          not_found: "Karte nicht gefunden.",
          secret_mismatch: `Ungültige(r/s) ${
            this.cardMethod.secretField.label || "Secret"
          }.`,
          owner_mismatch:
            "Diese Karte gehört nicht zu diesem Benutzer-Account.",
          expired: "Diese Karte ist abgelaufen.",
        };

        if (messages[reason]) {
          this.errorMessage = messages[reason];
        } else if (status === 404) {
          this.errorMessage =
            "Benutzer nicht gefunden. Bitte prüfen Sie Ihre Email-Adresse.";
        } else if (status === 403) {
          this.errorMessage = "Ihr Account ist gesperrt.";
        } else if (status === 503) {
          this.errorMessage =
            "Der Karten-Service ist aktuell nicht erreichbar. Bitte versuchen Sie es später erneut.";
        } else {
          this.errorMessage =
            "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.";
        }
      } finally {
        this.loading = false;
      }
    },

    back() {
      this.$router.push({ name: "login" });
    },
  },
};
</script>
