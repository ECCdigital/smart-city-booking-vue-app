<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text class="pa-8">
        <v-img :src="appLogo" max-width="200" class="mx-auto mb-6" />

        <v-icon color="success" size="72" class="mb-4">
          mdi-check-circle
        </v-icon>

        <h2 class="mb-3">Karte erfolgreich verknüpft</h2>

        <p class="subtitle-2 mb-2">
          Ihre Karte wurde erfolgreich mit Ihrem Account verknüpft.
        </p>

        <p class="body-2 mb-6">
          Ab sofort können Sie sich direkt mit Ihrer Karte anmelden – ohne
          Passwort.
        </p>

        <v-btn color="primary" elevation="0" large :to="{ name: 'login' }">
          <v-icon left>mdi-login</v-icon>
          Zur Anmeldung
        </v-btn>
      </v-card-text>

      <v-card-text class="text-center">
        <ContactInformation class="px-6" />
      </v-card-text>
    </v-card>

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <router-link to="/datenschutz">Datenschutz</router-link>
        |
        <router-link to="/nutzungsbedingungen">
          Nutzungsbedingungen
        </router-link>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import ContactInformation from "@/components/ContactInformation.vue";

export default {
  name: "CardLinkSuccess",
  components: { ContactInformation },

  computed: {
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
    },
  },
};
</script>
