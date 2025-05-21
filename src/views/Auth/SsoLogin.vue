<script>
import KeycloakCard from "@/components/Auth/KeycloakCard.vue";
import ContactInformation from "@/components/ContactInformation.vue";

export default {
  name: "SsoLogin",
  components: { ContactInformation, KeycloakCard },
};
</script>

<template>
  <div class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-15">
      <v-card-text>
        <v-img
          src="/app-logo.png"
          max-width="200"
          class="mx-auto mt-4"
        />
        <h2 class="mt-8 mb-2">Mit Keycloak anmelden</h2>
      </v-card-text>
      <KeycloakCard />
      <v-card-text class="text-center">
        <ContactInformation class="px-6" />
      </v-card-text>
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

<style scoped></style>
