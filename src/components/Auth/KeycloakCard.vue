<script>
import Keycloak from "keycloak-js";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";
import VueJwtDecode from "vue-jwt-decode";
export default {
  name: "KeycloakCard",
  data() {
    return {
      nextUrl: null,
      userEmail: "",
      keycloakToken: null,
      loading: false,
      loggingIn: false,
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
    checkoutContext() {
      return this.$route.name === "checkout-sso";
    },
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
      try {
        this.ssoConfig = this.instance.applications.find(
          (app) => app.id === "keycloak"
        );
      } catch (error) {
        this.setState(this.possibleStates.KC_AUTH_ERROR);
      }
    },
    async createKeycloakSession() {
      this.loading = true;
      const keycloak = new Keycloak({
        url: this.ssoConfig.serverUrl,
        realm: this.ssoConfig.realm,
        clientId: this.ssoConfig.publicClient,
      });
      try {
        await keycloak.init({
          onLoad: "login-required",
          checkLoginIframe: false,
        });
        this.keycloakToken = keycloak.token;
        if (this.keycloakToken) {
          this.setState(this.possibleStates.KC_AUTH_SUCCESS);
          const decoded = VueJwtDecode.decode(this.keycloakToken);
          this.userEmail = decoded.email;
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
        const response = await ApiAuthService.ssoLogin(
          this.keycloakToken
        );
        if (response.status === 200) {
          await this.updateUser(response.data);
          await this.addToast(
            ToastService.createToast("login.success.default", "success")
          );
          if (this.nextUrl) {
            this.$router.push(this.nextUrl);
            this.updateNextUrl(null);
            return;
          } else {
            await this.$router.push({ name: "admin" });
          }
        } else {
          await this.addToast(
            ToastService.createToast("login.error.default", "error")
          );
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.setState(this.possibleStates.NO_USER_FOUND);
        } else {
          this.setState(this.possibleStates.SIGNIN_ERROR);
          await this.addToast(
            ToastService.createToast("login.error.default", "error")
          );
        }
      }
    },
    async signUp() {
      try {
        this.loading = true;
        const response = await ApiAuthService.ssoRegister(
          this.keycloakToken
        );
        if (response.status === 201) {
          await this.addToast(
            ToastService.createToast("register.success.default", "success")
          );
          this.setState(this.possibleStates.SIGNUP_SUCCESS);
          setTimeout(() => {
            this.signIn();
          }, 2000);
        }
      } catch (error) {
        this.setState(this.possibleStates.SIGNUP_ERROR);
        await this.addToast(
          ToastService.createToast("register.error.default", "error")
        );
      } finally {
        this.loading = false;
      }
    },
    async changeUser() {
      const keycloak = new Keycloak({
        url: this.ssoConfig.serverUrl,
        realm: this.ssoConfig.realm,
        clientId: this.ssoConfig.publicClient,
      });
      await keycloak.init({
        checkLoginIframe: false,
      });
      keycloak.logout();
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
      <p>
        <v-progress-circular
          v-if="loading"
          indeterminate
          color="primary"
          size="24"
        ></v-progress-circular>
      </p>
      <v-alert
        v-if="state === possibleStates.KC_AUTH_SUCCESS"
        dense
        text
        type="success"
      >
        Sie wurden erfolgreich authentifiziert. Wollen Sie sich mit dem Benutzer
        <strong>{{ userEmail }}</strong> anmelden?
      </v-alert>
      <v-alert
        v-if="state === possibleStates.KC_AUTH_ERROR"
        dense
        text
        type="error"
      >
        Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.
      </v-alert>
      <v-alert
        v-if="state === possibleStates.NO_USER_FOUND"
        dense
        text
        type="info"
      >
        Wir konnten keinen Benutzer finden. Möchten Sie sich mit dem Benutzer
        <strong>{{ userEmail }}</strong> registrieren?
      </v-alert>
      <v-alert
        v-if="state === possibleStates.SIGNUP_SUCCESS"
        dense
        text
        type="success"
      >
        Sie wurden erfolgreich registriert. Sie werden in Kürze angemeldet.
        <template v-slot:prepend>
          <v-progress-circular indeterminate></v-progress-circular>
        </template>
      </v-alert>
      <v-alert
        v-if="state === possibleStates.SIGNUP_ERROR"
        dense
        text
        type="error"
      >
        Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.
      </v-alert>
    </v-card-text>
    <v-card-actions class="px-10 pb-10">
      <v-btn outlined @click="back"> zurück </v-btn>
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
<style scoped>
.cut-text {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>
