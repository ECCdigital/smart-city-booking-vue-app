<template>
  <div>
    <v-container class="pt-15 text-center">
      <v-icon size="75" class="mb-5" color="primary">mdi-email</v-icon>
      <h1>Herzlich wollkommen!</h1>
      <p class="lead">Vielen Dank, dass Sie einen Account erstellt haben. Wir haben Ihnen eine E-Mail gesendet, um ihre Regisrierung abzuschließen.</p>

      <v-btn v-if="websiteLink" :href="websiteLink" color="primary" elevation="0" class="mt-10">Zurück zur Website</v-btn><br />
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
import {mapGetters} from "vuex";

export default {
  name: "Welcome",

  computed: {
    ...mapGetters({
      tenant: "tenants/tenant",
    }),
    websiteLink() {
      let websiteLink = ""
      if (this.tenant.website && !this.tenant.website.startsWith("http")) {
        websiteLink = "https://" + this.tenant.website;
      } else {
        websiteLink = this.tenant.website;
      }
      return websiteLink;
    }
  },

  methods: {
    login() {
      this.$router.push("/login");
    }
  }
}
</script>

<style scoped>

</style>
