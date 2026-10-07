<template>
  <AuthPage
    :title="link ? 'Neues Passwort festlegen' : 'Passwort zurücksetzen'"
    icon="mdi-lock-reset"
  >
    <v-form
      v-if="link"
      ref="form"
      v-model="valid"
      lazy-validation
      class="scb-form"
      @submit.prevent="setPassword"
    >
      <p class="scb-form__note mb-4">
        Legen Sie das neue Passwort für {{ link.id }} fest.
      </p>
      <div class="scb-form__row">
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Neues Passwort"
          :rules="passwordRules"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
          name="new-password"
          autocomplete="new-password"
        ></v-text-field>
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Passwort wiederholen"
          :rules="passwordRules"
          :type="showPassword ? 'text' : 'password'"
          v-model="passwordRepeat"
          name="confirm-password"
          autocomplete="new-password"
        ></v-text-field>
      </div>

      <v-btn
        type="submit"
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
      >
        Passwort speichern
      </v-btn>

      <p class="scb-form__switch mt-4 mb-0">
        <router-link :to="{ name: 'password-reset' }" class="scb-form__link">
          Neuen Link anfordern
        </router-link>
      </p>
    </v-form>

    <div v-else-if="requested" class="scb-form">
      <p class="scb-form__note mb-0">
        Wenn zu dieser E-Mail-Adresse ein Konto besteht, erhalten Sie in Kürze
        eine E-Mail mit einem Link, über den Sie ein neues Passwort festlegen
        können.
      </p>
      <p class="scb-form__switch mt-4 mb-0">
        <router-link :to="{ name: 'login' }" class="scb-form__link">
          Zurück zur Anmeldung
        </router-link>
      </p>
    </div>

    <v-form
      v-else
      ref="form"
      v-model="valid"
      lazy-validation
      class="scb-form"
      @submit.prevent="requestLink"
    >
      <p class="scb-form__note mb-4">
        Sie erhalten eine E-Mail mit einem Link, über den Sie ein neues Passwort
        festlegen können.
      </p>
      <v-text-field
        background-color="accent"
        filled
        dense
        hide-details="auto"
        label="E-Mail-Adresse"
        :rules="emailRules"
        v-model="email"
        name="email"
        type="email"
        autocomplete="email"
      ></v-text-field>

      <v-btn
        type="submit"
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
      >
        Link anfordern
      </v-btn>

      <p class="scb-form__switch mt-4 mb-0">
        <router-link :to="{ name: 'login' }" class="scb-form__link">
          Zurück zur Anmeldung
        </router-link>
      </p>
    </v-form>
  </AuthPage>
</template>

<script>
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";
import AuthPage from "@/components/Auth/AuthPage.vue";

// The backend's refusal of a link that is unknown, spent or not the address's.
const LINK_REFUSED = [400, 410];

/**
 * „Passwort vergessen“ in two steps. Without a link the page asks for the
 * address and requests the mail; the answer is the same for every address,
 * so the page tells nobody whether an account exists. The mail's link
 * (`?token=…&id=…`) opens the second step, which sets the new password.
 */
export default {
  name: "PasswordReset",
  components: { AuthPage },
  data() {
    return {
      showPassword: false,
      valid: true,
      email: "",
      requested: false,
      password: "",
      passwordRepeat: "",
      emailRules: [
        (v) => !!v || "E-Mail ist erforderlich",
        (v) => /.+@.+/.test(v) || "E-Mail muss gültig sein",
      ],
      passwordRules: [(v) => !!v || "Passwort ist erforderlich"],
    };
  },
  computed: {
    /** Token and address of the mail's link, or null without both. */
    link() {
      const { token, id } = this.$route.query;
      return token && id ? { token, id } : null;
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async requestLink() {
      if (!this.$refs.form.validate()) return;
      try {
        await ApiAuthService.forgotPassword(this.email);
        this.requested = true;
      } catch {
        this.addToast(
          ToastService.createToast("password.reset.error", "error")
        );
      }
    },
    async setPassword() {
      if (!this.$refs.form.validate()) return;
      if (this.password !== this.passwordRepeat) {
        this.addToast(
          ToastService.createToast("password.reset.password-mismatch", "error")
        );
        return;
      }
      try {
        await ApiAuthService.resetPasswordWithToken({
          ...this.link,
          password: this.password,
        });
        this.addToast(
          ToastService.createToast("password.reset.done", "success")
        );
        this.$router.push({ name: "login" });
      } catch (err) {
        const key = LINK_REFUSED.includes(err.response?.status)
          ? "password.reset.link-invalid"
          : "password.reset.error";
        this.addToast(ToastService.createToast(key, "error"));
      }
    },
  },
};
</script>
