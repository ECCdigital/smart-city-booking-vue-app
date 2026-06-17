<template>
  <v-card flat max-width="500">
    <v-card-text class="text-center">
      <v-form ref="loginForm" @keydown.enter="signin">
        <v-text-field
          outlined
          hide-details
          label="Email Adresse"
          placeholder="jemand@domain.de"
          class="mb-5"
          v-model="id"
          :rules="[rules.required]"
          prepend-inner-icon="mdi-email"
          autocomplete="email"
          id="email"
          name="email"
          type="email"
          @keydown.enter="signin"
        />
        <v-text-field
          outlined
          hide-details
          label="Passwort"
          placeholder="Ihr Passwort"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
          :rules="[rules.required]"
          prepend-inner-icon="mdi-lock"
          autocomplete="current-password"
          id="password"
          name="password"
          @keydown.enter="signin"
        />
      </v-form>
      <div class="text-left mt-2">
        <router-link
          :to="{ name: 'password-reset' }"
          class="forgot-link"
          rel="noopener"
          target="_blank"
        >
          Passwort vergessen?
        </router-link>
      </div>
    </v-card-text>

    <v-card-actions class="px-4">
      <v-btn :to="{ name: 'register' }" target="_blank" outlined>
        Konto erstellen
      </v-btn>
      <v-spacer />
      <v-btn color="primary" elevation="0" @click="signin" :loading="isLoading">
        Anmelden
      </v-btn>
    </v-card-actions>

    <!-- ═══════ Alternative Methoden ═══════ -->
    <template v-if="hasAlternativeMethods">
      <v-card-text class="px-4 pb-0">
        <v-row no-gutters align="center">
          <v-col><v-divider /></v-col>
          <v-col cols="auto" class="mx-2">
            <span class="text--secondary text-caption">oder</span>
          </v-col>
          <v-col><v-divider /></v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-4 pt-2" style="gap: 8px">
        <v-row>
          <v-col cols="12">
            <v-btn v-if="ssoActive" block outlined elevation="0" @click="sso">
              <v-img
                src="@/assets/keycloak.svg"
                max-width="80"
                class="mr-2"
                alt="Keycloak"
              /> </v-btn
          ></v-col>

          <v-col v-for="method in cardMethods" :key="method.id" cols="12"
            ><v-btn block outlined elevation="0" @click="goToCardLogin(method)">
              <v-icon left>mdi-card-account-details</v-icon>
              Mit {{ method.label }} anmelden
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </template>
  </v-card>
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
.forgot-link {
  font-size: 0.85rem;
}
</style>
