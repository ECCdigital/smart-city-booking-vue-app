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

    <p v-if="!hideRegisterLink" class="login-card__register mt-4 mb-0">
      <span class="text--secondary">Noch nicht registriert?</span>
      <router-link
        :to="{ name: 'register' }"
        class="login-card__link login-card__link--strong"
        target="_blank"
      >
        Registrieren
      </router-link>
    </p>
  </div>
</template>

<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions } from "vuex";

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
    hideRegisterLink: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      id: "",
      password: "",
      showPassword: false,
      isLoading: false,
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
        if (error.response?.status === 401) {
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
  font-size: var(--scb-font-size-sm);
  text-decoration: none;
}

.login-card__link--strong {
  font-weight: var(--scb-font-weight-medium);
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
