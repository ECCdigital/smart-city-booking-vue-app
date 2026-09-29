<template>
  <div>
    <v-container class="pt-15 text-center">
      <v-icon size="75" class="mb-5" color="primary">mdi-email</v-icon>
      <h1>Herzlich willkommen!</h1>
      <p class="lead">Vielen Dank für Ihre Registrierung. Falls die Adresse noch nicht registriert ist, haben wir Ihnen eine E-Mail gesendet, um Ihre Registrierung abzuschließen.</p>
      <v-btn
        text
        color="primary"
        class="mt-3"
        @click="login"
      >
      Zum Login
      </v-btn>
    </v-container>
  </div>
</template>

<script>

export default {
  name: "Welcome",

  props: {
    tenantId: String
  },

  data() {
    return {
      websiteLink: ""
    };
  },

  methods: {
    login() {
      this.$router.push("/login");
    },
  },
}
</script>

<style scoped>

</style>
