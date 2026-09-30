<template>
  <AuthPage title="Passwort zurücksetzen" icon="mdi-lock-reset">
    <v-form
      ref="form"
      v-model="valid"
      lazy-validation
      class="scb-form"
      @submit.prevent="resetPassword"
    >
      <p class="scb-form__note mb-4">
        Sie erhalten eine E-Mail mit einem Link, über den Sie das neue Passwort
        bestätigen können.
      </p>
      <v-text-field
        background-color="accent"
        filled
        dense
        hide-details="auto"
        label="E-Mail-Adresse"
        :rules="emailRules"
        v-model="id"
        name="email"
        type="email"
        autocomplete="email"
      ></v-text-field>
      <div class="scb-form__row mt-4">
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Neues Passwort"
          :rules="passwordRules"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
          name="new-password"
          autocomplete="new-password"
        ></v-text-field>
        <v-text-field
          background-color="accent"
          filled
          dense
          hide-details="auto"
          label="Passwort wiederholen"
          :rules="passwordRules"
          :type="showPassword ? 'text' : 'password'"
          v-model="passwordRepeat"
          name="confirm-password"
          autocomplete="new-password"
        ></v-text-field>
      </div>

      <v-btn
        type="submit"
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
      >
        Passwort zurücksetzen
      </v-btn>

      <p class="scb-form__switch mt-4 mb-0">
        <router-link :to="{ name: 'login' }" class="scb-form__link">
          Zurück zur Anmeldung
        </router-link>
      </p>
    </v-form>
  </AuthPage>
</template>

<script>
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";
import AuthPage from "@/components/Auth/AuthPage.vue";

export default {
  name: "PasswordReset",
  components: { AuthPage },
  data() {
    return {
      showPassword: false,
      valid: true,
      id: "",
      password: "",
      passwordRepeat: "",
      emailRules: [
        (v) => !!v || "E-Mail ist erforderlich",
        (v) => /.+@.+/.test(v) || "E-Mail muss gültig sein",
      ],
      passwordRules: [(v) => !!v || "Passwort ist erforderlich"],
    };
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    resetPassword() {
      // validate form
      if (this.$refs.form.validate()) {
        // check if passwords match
        if (this.password === this.passwordRepeat) {
          // call api
          ApiAuthService.resetPassword(this.id, this.password)
            .then(() => {
              this.addToast(
                ToastService.createToast("password.reset.success", "success")
              );
              this.$router.push("/login");
            })
            .catch((err) => {
              if (err.response.status === 404) {
                this.addToast(
                  ToastService.createToast(
                    "password.reset.wrong-email",
                    "error"
                  )
                );
              } else {
                this.addToast(
                  ToastService.createToast("password.reset.error", "error")
                );
              }
            });
        } else {
          this.addToast(
            ToastService.createToast(
              "password.reset.password-mismatch",
              "error"
            )
          );
        }
      }
    },
  },
};
</script>
