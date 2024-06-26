<template>
    <div class="text-center">
      <v-card outlined max-width="500" class="mx-auto mt-sm-15">
        <v-card-text class="text-center pa-10"><v-img src="@/assets/app-logo.png" max-width="200" class="mx-auto"/>


          <h2 class="mt-8 mb-2">Anmeldung</h2>
          <p class="subtitle-2 mb-10">Mit Ihrem Account anmelden.</p>

          <v-text-field outlined hide-details label="Email Adresse" placeholder="jemand@domain.de" class="mb-5"
                        v-model="id"></v-text-field>
          <v-text-field outlined hide-details label="Passwort" placeholder="Ihr Passwort" v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                        @click:append="showPassword = !showPassword"></v-text-field>
          <div class="text-left mt-2"><a href="/password/reset">Passwort vergessen?</a></div>
          <v-select outlined hide-details label="Mandant" v-model="tenant" :items="tenants" item-text="name"
                    return-object no-data-text="Keine Mandanten vorhanden" class="mt-5"></v-select>
          <ContactInformation/>
        </v-card-text>
        <v-card-actions class="px-10 pb-10">
          <v-btn to="/registrieren" outlined>Konto erstellen</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" elevation="0" @click="signin">Anmelden</v-btn>
        </v-card-actions>
      </v-card>

      <v-card elevation="0" max-width="500" class="mx-auto mt-2">
        <v-card-text class="text-right pa-0">
          <router-link to="/datenschutz">Datenschutz</router-link>
          |
          <router-link to="/nutzungsbedingungen">Nutzungsbedingungen</router-link>
        </v-card-text>
      </v-card>
    </div>
</template>
<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiTenantService from "@/services/api/ApiTenantService";
import {mapActions} from "vuex";
import ContactInformation from "@/components/ContactInformation.vue";

export default {
  components: {
    ContactInformation
  },
  data() {
    return {
      id: "",
      tenant: {},
      password: "",
      showPassword: false,
      loginSuccessful: false,
      tenants: []
    }
  },

  mounted() {
    this.fetchTenants();
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
      updateTenant: "tenants/update"
    }),
    signin() {
      this.updateTenant(this.tenant);

      ApiAuthService.login(this.tenant.id, this.id, this.password)
        .then((response) => {
          if (response.status === 200) {
            return new Promise((resolve, reject) => {
              this.updateUser(response.data)
                .then(response => {
                  this.addToast(ToastService.createToast("login.success.default", "success"));
                  this.$router.push("/admin/dashboard");
                  resolve(response) // return response data to calling function
                })
                .catch(error => {
                  this.addToast(ToastService.createToast("errors.something-wrong", "error"));
                  reject(error) // return error to calling function
                })
            })
          }
        })
        .catch((error) => {
          if (error.response.status === 401) {
            this.addToast(ToastService.createToast("login.error.wrong-email", "error"));
          } else if (error.response.status === 400) {
            this.addToast(ToastService.createToast("login.error.default", "error"));
          } else {
            this.addToast(ToastService.createToast("login.error.default", "error"));
          }
        })
    },
    fetchTenants() {
      ApiTenantService.getTenants(true).then((response) => {
        this.tenants = response.data;
      });
    }
  },
}
</script>
