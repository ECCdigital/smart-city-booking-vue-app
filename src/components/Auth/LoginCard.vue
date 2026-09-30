<template>
  <div class="login-card">
    <v-form ref="loginForm" @submit.prevent="signin">
      <v-text-field
        background-color="accent"
        filled
        dense
        hide-details="auto"
        label="E-Mail-Adresse"
        class="mb-4"
        v-model="id"
        :rules="[rules.required]"
        autocomplete="email"
        id="email"
        name="email"
        type="email"
      />
      <v-text-field
        background-color="accent"
        filled
        dense
        hide-details="auto"
        label="Passwort"
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append="showPassword = !showPassword"
        :rules="[rules.required]"
        autocomplete="current-password"
        id="password"
        name="password"
      />
      <div class="d-flex justify-end mt-2 mb-4">
        <router-link
          :to="{ name: 'password-reset' }"
          class="login-card__link"
          rel="noopener"
          target="_blank"
        >
          Passwort vergessen?
        </router-link>
      </div>
      <v-btn
        type="submit"
        color="primary"
        block
        elevation="0"
        :loading="isLoading"
      >
        Anmelden
      </v-btn>
      <p class="login-card__register mt-4 mb-0">
        <span class="text--secondary">Noch kein Konto?</span>
        <router-link
          :to="registerRoute"
          class="login-card__link"
          :target="registerInNewTab ? '_blank' : null"
        >
          Hier registrieren
        </router-link>
      </p>
      <v-alert
        v-if="unverifiedId"
        type="info"
        text
        dense
        class="text-left mt-4 mb-0"
        data-test="verification-required"
      >
        <div v-if="verificationMail === 'sent'" data-test="verification-sent">
          {{ $t("auth.verification.sent") }}
        </div>
        <template v-else>
          <div>{{ $t("auth.verification.required") }}</div>
          <v-btn
            small
            outlined
            color="primary"
            class="mt-2"
            :loading="verificationMail === 'sending'"
            data-test="verification-resend"
            @click="resendVerification"
          >
            {{ $t("auth.verification.resend") }}
          </v-btn>
          <div
            v-if="verificationError"
            class="error--text mt-2"
            data-test="verification-failed"
          >
            {{ verificationError }}
          </div>
        </template>
      </v-alert>
    </v-form>

    <!-- ═══════ Alternative Methoden ═══════ -->
    <template v-if="hasAlternativeMethods">
      <div class="login-card__or my-4">
        <v-divider />
        <span class="text-caption text--secondary mx-3">oder</span>
        <v-divider />
      </div>

      <v-btn
        v-if="ssoActive"
        block
        outlined
        elevation="0"
        class="mb-3"
        @click="sso"
      >
        <v-icon left>mdi-domain</v-icon>
        Über Single Sign-on anmelden
      </v-btn>
      <v-btn
        v-for="method in cardMethods"
        :key="method.id"
        block
        outlined
        elevation="0"
        class="mb-3"
        @click="goToCardLogin(method)"
      >
        <v-icon left>mdi-card-account-details</v-icon>
        Mit {{ method.label }} anmelden
      </v-btn>
    </template>
  </div>
</template>

<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions } from "vuex";
import { rateLimitMessage, rateLimitOf } from "@/utils/rateLimit";

/** The backend's login refusal of an account without e-mail verification. */
const isNotVerified = (error) =>
  error.response?.status === 403 &&
  error.response.data?.message === "User is not verified";

export default {
  name: "LoginCard",

  emits: ["success"],

  props: {
    ssoActive: {
      type: Boolean,
      default: false,
    },
    cardMethods: {
      type: Array,
      default: () => [],
    },
    /**
     * The checkout embeds the card and must keep its own page, so its
     * registration link opens a new tab; the login page navigates in place.
     */
    registerInNewTab: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {
      id: "",
      password: "",
      showPassword: false,
      isLoading: false,
      /** The address the login refused as unverified; offers the resend. */
      unverifiedId: null,
      /** The renewed verification mail: `null`, `sending`, `sent` or `failed`. */
      verificationMail: null,
      verificationError: "",
      rules: {
        required: (value) => !!value || "Erforderlich.",
        email: (value) => {
          const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
          return pattern.test(value) || "Ungültige Email-Adresse.";
        },
      },
    };
  },

  computed: {
    hasAlternativeMethods() {
      return this.ssoActive || this.cardMethods.length > 0;
    },
    registerRoute() {
      const next = this.$route.query.next;
      return next
        ? { name: "register", query: { next } }
        : { name: "register" };
    },
    /** Where the login leads: the page that asked for it, or its checkout. */
    returnTarget() {
      if (this.$route.query.next) return this.$route.query.next;
      return this.$route.fullPath.includes("checkout")
        ? this.$route.fullPath
        : undefined;
    },
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
      updateNextUrl: "authStore/setNextUrl",
    }),

    async signin() {
      if (!this.$refs.loginForm.validate()) return;

      this.isLoading = true;
      this.unverifiedId = null;
      this.verificationMail = null;
      this.verificationError = "";
      try {
        const { user, permissions } = await ApiAuthService.login(
          this.id,
          this.password
        );
        await this.updateUser({ user, permissions });
        await this.addToast(
          ToastService.createToast("login.success.default", "success")
        );
        this.id = "";
        this.password = "";
        this.$emit("success");
      } catch (error) {
        if (isNotVerified(error)) {
          this.unverifiedId = this.id;
        } else if (error.response?.status === 401) {
          await this.addToast(
            ToastService.createToast("login.error.wrong-email", "error")
          );
        } else {
          await this.addToast(
            ToastService.createToast("login.error.default", "error")
          );
        }
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * The verification mail again, account-neutral like the backend's answer;
     * its link leads back to where this login leads.
     */
    async resendVerification() {
      this.verificationMail = "sending";
      this.verificationError = "";
      try {
        await ApiAuthService.resendVerification(
          this.unverifiedId,
          this.returnTarget
        );
        this.verificationMail = "sent";
      } catch (error) {
        const limit = rateLimitOf(error);
        if (limit) {
          const { key, params } = rateLimitMessage(limit);
          this.verificationError = this.$t(`${key}.message`, params);
        } else {
          this.verificationError = this.$t("auth.verification.failed");
        }
        this.verificationMail = "failed";
      }
    },

    sso() {
      if (this.$route.fullPath.includes("checkout")) {
        this.updateNextUrl(this.$route.fullPath);
      }
      this.$router.push({ name: "sso" });
    },

    goToCardLogin(method) {
      if (this.$route.fullPath.includes("checkout")) {
        this.updateNextUrl(this.$route.fullPath);
      }
      this.$router.push({
        name: "card-login",
        params: { appId: method.id },
      });
    },
  },
};
</script>

<style scoped>
.login-card {
  padding: var(--scb-section-body-padding);
  padding-top: var(--scb-space-5);
}

.login-card__link {
  text-decoration: none;
}

.login-card__or {
  display: flex;
  align-items: center;
}

.login-card__register {
  text-align: center;
  font-size: var(--scb-font-size-md);
}
</style>
