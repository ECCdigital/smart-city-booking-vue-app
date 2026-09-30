<template>
  <AuthPage title="Passwort-Bestätigung" icon="mdi-lock-check-outline">
    <div class="scb-form">
      <p class="scb-form__note mb-0">
        Ihr Passwort wurde erfolgreich zurückgesetzt.
      </p>
      <v-btn
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
        @click="login"
      >
        Weiter zum Login
      </v-btn>
    </div>
  </AuthPage>
</template>

<script>
import AuthPage from "@/components/Auth/AuthPage.vue";

export default {
  name: "PasswordConfirmed",
  components: { AuthPage },
  data() {
    return {};
  },
  methods: {
    login() {
      this.$router.push("/login");
    },
  },
};
</script>
