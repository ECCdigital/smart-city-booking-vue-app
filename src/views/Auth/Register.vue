<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text class="text-center pa-10">
        <v-img src="/app-logo.png" max-width="200" class="mx-auto" />

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

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <a
          :href="'https://' + Utils.sanitizeUrl(instance?.dataProtectionUrl)"
          target="_blank"
          >Datenschutz</a
        >
        |
        <a
          :href="'https://' + Utils.sanitizeUrl(instance?.legalNoticeUrl)"
          target="_blank"
          >Nutzungsbedingungen</a
        >
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
import Utils from "@/utils/Utils";

export default {
  computed: {
    Utils() {
      return Utils;
    },
    ...mapGetters({
      instance: "instance/instance",
    }),
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
    this.fetchTenants();
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    register() {
      if (this.$refs.form.validate()) {
        ApiAuthService.register(
          this.tenant,
          this.id,
          this.firstName,
          this.lastName,
          this.company,
          this.password
        )
          .then((response) => {
            if (response.status === 201) {
              this.$router.push(`/willkommen/${this.tenant}`).then(() => {
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
            if (error.response.status === 401) {
              this.addToast(
                ToastService.createToast("register.error.wrong-email", "error")
              );
            } else if (error.response.status === 400) {
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
