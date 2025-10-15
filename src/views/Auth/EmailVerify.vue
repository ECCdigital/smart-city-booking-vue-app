<template>
  <v-container class="text-center fill-height fluid justify-center">
    <v-card outlined class="text-center">
      <v-card-text>
        <v-img :src="appLogo" max-width="200" class="mx-auto" />
        <h2 class="mt-8 mb-2">Email-Bestätigung</h2>
        <v-alert
          type="success"
          border="left"
          colored-border
          elevation="2"
          class="mb-4"
        >
          Ihre Email-Adresse wurde erfolgreich bestätigt.
        </v-alert>
        <v-btn color="primary" class="white--text" @click="login">
          Weiter zum Login
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "EmailVerify",
  components: {},
  data() {
    return {
      nextUrl: null,
    };
  },
  computed: {
    appLogo() {
      return process.env.BASE_URL + "/app-logo.png";
    },
  },
  methods: {
    login() {
      this.$router.push({ name: "login", query: { next: this.nextUrl } });
    },
  },
  mounted() {
    const next = this.$route.query.next;
    if (next) {
      this.nextUrl = next;
    }
  },
};
</script>

<style scoped></style>
