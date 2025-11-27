<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text class="text-center">
        <v-img :src="appLogo" max-width="200" class="mx-auto" />

        <h2 class="mt-8 mb-2">Anmeldung</h2>
        <p class="subtitle-2 mb-10">Mit Ihrem Account anmelden.</p>

        <LoginCard :ssoActive="ssoActive" @success="signedIn" />

        <ContactInformation />
      </v-card-text>
    </v-card>

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <a
          :href="'https://' + Utils.sanitizeUrl(instance?.dataProtectionUrl)"
          target="_blank"
          >Datenschutz</a
        >
        |
        <a
          :href="'https://' + Utils.sanitizeUrl(instance?.legalNoticeUrl)"
          target="_blank"
          >Nutzungsbedingungen</a
        >
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import ContactInformation from "@/components/ContactInformation.vue";
import Utils from "@/utils/Utils";
import LoginCard from "@/components/Auth/LoginCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  components: {
    LoginCard,
    ContactInformation,
  },
  data() {
    return {
      id: "",
      tenant: {},
      password: "",
      showPassword: false,
      loginSuccessful: false,
      tenants: [],
    };
  },

  computed: {
    Utils() {
      return Utils;
    },
    ...mapGetters({
      instance: "instance/instance",
      nextUrl: "authStore/nextUrl",
    }),
    ssoActive() {
      return (this.instance?.applications || []).some(
        (app) => app.id === "keycloak" && app.active
      );
    },
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
    },
    async hasSession() {
      const me = await ApiAuthService.me().catch(() => null);
      return me !== null;
    },
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
      updateUser: "user/update",
      updateTenant: "tenants/update",
      updateNextUrl: "authStore/setNextUrl",
    }),
    signedIn() {
      if (this.nextUrl) {
        this.$router.push(this.nextUrl);
        this.updateNextUrl(null);
      } else {
        this.$router.push({ name: "dashboard" });
      }
    },
    sso() {
      this.$router.push({ name: "sso" });
    },
  },
  async mounted() {
    const next = this.$route.query.next;
    if (next) {
      await this.updateNextUrl(next);
    } else {
      await this.updateNextUrl(null);
    }
    if (await this.hasSession) {
      this.signedIn();
    }
  },
};
</script>
