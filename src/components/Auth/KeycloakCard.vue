<script>
import keycloakService from "@/services/KeycloakService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";

export default {
  name: "KeycloakCard",
  data() {
    return {
      nextUrl: null,
      userEmail: "",
      userName: "",
      loading: false,
      ssoConfig: {},
      state: "",
      possibleStates: {
        SIGNUP_SUCCESS: "signup-success",
        SIGNUP_ERROR: "signup-error",
        SIGNIN_SUCCESS: "signin-success",
        SIGNIN_ERROR: "signin-error",
        KC_AUTH_SUCCESS: "kc-auth-success",
        KC_AUTH_ERROR: "kc-auth-error",
        NO_USER_FOUND: "no-user-found",
      },
    };
  },
  computed: {
    ...mapGetters({
      instance: "instance/instance",
    }),
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
      getNextUrl: "authStore/getNextUrl",
      updateNextUrl: "authStore/setNextUrl",
    }),
    setState(state) {
      this.state = state;
    },
    async fetchSsoConfig() {
      this.ssoConfig = this.instance.applications.find(
        (app) => app.id === "keycloak",
      );
    },
    async createKeycloakSession() {
      this.loading = true;
      try {
        keycloakService.setConfig(this.ssoConfig);

        await keycloakService.login();

        if (keycloakService.isAuthenticated) {
          this.setState(this.possibleStates.KC_AUTH_SUCCESS);
          this.userEmail = keycloakService.tokenParsed?.email || "";
          this.userName = keycloakService.tokenParsed?.given_name + " " + keycloakService.tokenParsed?.family_name || "";
        } else {
          this.setState(this.possibleStates.KC_AUTH_ERROR);
        }
      } catch (error) {
        this.setState(this.possibleStates.KC_AUTH_ERROR);
      } finally {
        this.loading = false;
      }
    },
    async signIn() {
      try {
        this.loading = true;
        const token = await keycloakService.getValidToken();
        const { user, permissions } = await ApiAuthService.ssoLogin(token);

        await this.updateUser({ user, permissions });
        await this.addToast(
          ToastService.createToast("login.success.default", "success"),
        );

        if (this.nextUrl) {
          this.$router.push(this.nextUrl);
          this.updateNextUrl(null);
        } else {
          this.$router.push({ name: "dashboard" });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.setState(this.possibleStates.NO_USER_FOUND);
        } else {
          this.setState(this.possibleStates.SIGNIN_ERROR);
          await this.addToast(
            ToastService.createToast("login.error.default", "error"),
          );
        }
      } finally {
        this.loading = false;
      }
    },
    async signUp() {
      try {
        this.loading = true;
        const token = await keycloakService.getValidToken();
        const response = await ApiAuthService.ssoRegister(token);

        if (response.status === 201) {
          await this.addToast(
            ToastService.createToast("register.success.default", "success"),
          );
          this.setState(this.possibleStates.SIGNUP_SUCCESS);
          setTimeout(() => this.signIn(), 2000);
        }
      } catch (error) {
        this.setState(this.possibleStates.SIGNUP_ERROR);
        await this.addToast(
          ToastService.createToast("register.error.default", "error"),
        );
      } finally {
        this.loading = false;
      }
    },
    async changeUser() {
      await keycloakService.logout(window.location.href);
    },
    back() {
      if (this.nextUrl) {
        this.$router.push(this.nextUrl);
        this.updateNextUrl(null);
      } else {
        this.$router.push({ name: "login" });
      }
    },
  },
  async mounted() {
    await this.fetchSsoConfig();
    await this.createKeycloakSession();
    this.nextUrl = await this.getNextUrl();
  },
};
</script>

