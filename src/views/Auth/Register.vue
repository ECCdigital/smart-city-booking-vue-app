<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text class="text-center pa-10">
        <v-img :src="appLogo" max-width="200" class="mx-auto" />

        <h2 class="mt-8 mb-2">Registrieren</h2>
        <p class="subtitle-2 mb-10">Erstellen Sie einen Account.</p>

        <form @submit.prevent="register" action="/register" method="post">
          <v-form ref="form">
            <div class="d-flex flex-row">
              <v-text-field
                outlined
                hide-details
                label="Vorname"
                placeholder="John"
                prepend-inner-icon="mdi-account"
                class="mb-5 mr-2"
                v-model="firstName"
                :rules="firstNameRules"
                name="firstName"
                autocomplete="given-name"
              ></v-text-field>
              <v-text-field
                outlined
                hide-details
                label="Nachname"
                placeholder="Doe"
                prepend-inner-icon="mdi-account"
                class="mb-5"
                v-model="lastName"
                :rules="lastNameRules"
                name="lastName"
                autocomplete="family-name"
              ></v-text-field>
            </div>
            <v-text-field
              outlined
              hide-details
              label="Firma"
              placeholder="Company"
              prepend-inner-icon="mdi-home"
              class="mb-5"
              v-model="company"
              name="company"
              autocomplete="organization"
            ></v-text-field>
            <v-text-field
              outlined
              label="Email Adresse"
              placeholder="jemand@domain.de"
              prepend-inner-icon="mdi-email"
              hide-details
              class="mb-5"
              v-model="id"
              :rules="emailRules"
              name="email"
              type="email"
              autocomplete="email"
            ></v-text-field>
            <div class="d-flex flex-row">
              <v-text-field
                outlined
                label="Passwort"
                placeholder="Ihr Passwort"
                prepend-inner-icon="mdi-key"
                class="mr-2"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showPassword = !showPassword"
                :rules="passwordRules"
                validate-on="lazy input"
                name="new-password"
                id="new-password"
                autocomplete="new-password"
              ></v-text-field>
              <v-text-field
                outlined
                label="Passwort wiederholen"
                placeholder="Ihr Passwort"
                prepend-inner-icon="mdi-key"
                v-model="passwordRepeat"
                :type="showPassword ? 'text' : 'password'"
                :rules="passwordCheckRule"
                name="confirm-password"
                id="confirm-password"
                autocomplete="new-password"
              ></v-text-field>
            </div>

            <ContactInformation />

            <div
              v-if="requiresDataProtection || requiresTerms"
              class="mt-2 text-left"
            >
              <v-checkbox
                v-if="requiresDataProtection"
                v-model="acceptedDataProtection"
                :rules="dataProtectionAcceptRules"
                hide-details="auto"
                class="mt-0"
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
                :rules="termsAcceptRules"
                hide-details="auto"
                class="mt-0"
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

            <input type="submit" style="display: none" />
          </v-form>
        </form>
      </v-card-text>
      <v-card-actions class="px-10 pb-5">
        <v-btn to="/login" outlined>Konto vorhanden?</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" elevation="0" @click="register" type="submit">
          Registrieren
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card
      v-if="legalLinks.length"
      elevation="0"
      max-width="500"
      class="mx-auto mt-2"
    >
      <v-card-text class="text-right pa-0">
        <template v-for="(doc, i) in legalLinks">
          <span :key="doc.key">
            <a :href="doc.url" target="_blank" rel="noopener noreferrer">{{
              doc.label
            }}</a>
            <span v-if="i < legalLinks.length - 1"> | </span>
          </span>
        </template>
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import ContactInformation from "@/components/ContactInformation.vue";
import { legalDocumentHref } from "@/utils/instanceLegalDocuments";

export default {
  computed: {
    ...mapGetters({
      instance: "instance/instance",
      nextUrl: "authStore/nextUrl",
    }),
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
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
    legalLinks() {
      const links = [];
      const add = (key, label) => {
        const url = legalDocumentHref(this.instance?.[key]?.url);
        if (url) links.push({ key, label, url });
      };
      add("dataProtection", "Datenschutz");
      add("legalNotice", "Impressum");
      add("termsAndConditions", "AGB");
      return links;
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
  components: { ContactInformation },
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
      termsAcceptRules: [
        (v) => v === true || "Bitte stimmen Sie den AGB zu",
      ],
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
          this.nextUrl,
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
            const status = error.response?.status;
            if (status === 401) {
              this.addToast(
                ToastService.createToast("register.error.wrong-email", "error")
              );
            } else if (status === 400) {
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
