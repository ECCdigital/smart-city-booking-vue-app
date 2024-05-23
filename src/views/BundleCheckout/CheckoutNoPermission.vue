<script>
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  name: "CheckoutNoPermission",

  props: {
    tenant: {
      type: String,
      required: true,
    },
  },

  methods: {
    signOut() {
      ApiAuthService.logout(this.tenant).then((response) => {
        if (response.status === 200) {
          this.$emit("sign-out");

        }
      });
    },
  },
};
</script>

<template>
  <div class="text-center">
    <v-alert type="error" icon="mdi-alert" border="left" elevation="2">
      <span>Sie sind nicht berechtigt, dieses Objekt zu buchen.</span>
    </v-alert>


    <v-btn
      class="mt-12"
      outlined elevation="0"
      @click="signOut"
    >
      <v-icon left small>mdi-arrow-left</v-icon>
      Mit einem anderen Konto anmelden

    </v-btn>
  </div>
</template>

<style scoped></style>
