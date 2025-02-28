<template>
  <v-container class="text-center">
    <v-card outlined class="mx-auto mt-sm-10" width="500">
      <v-card-text class="px-10 pb-5">
        <v-img src="@/assets/app-logo.png" max-width="200" class="mx-auto"/>
        <h2 class="mt-8 mb-2">Passwort zurücksetzen</h2>
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-text-field
            outlined
            label="Email Adresse"
            placeholder="jemand@domain.de"
            prepend-inner-icon="mdi-email"
            class="mt-5"
            :rules="emailRules"
            v-model="id">
          </v-text-field>
          <div class="d-flex flex-row">
            <v-text-field
              outlined
              label="Neues Passwort"
              placeholder="********"
              prepend-inner-icon="mdi-key"
              :rules="passwordRules"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              class="mr-2"
              @click:append="showPassword = !showPassword">
            </v-text-field>
            <v-text-field
              outlined
              label="Passwort wiederholen"
              placeholder="********"
              prepend-inner-icon="mdi-key"
              :rules="passwordRules"
              :type="showPassword ? 'text' : 'password'"
              v-model="passwordRepeat">
            </v-text-field>
          </div>

        </v-form>
      </v-card-text>
      <v-card-actions class="px-10 pb-5">
        <v-btn outlined @click="goBack">zurück</v-btn>
        <v-spacer></v-spacer>
        <v-btn  color="primary" elevation="0" @click="resetPassword">Passwort zurücksetzen</v-btn>
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
import ApiAuthService from "@/services/api/ApiAuthService";
import {mapActions, mapGetters} from "vuex";
import ToastService from "@/services/ToastService";
import ApiTenantService from "@/services/api/ApiTenantService";
import Utils from "@/utils/Utils";

export default {
  name: "PasswordReset",
  computed: {
    Utils() {
      return Utils
    },
    ...mapGetters({
      instance: "instance/instance",
    }),
  },
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
          ApiAuthService.resetPassword(this.id, this.password)
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
      ApiTenantService.getTenants(true).then((response) => {
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
