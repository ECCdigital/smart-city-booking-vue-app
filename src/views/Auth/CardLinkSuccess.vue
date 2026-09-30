<template>
  <AuthPage
    title="Karte erfolgreich verknüpft"
    icon="mdi-card-account-details-outline"
  >
    <div class="scb-form">
      <p class="scb-form__note mb-0">
        Ihre Karte wurde erfolgreich mit Ihrem Account verknüpft. Ab sofort
        können Sie sich direkt mit Ihrer Karte anmelden – ohne Passwort.
      </p>
      <v-btn
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
        :to="{ name: 'login' }"
      >
        Zur Anmeldung
      </v-btn>
    </div>
  </AuthPage>
</template>

<script>
import AuthPage from "@/components/Auth/AuthPage.vue";

export default {
  name: "CardLinkSuccess",
  components: { AuthPage },
};
</script>
