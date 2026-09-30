<template>
  <AuthPage title="Registrieren" icon="mdi-account-plus-outline">
    <v-form ref="form" class="register-form" @submit.prevent="register">
      <div class="register-form__row">
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Vorname"
          v-model="firstName"
          :rules="firstNameRules"
          name="firstName"
          autocomplete="given-name"
        ></v-text-field>
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Nachname"
          v-model="lastName"
          :rules="lastNameRules"
          name="lastName"
          autocomplete="family-name"
        ></v-text-field>
      </div>
      <v-text-field
        background-color="accent"
        filled
        dense
        hide-details="auto"
        label="Organisation (optional)"
        class="mt-4"
        v-model="company"
        name="company"
        autocomplete="organization"
      ></v-text-field>
      <v-text-field
        background-color="accent"
        filled
        dense
        hide-details="auto"
        label="E-Mail-Adresse"
        class="mt-4"
        v-model="id"
        :rules="emailRules"
        name="email"
        type="email"
        autocomplete="email"
      ></v-text-field>
      <div class="register-form__row mt-4">
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Passwort"
          hint="Mindestens 8 Zeichen."
          persistent-hint
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
          :rules="passwordRules"
          name="new-password"
          id="new-password"
          autocomplete="new-password"
        ></v-text-field>
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Passwort wiederholen"
          v-model="passwordRepeat"
          :type="showPassword ? 'text' : 'password'"
          :rules="passwordCheckRule"
          name="confirm-password"
          id="confirm-password"
          autocomplete="new-password"
        ></v-text-field>
      </div>

      <div
        v-if="requiresDataProtection || requiresTerms"
        class="register-form__consent mt-4"
      >
        <v-checkbox
          v-if="requiresDataProtection"
          v-model="acceptedDataProtection"
          :rules="dataProtectionAcceptRules"
          hide-details="auto"
          dense
          class="mt-0 pt-0"
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
              gelesen und stimme ihr zu.
            </span>
          </template>
        </v-checkbox>
        <v-checkbox
          v-if="requiresTerms"
          v-model="acceptedTerms"
          :rules="termsAcceptRules"
          hide-details="auto"
          dense
          class="mt-0 pt-0"
          :class="{ 'mt-2': requiresDataProtection }"
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

      <v-btn type="submit" color="primary" block elevation="0" class="mt-4">
        Registrieren
      </v-btn>
      <p class="register-form__login mt-4 mb-0">
        <span class="text--secondary">Haben Sie bereits ein Konto?</span>
        <router-link :to="loginRoute" class="register-form__link">
          Anmelden
        </router-link>
      </p>
    </v-form>
  </AuthPage>
</template>
<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import AuthPage from "@/components/Auth/AuthPage.vue";
import { legalDocumentHref } from "@/utils/instanceLegalDocuments";
import { isSafeInternalRedirect } from "@/utils/safeRedirect";
import { rateLimitMessage, rateLimitOf } from "@/utils/rateLimit";

export default {
  computed: {
    ...mapGetters({
      instance: "instance/instance",
      nextUrl: "authStore/nextUrl",
    }),
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
    /**
     * The return target (backend: `nextUrl`) the verification mail carries
     * back to the login; only a safe in-app path leaves this page.
     */
    returnTarget() {
      return isSafeInternalRedirect(this.nextUrl, this.$router)
        ? this.nextUrl
        : null;
    },
    /** The way back to the login: the return target travels along. */
    loginRoute() {
      return this.returnTarget
        ? { name: "login", query: { next: this.returnTarget } }
        : { name: "login" };
    },
    invitationParams() {
      const url = this.nextUrl;
      if (!url) return { token: null, tenantId: null };

      const match = url.match(/\/auth\/invitation\/([^/?#]+)/);
      const tenantId = match ? decodeURIComponent(match[1]) : null;

      let token = null;
      const queryIndex = url.indexOf("?");
      if (queryIndex !== -1) {
        const params = new URLSearchParams(url.slice(queryIndex + 1));
        token = params.get("token");
      }

      return { token, tenantId };
    },
  },
  components: { AuthPage },
  data() {
    return {
      id: "",
      firstName: "",
      lastName: "",
      company: "",
      tenant: "",
      password: "",
      passwordRepeat: "",
      showPassword: false,
      acceptedDataProtection: false,
      acceptedTerms: false,
      dataProtectionAcceptRules: [
        (v) => v === true || "Bitte stimmen Sie der Datenschutzerklärung zu",
      ],
      termsAcceptRules: [(v) => v === true || "Bitte stimmen Sie den AGB zu"],
      tenants: [],
      tenantRules: [(v) => !!v || "Mandant ist erforderlich"],
      firstNameRules: [(v) => !!v || "Vorname ist erforderlich"],
      lastNameRules: [(v) => !!v || "Nachname ist erforderlich"],
      emailRules: [
        (v) => !!v || "E-Mail ist erforderlich",
        (v) => /.+@.+\..+/.test(v) || "E-Mail muss gültig sein",
      ],
      passwordRules: [
        (v) => !!v || "Passwort ist erforderlich",
        (v) => v.length >= 8 || "Passwort muss mindestens 8 Zeichen lang sein",
      ],
      passwordCheckRule: [
        (v) => v === this.password || "Passwörter stimmen nicht überein",
      ],
    };
  },

  mounted() {
    const next = this.$route.query.next;
    if (next) {
      this.updateNextUrl(next);
    }
    this.fetchTenants();
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateNextUrl: "authStore/setNextUrl",
    }),
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
    register() {
      if (this.$refs.form.validate()) {
        const { token: invitationToken, tenantId: invitationTenantId } =
          this.invitationParams;
        ApiAuthService.register(
          this.tenant,
          this.id,
          this.firstName,
          this.lastName,
          this.company,
          this.password,
          this.returnTarget,
          this.buildLegalAcceptance(),
          invitationToken,
          invitationTenantId
        )
          .then((response) => {
            if (response.status === 201) {
              this.$router.push(`/welcome/${this.tenant}`).then(() => {
                this.addToast(
                  ToastService.createToast(
                    "register.success.default",
                    "success"
                  )
                );
              });
            }
          })
          .catch((error) => {
            const limit = rateLimitOf(error);
            if (limit) {
              const { key, params } = rateLimitMessage(limit);
              this.addToast(
                ToastService.createToast(key, "error", 10000, params)
              );
            } else if (error.response?.status === 400) {
              this.addToast(
                ToastService.createToast(
                  "register.error.information-missing",
                  "error"
                )
              );
            } else {
              this.addToast(
                ToastService.createToast("register.error.default", "error")
              );
            }
          });
      }
    },
    fetchTenants() {
      ApiTenantService.getTenants(true).then((response) => {
        this.tenants = response.data;
      });
    },
  },
};
</script>

<style scoped>
.register-form {
  padding: var(--scb-section-body-padding);
  padding-top: var(--scb-space-5);
}

.register-form__row {
  display: flex;
  gap: var(--scb-space-4);
}

.register-form__row > * {
  flex: 1 1 0;
  min-width: 0;
}

.register-form__login {
  text-align: center;
  font-size: var(--scb-font-size-md);
}

.register-form__link {
  text-decoration: none;
}

/* The consents sit right before the action, on the faint selection tint,
   so they are read as part of the form and not as small print. */
.register-form__consent {
  padding: 14px var(--scb-space-3);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  background-color: var(--scb-selected-tint-faint);
}

/* $scb-bp-xs of tokens.scss; a scoped style cannot read it. */
@media (max-width: 599px) {
  .register-form__row {
    flex-direction: column;
    gap: var(--scb-space-4);
  }
}
</style>
