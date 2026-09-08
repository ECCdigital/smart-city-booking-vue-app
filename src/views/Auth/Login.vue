<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text class="text-center">
        <v-img :src="appLogo" max-width="200" class="mx-auto" />

        <h2 class="mt-8 mb-2">Anmeldung</h2>
        <p class="subtitle-2 mb-10">Mit Ihrem Account anmelden.</p>

        <div
          v-if="checkingSharedSession"
          class="d-flex flex-column align-center py-6"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="40"
            width="3"
          />
          <span class="text-body-2 grey--text mt-3">
            Sitzung wird geprüft…
          </span>
        </div>

        <LoginCard
          v-else
          :sso-active="ssoActive"
          :card-methods="cardMethods"
          @success="signedIn"
        />

        <ContactInformation />
      </v-card-text>
    </v-card>

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <a :href="dataProtectionHref" target="_blank"> Datenschutz </a>
        |
        <a :href="legalNoticeHref" target="_blank"> Nutzungsbedingungen </a>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ContactInformation from "@/components/ContactInformation.vue";
import { legalDocumentHref } from "@/utils/instanceLegalDocuments";
import LoginCard from "@/components/Auth/LoginCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";
import { isBffAuthMode } from "@/services/auth/authMode";

export default {
  components: {
    LoginCard,
    ContactInformation,
  },

  data() {
    return {
      cardMethods: [],
      checkingSharedSession: false,
    };
  },

  computed: {
    dataProtectionHref() {
      return legalDocumentHref(this.instance?.dataProtection?.url);
    },
    legalNoticeHref() {
      return legalDocumentHref(this.instance?.legalNotice?.url);
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
    async fetchCardMethods() {
      try {
        this.cardMethods = await ApiAuthService.getCardAuthMethods();
      } catch {
        this.cardMethods = [];
      }
    },
    /**
     * Shared session (Phase 4): if Storefront (or Admin) already set cookies,
     * skip the login form and continue into the app.
     */
    async resumeSharedSessionIfPresent() {
      if (!isBffAuthMode()) return false;
      // Do not interrupt explicit SSO error returns
      if (this.$route.query.error) return false;
      // After logout (incl. Keycloak IdP round-trip) skip the probe
      if (sessionStorage.getItem("bffJustLoggedOut") === "1") {
        sessionStorage.removeItem("bffJustLoggedOut");
        return false;
      }

      this.checkingSharedSession = true;
      try {
        const response = await Promise.race([
          ApiAuthService.me(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Shared session check timeout")),
              4000
            )
          ),
        ]);
        if (response?.data) {
          await this.updateUser(response.data);
          this.signedIn();
          return true;
        }
      } catch {
        // No shared cookie session / timeout — show login form
      } finally {
        this.checkingSharedSession = false;
      }
      return false;
    },
  },

  async mounted() {
    const next = this.$route.query.next;
    this.updateNextUrl(next || null);
    const resumed = await this.resumeSharedSessionIfPresent();
    if (!resumed) {
      this.fetchCardMethods();
    }
  },
};
</script>
