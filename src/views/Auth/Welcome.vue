<template>
  <AuthPage title="Herzlich willkommen!" icon="mdi-email-outline">
    <div class="scb-form">
      <p class="scb-form__note mb-0">
        Vielen Dank für Ihre Registrierung. Falls die Adresse noch nicht
        bestätigt ist, haben wir Ihnen eine E-Mail gesendet, um Ihre
        Registrierung abzuschließen.
      </p>
      <v-btn
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
        @click="login"
      >
        Zum Login
      </v-btn>
    </div>
  </AuthPage>
</template>

<script>
import AuthPage from "@/components/Auth/AuthPage.vue";

export default {
  name: "Welcome",
  components: { AuthPage },

  props: {
    tenantId: String,
  },

  data() {
    return {
      websiteLink: "",
    };
  },

  methods: {
    login() {
      this.$router.push("/login");
    },
  },
};
</script>
