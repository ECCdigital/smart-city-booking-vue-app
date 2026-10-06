<script>
import AuthPage from "@/components/Auth/AuthPage.vue";
import KeycloakCard from "@/components/Auth/KeycloakCard.vue";

export default {
  name: "SsoLogin",
  components: { AuthPage, KeycloakCard },
};
</script>

<template>
  <AuthPage title="Mit Keycloak anmelden" icon="mdi-domain">
    <KeycloakCard />
  </AuthPage>
</template>