<template>
  <v-card flat max-width="500">
    <v-card-text class="px-10 pb-10">
      <div
        v-if="loading && !state"
        class="d-flex flex-column align-center py-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          size="40"
          width="3"
        />
        <span class="text-body-2 grey--text mt-3">
      Verbindung wird hergestellt…
    </span>
      </div>

      <div
        v-if="state === possibleStates.KC_AUTH_SUCCESS"
        class="d-flex flex-column align-center text-center"
      >
        <v-avatar color="green lighten-5" size="56" class="mb-3">
          <v-icon color="green" size="28">mdi-check-circle</v-icon>
        </v-avatar>
        <div class="text-body-2 grey--text text--darken-1 mb-1">
          Authentifiziert als
        </div>
        <div class="text-subtitle-1 font-weight-bold">
          {{ userEmail }}
        </div>
      </div>

      <div
        v-if="state === possibleStates.KC_AUTH_ERROR"
        class="d-flex flex-column align-center text-center"
      >
        <v-avatar color="red lighten-5" size="56" class="mb-3">
          <v-icon color="red" size="28">mdi-alert-circle</v-icon>
        </v-avatar>
        <div class="text-subtitle-1 font-weight-medium mb-1">
          Authentifizierung fehlgeschlagen
        </div>
        <div class="text-body-2 grey--text text--darken-1">
          Bitte versuchen Sie es erneut.
        </div>
      </div>

      <div
        v-if="state === possibleStates.NO_USER_FOUND"
        class="d-flex flex-column align-center text-center"
      >
        <v-avatar color="blue lighten-5" size="56" class="mb-3">
          <v-icon color="blue" size="28">mdi-account-plus</v-icon>
        </v-avatar>
        <div class="text-subtitle-1 font-weight-medium mb-1">
          Willkommen, {{ userName || userEmail }}
        </div>
        <div class="text-body-2 grey--text text--darken-1">
          Sie wurden erfolgreich authentifiziert, sind aber noch nicht in
          diesem System registriert. Möchten Sie Ihr Konto jetzt
          automatisch anlegen?
        </div>
      </div>

      <div
        v-if="state === possibleStates.SIGNUP_SUCCESS"
        class="d-flex flex-column align-center text-center"
      >
        <v-avatar color="green lighten-5" size="56" class="mb-3">
          <v-icon color="green" size="28">mdi-account-check</v-icon>
        </v-avatar>
        <div class="text-subtitle-1 font-weight-medium mb-1">
          Konto erstellt
        </div>
        <div class="text-body-2 grey--text text--darken-1">
          Sie werden automatisch angemeldet…
        </div>
        <v-progress-linear
          indeterminate
          color="green"
          rounded
          class="mt-3"
          style="max-width: 200px"
        />
      </div>

      <div
        v-if="
      state === possibleStates.SIGNUP_ERROR ||
      state === possibleStates.SIGNIN_ERROR
    "
        class="d-flex flex-column align-center text-center"
      >
        <v-avatar color="red lighten-5" size="56" class="mb-3">
          <v-icon color="red" size="28">mdi-close-circle</v-icon>
        </v-avatar>
        <div class="text-subtitle-1 font-weight-medium mb-1">
          {{
            state === possibleStates.SIGNUP_ERROR
              ? "Registrierung fehlgeschlagen"
              : "Anmeldung fehlgeschlagen"
          }}
        </div>
        <div class="text-body-2 grey--text text--darken-1">
          Bitte versuchen Sie es erneut.
        </div>
      </div>
    </v-card-text>
    <v-card-actions class="px-10 pb-10">
      <v-btn outlined @click="back">zurück</v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-if="state === possibleStates.KC_AUTH_SUCCESS"
        outlined
        elevation="0"
        @click="changeUser"
        :loading="loading"
      >
        Benutzer wechseln
      </v-btn>
      <v-btn
        v-if="state === possibleStates.KC_AUTH_SUCCESS"
        color="primary"
        elevation="0"
        @click="signIn"
        :loading="loading"
      >
        Anmelden
      </v-btn>
      <v-btn
        v-if="state === possibleStates.NO_USER_FOUND"
        color="primary"
        elevation="0"
        @click="signUp"
        :loading="loading"
      >
        Registrieren
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
