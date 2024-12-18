<script>
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions } from "vuex";

export default {
  name: "LoginCard",
  components: {},

  emits: ["success"],

  props: {
    tenant: {
      type: Object,
      default: () => ({}),
    },
    ssoActive: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      id: "",
      password: "",
      showPassword: false,
      loginSuccessful: false,
      tenants: [],
      rules: {
        required: (value) => !!value || "Erforderlich.",
        email: (value) => {
          const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
          return pattern.test(value) || "Ungültige Email-Adresse.";
        },
      },
    };
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
      updateTenant: "tenants/update",
    }),
    signin() {
      if (!this.$refs.loginForm.validate()) {
        return;
      }

      this.updateTenant(this.tenant);

      ApiAuthService.login(this.tenant.id, this.id, this.password)
        .then((response) => {
          if (response.status === 200) {
            return new Promise((resolve, reject) => {
              this.updateUser(response.data)
                .then((response) => {
                  this.addToast(
                    ToastService.createToast("login.success.default", "success")
                  );
                  this.id = "";
                  this.password = "";
                  this.$emit("success");
                  resolve(response);
                })
                .catch((error) => {
                  this.addToast(
                    ToastService.createToast("errors.something-wrong", "error")
                  );
                  reject(error);
                });
            });
          }
        })
        .catch((error) => {
          if (error.response.status === 401) {
            this.addToast(
              ToastService.createToast("login.error.wrong-email", "error")
            );
          } else if (error.response.status === 400) {
            this.addToast(
              ToastService.createToast("login.error.default", "error")
            );
          } else {
            this.addToast(
              ToastService.createToast("login.error.default", "error")
            );
          }
        });
    },
    sso() {
      this.$router.push({ name: "sso" });
    },
    toStep(step) {
      this.$emit("toStep", step);
    },
  },

  mounted() {},
};
</script>

<template>
  <v-card flat max-width="500" >
    <v-card-text class="text-center">
      <p class="subtitle-1">Mit Ihrem Account anmelden.</p>
      <v-row class="mb-2" align="center">
        <v-col class="text-left cut-text"> Mandant: {{ tenant?.name }} </v-col>
      </v-row>
      <v-form ref="loginForm" @keydown.enter="signin">
        <v-text-field
          dense
          filled
          hide-details
          label="Email Adresse"
          placeholder="jemand@domain.de"
          class="mb-5"
          v-model="id"
          :rules="[rules.required, rules.email]"
          prepend-icon="mdi-email"
          @keydown.enter="signin"
        ></v-text-field>
        <v-text-field
          dense
          filled
          hide-details
          label="Passwort"
          placeholder="Ihr Passwort"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
          :rules="[rules.required]"
          prepend-icon="mdi-lock"
          @keydown.enter="signin"
        ></v-text-field>
      </v-form>
      <div class="text-left mt-2">
        <a href="/password/reset" target="_blank">Passwort vergessen?</a>
      </div>
    </v-card-text>
    <v-card-actions class="px-4">
      <v-btn to="/registrieren" target="_blank" outlined>Konto erstellen</v-btn>
      <v-spacer></v-spacer>
      <v-btn color="primary" elevation="0" @click="signin">Anmelden</v-btn>
    </v-card-actions>
    <v-card-text v-if="ssoActive" class="px-4">
      <v-row no-gutters align="center">
        <v-col>
          <v-divider></v-divider>
        </v-col>
        <v-col cols="auto" class="mx-2">
          <span>oder</span>
        </v-col>
        <v-col>
          <v-divider></v-divider>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions v-if="ssoActive" class="px-4">
      <v-btn color="primary" block elevation="0" @click="sso"
      >Mit Keycloak anmelden</v-btn
      >
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
