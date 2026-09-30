<template>
  <AuthPage title="Email-Bestätigung" icon="mdi-email-check-outline">
    <div class="scb-form">
      <p class="scb-form__note mb-0">
        Ihre Email-Adresse wurde erfolgreich bestätigt.
      </p>
      <v-btn
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
        @click="login"
      >
        Weiter zum Login
      </v-btn>
    </div>
  </AuthPage>
</template>

<script>
import AuthPage from "@/components/Auth/AuthPage.vue";
import { isSafeInternalRedirect } from "@/utils/safeRedirect";

export default {
  name: "EmailVerify",
  components: { AuthPage },
  data() {
    return {
      nextUrl: null,
    };
  },
  methods: {
    login() {
      this.$router.push(
        isSafeInternalRedirect(this.nextUrl, this.$router)
          ? { name: "login", query: { next: this.nextUrl } }
          : { name: "login" }
      );
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
