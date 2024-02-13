<template>
  <v-container class="text-center  fill-height fluid justify-center">
    <v-card outlined class="mx-auto mt-sm-15" width="500">
      <v-card-text class="px-10 pb-10">
        <v-img src="../../../public/app-logo.png" max-width="200" class="mx-auto"/>
        <h2 class="mt-8 mb-2">Passwort zurücksetzen</h2>
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-text-field
            outlined
            label="Email Adresse"
            placeholder="jemand@domain.de"
            class="mt-5"
            :rules="emailRules"
            v-model="id">
          </v-text-field>
          <v-text-field
            outlined
            label="Neues Passwort"
            placeholder="********"
            class="mt-5"
            :rules="passwordRules"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showPassword = !showPassword">
          </v-text-field>
          <v-text-field
            outlined
            label="Passwort wiederholen"
            placeholder="********"
            class="mt-5"
            :rules="passwordRules"
            :type="showPassword ? 'text' : 'password'"
            v-model="passwordRepeat">
          </v-text-field>
          <v-select outlined hide-details label="Mandant" v-model="tenant" :items="tenants" item-text="name"
                    return-object no-data-text="Keine Mandanten vorhanden" class="mt-5"></v-select>
        </v-form>
      </v-card-text>
      <v-card-actions class="px-10 pb-10">
        <v-btn outlined @click="goBack">zurück</v-btn>
        <v-spacer></v-spacer>
        <v-btn  color="primary" elevation="0" @click="resetPassword">Passwort zurücksetzen</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>

</template>

<script>
import ApiAuthService from "@/services/api/ApiAuthService";
import {mapActions} from "vuex";
import ToastService from "@/services/ToastService";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "PasswordReset",
  data() {
    return {
      showPassword: false,
      valid: true,
      tenant: {},
      tenants: [],
      id: "",
      password: "",
      passwordRepeat: "",
      emailRules: [
        v => !!v || "E-Mail ist erforderlich",
        v => /.+@.+/.test(v) || "E-Mail muss gültig sein",
      ],
      passwordRules: [
        v => !!v || "Passwort ist erforderlich",
      ],
    };
  },
  methods: {
    ...mapActions({addToast: "toasts/add"}),
    resetPassword() {
      // validate form
      if (this.$refs.form.validate()) {
        // check if passwords match
        if (this.password === this.passwordRepeat) {
          // call api
          ApiAuthService.resetPassword(this.id, this.password, this.tenant.id)
            .then(() => {
              this.addToast(ToastService.createToast("password.reset.success", "success"))
              this.$router.push("/login");
            })
            .catch((err) => {
              if (err.response.status === 404) {
                this.addToast(ToastService.createToast("password.reset.wrong-email", "error"))
              } else {
                this.addToast(ToastService.createToast("password.reset.error", "error"))
              }
            });
        } else {
          this.addToast(ToastService.createToast("password.reset.password-mismatch", "error"))
        }
      }
    },
    goBack() {
      if (_.isNil(this.$route.query.fromRoute)) {
        this.$router.push({ name: "home" });
      } else {
        this.$router.push({ name: this.$route.query.fromRoute });
      }
    },
    fetchTenants() {
      ApiTenantService.getTenants().then((response) => {
        this.tenants = response.data;
      });
    },
  },
  mounted() {
    this.fetchTenants();
  },
}
</script>

<style scoped>

</style>
