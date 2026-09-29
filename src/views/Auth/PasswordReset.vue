<template>
  <AuthPage title="Passwort zurücksetzen" icon="mdi-lock-reset">
    <v-form
      ref="form"
      v-model="valid"
      lazy-validation
      class="reset-form"
      @submit.prevent="resetPassword"
    >
      <p class="reset-form__note mb-4">
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
      <div class="reset-form__row mt-4">
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
        class="reset-form__submit mt-4"
      >
        Passwort zurücksetzen
      </v-btn>

      <p class="reset-form__back mt-4 mb-0">
        <router-link :to="{ name: 'login' }" class="reset-form__link">
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

<style scoped>
.reset-form {
  padding: var(--scb-section-body-padding);
  padding-top: var(--scb-space-5);
}

.reset-form__note {
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.reset-form__row {
  display: flex;
  gap: var(--scb-space-4);
}

.reset-form__row > * {
  flex: 1 1 0;
  min-width: 0;
}

.reset-form__submit {
  text-transform: none;
}

.reset-form__back {
  text-align: center;
  font-size: var(--scb-font-size-md);
}

.reset-form__link {
  font-weight: var(--scb-font-weight-medium);
  text-decoration: none;
}

/* $scb-bp-xs of tokens.scss; a scoped style cannot read it. */
@media (max-width: 599px) {
  .reset-form__row {
    flex-direction: column;
    gap: var(--scb-space-4);
  }
}
</style>
