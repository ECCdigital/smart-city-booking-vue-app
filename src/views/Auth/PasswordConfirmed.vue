<template>
  <v-container class="text-center  fill-height fluid justify-center">
    <v-card outlined class="text-center">
      <v-card-text>
        <v-img src="/app-logo.png" max-width="200" class="mx-auto"/>
        <h2 class="mt-8 mb-2">Passwort-Bestätigung</h2>
        <v-alert
          type="success"
          border="left"
          colored-border
          elevation="2"
          class="mb-4"
        >
          Ihr Passwort wurde erfolgreich zurückgesetzt.
        </v-alert>
        <v-btn
          color="primary"
          class="white--text"
          @click="login"
        >
          Weiter zum Login
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "PasswordConfirmed",
  components: {  },
  data() {
    return {
    }
  },
  methods: {
    login() {
      this.$router.push("/login");
    }
  },
}
</script>

<style scoped>

</style>
