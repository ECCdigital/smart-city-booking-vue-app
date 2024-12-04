<template>
  <div class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-15">
      <v-card-text class="text-center pa-10">
        <v-img src="@/assets/app-logo.png" max-width="200" class="mx-auto" />

        <h2 class="mt-8 mb-2">Registrieren</h2>
        <p class="subtitle-2 mb-10">Erstellen Sie einen Account.</p>

        <v-form ref="form">
          <v-select
            outlined
            hide-details
            v-model="tenant"
            :items="tenants"
            label="Mandant"
            item-text="name"
            item-value="id"
            placeholder="Mandant auswählen"
            class="mb-5"
            :rules="tenantRules"
          ></v-select>
          <v-text-field
            outlined
            label="Email Adresse"
            placeholder="jemand@domain.de"
            hide-details
            class="mb-5"
            v-model="id"
            :rules="emailRules"
          ></v-text-field>
          <v-text-field
            outlined
            hide-details
            label="Vorname"
            placeholder="John"
            class="mb-5"
            v-model="firstName"
            :rules="firstNameRules"
          ></v-text-field>
          <v-text-field
            outlined
            hide-details
            label="Nachname"
            placeholder="Doe"
            class="mb-5"
            v-model="lastName"
            :rules="lastNameRules"
          ></v-text-field>
          <v-text-field
            outlined
            hide-details
            label="Firma"
            placeholder="Company"
            class="mb-5"
            v-model="company"
          ></v-text-field>
          <v-text-field
            outlined
            label="Passwort"
            placeholder="Ihr Passwort"
            aria-details="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showPassword = !showPassword"
            :rules="passwordRules"
          ></v-text-field>

          <ContactInformation />
        </v-form>
      </v-card-text>
      <v-card-actions class="px-10 pb-10">
        <v-btn to="/login" outlined>Konto vorhanden?</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" elevation="0" @click="register"
          >Registrieren</v-btn
        >
      </v-card-actions>
    </v-card>

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <router-link to="/datenschutz">Datenschutz</router-link> |
        <router-link to="/nutzungsbedingungen">Nutzungsbedingungen</router-link>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import ContactInformation from "@/components/ContactInformation.vue";

export default {
  components: { ContactInformation },
  data() {
    return {
      id: "",
      firstName: "",
      lastName: "",
      company: "",
      tenant: "",
      password: "",
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
