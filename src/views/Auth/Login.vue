<template>
  <AuthPage active="login">
    <div
      v-if="checkingSharedSession"
      class="d-flex flex-column align-center py-8"
    >
      <v-progress-circular indeterminate color="primary" size="40" width="3" />
      <span class="text-body-2 text--secondary mt-3">
        Sitzung wird geprüft…
      </span>
    </div>

    <LoginCard
      v-else
      :sso-active="ssoActive"
      :card-methods="cardMethods"
      hide-register-link
      @success="signedIn"
    />
  </AuthPage>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AuthPage from "@/components/Auth/AuthPage.vue";
import LoginCard from "@/components/Auth/LoginCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";
import { isBffAuthMode } from "@/services/auth/authMode";
import { isSafeInternalRedirect } from "@/utils/safeRedirect";

export default {
  components: {
    AuthPage,
    LoginCard,
  },

  data() {
    return {
      cardMethods: [],
      checkingSharedSession: false,
    };
  },

  computed: {
    ...mapGetters({
      instance: "instance/instance",
      nextUrl: "authStore/nextUrl",
    }),
    ssoActive() {
      return (this.instance?.applications || []).some(
        (app) => app.id === "keycloak" && app.active
      );
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
      const next = this.nextUrl;
      this.updateNextUrl(null);
      if (isSafeInternalRedirect(next, this.$router)) {
        this.$router.push(next);
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
