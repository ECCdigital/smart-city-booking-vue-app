<script>
import keycloakService from "@/services/KeycloakService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { isBffAuthMode } from "@/services/auth/authMode";
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";
import { legalDocumentHref } from "@/utils/instanceLegalDocuments";
import { isSafeInternalRedirect } from "@/utils/safeRedirect";

export default {
  name: "KeycloakCard",
  data() {
    return {
      nextUrl: null,
      userEmail: "",
      userName: "",
      loading: false,
      ssoConfig: {},
      acceptedDataProtection: false,
      acceptedTerms: false,
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
    isBffMode() {
      return isBffAuthMode();
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
    canSignUp() {
      if (this.requiresDataProtection && !this.acceptedDataProtection)
        return false;
      if (this.requiresTerms && !this.acceptedTerms) return false;
      return true;
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
    ssoTicket() {
      return this.$route.query.ticket || null;
    },
    async startBffSsoFlow() {
      const flow = this.$route.query.flow;
      if (flow === "confirm" || flow === "register") {
        this.loading = true;
        try {
          const pending = await ApiAuthService.getPendingSsoUser(
            this.ssoTicket()
          );
          this.userEmail = pending?.email || "";
          this.userName = pending?.name || "";
          this.setState(
            flow === "confirm"
              ? this.possibleStates.KC_AUTH_SUCCESS
              : this.possibleStates.NO_USER_FOUND
          );
        } catch {
          this.setState(this.possibleStates.KC_AUTH_ERROR);
        } finally {
          this.loading = false;
        }
        return;
      }

      this.loading = true;
      const redirect =
        (isSafeInternalRedirect(this.nextUrl, this.$router) && this.nextUrl) ||
        (() => {
          const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
          return base ? `${base}/` : "/";
        })();
      ApiAuthService.startSsoLogin(redirect);
    },
    async afterSignIn(user, permissions, redirectHint) {
      await this.updateUser({ user, permissions });
      await this.addToast(
        ToastService.createToast("login.success.default", "success"),
      );

      if (redirectHint && redirectHint !== "/" && !redirectHint.includes("/login")) {
        window.location.href = redirectHint;
        return;
      }

      const next = this.consumeNextUrl();
      if (isSafeInternalRedirect(next, this.$router)) {
        this.$router.push(next);
      } else {
        this.$router.push({ name: "dashboard" });
      }
    },
    async signIn() {
      try {
        this.loading = true;

        if (this.isBffMode) {
          const data = await ApiAuthService.ssoLogin(null, this.ssoTicket());
          await this.afterSignIn(
            data.user,
            data.permissions,
            data.redirect
          );
          return;
        }

        const token = await keycloakService.getValidToken();
        const { user, permissions } = await ApiAuthService.ssoLogin(token);
        await this.afterSignIn(user, permissions);
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
    async signUp() {
      if (!this.canSignUp) return;
      try {
        this.loading = true;

        if (this.isBffMode) {
          const response = await ApiAuthService.ssoRegister(
            null,
            this.buildLegalAcceptance(),
            this.ssoTicket()
          );
          if (response.status === 201 || response.data) {
            await this.addToast(
              ToastService.createToast("register.success.default", "success"),
            );
            this.setState(this.possibleStates.SIGNUP_SUCCESS);
            const user = response.data?.user || response.user;
            const permissions =
              response.data?.permissions || response.permissions;
            if (user) {
              setTimeout(
                () => this.afterSignIn(user, permissions),
                1500
              );
            }
          }
          return;
        }

        const token = await keycloakService.getValidToken();
        const response = await ApiAuthService.ssoRegister(
          token,
          this.buildLegalAcceptance(),
        );

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
      if (this.isBffMode) {
        ApiAuthService.changeSsoUser(window.location.href, this.ssoTicket());
        return;
      }
      await keycloakService.logout(window.location.href);
    },
    back() {
      const next = this.consumeNextUrl();
      if (isSafeInternalRedirect(next, this.$router)) {
        this.$router.push(next);
      } else {
        this.$router.push({ name: "login" });
      }
    },
    /** Hands out the stored return target once; it is cleared either way. */
    consumeNextUrl() {
      const next = this.nextUrl;
      this.nextUrl = null;
      this.updateNextUrl(null);
      return next;
    },
  },
  async mounted() {
    this.nextUrl = await this.getNextUrl();
    await this.fetchSsoConfig();
    if (this.isBffMode) {
      await this.startBffSsoFlow();
    } else {
      await this.createKeycloakSession();
    }
  },
};
</script>

<template>
  <div class="scb-form">
    <div v-if="loading && !state" class="d-flex flex-column align-center py-4">
      <v-progress-circular indeterminate color="primary" size="40" width="3" />
      <span class="scb-form__note mt-3">Verbindung wird hergestellt…</span>
    </div>

    <p
      v-if="state === possibleStates.KC_AUTH_SUCCESS"
      class="scb-form__note mb-0"
    >
      Authentifiziert als <strong>{{ userEmail }}</strong>
    </p>

    <v-alert
      v-if="state === possibleStates.KC_AUTH_ERROR"
      type="error"
      text
      dense
      class="mb-0"
    >
      Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.
    </v-alert>

    <template v-if="state === possibleStates.NO_USER_FOUND">
      <p class="scb-form__note mb-0">
        <strong>Willkommen, {{ userName || userEmail }}.</strong>
        Sie wurden erfolgreich authentifiziert, sind aber noch nicht in diesem
        System registriert. Möchten Sie Ihr Konto jetzt automatisch anlegen?
      </p>

      <div
        v-if="requiresDataProtection || requiresTerms"
        class="scb-form__consent mt-4"
      >
        <v-checkbox
          v-if="requiresDataProtection"
          v-model="acceptedDataProtection"
          hide-details="auto"
          dense
          class="mt-0 pt-0"
          :disabled="loading"
        >
          <template v-slot:label>
            <span>
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
          hide-details="auto"
          dense
          class="mt-0 pt-0"
          :class="{ 'mt-2': requiresDataProtection }"
          :disabled="loading"
        >
          <template v-slot:label>
            <span>
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
    </template>

    <template v-if="state === possibleStates.SIGNUP_SUCCESS">
      <p class="scb-form__note mb-0">
        Konto erstellt. Sie werden automatisch angemeldet…
      </p>
      <v-progress-linear indeterminate color="primary" rounded class="mt-3" />
    </template>

    <v-alert
      v-if="
        state === possibleStates.SIGNUP_ERROR ||
        state === possibleStates.SIGNIN_ERROR
      "
      type="error"
      text
      dense
      class="mb-0"
    >
      {{
        state === possibleStates.SIGNUP_ERROR
          ? "Registrierung fehlgeschlagen."
          : "Anmeldung fehlgeschlagen."
      }}
      Bitte versuchen Sie es erneut.
    </v-alert>

    <template v-if="state === possibleStates.KC_AUTH_SUCCESS">
      <v-btn
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
        :loading="loading"
        @click="signIn"
      >
        Anmelden
      </v-btn>
      <v-btn
        block
        outlined
        elevation="0"
        class="mt-3"
        :loading="loading"
        @click="changeUser"
      >
        Benutzer wechseln
      </v-btn>
    </template>
    <v-btn
      v-if="state === possibleStates.NO_USER_FOUND"
      color="primary"
      block
      elevation="0"
      class="scb-form__submit mt-4"
      :loading="loading"
      :disabled="!canSignUp"
      @click="signUp"
    >
      Registrieren
    </v-btn>

    <p class="scb-form__switch mt-4 mb-0">
      <button type="button" class="scb-form__link" @click="back">Zurück</button>
    </p>
  </div>
</template>
