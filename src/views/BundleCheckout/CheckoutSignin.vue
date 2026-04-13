<template>
  <div>
    <v-form>
      <div v-if="me" class="d-flex mb-5">
        <v-btn v-if="showBack" outlined small @click="back">
          <v-icon left small>mdi-arrow-left</v-icon>
          Zurück
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn class="px-10" color="primary" small @click="submit" :disabled="!me">
          Weiter
          <v-icon right small>mdi-arrow-right</v-icon>
        </v-btn>
      </div>

      <v-card v-if="me" class="signed-in-card rounded-sm" outlined>
        <div class="signed-in-banner primary">
          <v-avatar size="64" color="white" class="elevation-3">
            <v-icon size="36" color="primary">mdi-account</v-icon>
          </v-avatar>
        </div>
        <v-card-text class="text-center pt-10 pb-6 px-6">
          <h2 class="text-h6 font-weight-bold mb-1">
            {{ me.firstName }} {{ me.lastName }}
          </h2>
          <p class="text-caption grey--text mb-4">
            {{ me.id }}
          </p>
          <v-chip small color="success" outlined>
            <v-icon left x-small>mdi-check-circle</v-icon>
            Angemeldet
          </v-chip>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4 justify-center">
          <v-btn text small color="grey" @click="signOut(false)">
            <v-icon left small>mdi-account-switch</v-icon>
            Benutzer wechseln
          </v-btn>
        </v-card-actions>
      </v-card>

      <div
        v-else
        class="d-flex align-center justify-center"
        style="min-height: 80vh"
      >
        <v-card class="login-card rounded-sm" outlined>
          <div class="login-banner primary">
            <v-avatar size="56" color="white" class="elevation-3">
              <v-icon size="30" color="primary">mdi-login-variant</v-icon>
            </v-avatar>
            <h2 class="text-h6 font-weight-bold white--text mt-3">
              Anmeldung erforderlich
            </h2>
            <p class="text-caption white--text mt-1" style="opacity: 0.8">
              Bitte melden Sie sich an, um fortzufahren.
            </p>
          </div>
          <div class="pa-6">
            <LoginCard
              :tenant="tenant"
              :sso-active="ssoActive"
              @success="onSuccess"
              style="max-width: 100%"
            />
          </div>
        </v-card>
      </div>
    </v-form>
  </div>
</template>

<script>
import ApiAuthService from "@/services/api/ApiAuthService";
import { mapActions, mapGetters } from "vuex";
import LoginCard from "@/components/Auth/LoginCard.vue";

export default {
  name: "CheckoutSignin",
  components: { LoginCard },

  data() {
    return {
      id: null,
      password: null,
    };
  },

  emits: ["login"],

  props: {
    tenantId: {
      type: String,
      required: true,
    },
    me: {
      type: Object,
    },
    showBack: {
      type: Boolean,
      default: true,
    },
    showSubmitGuest: {
      type: Boolean,
      default: true,
    },
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),

    submit() {
      this.$emit("submit");
    },

    back() {
      this.$emit("back");
    },

    async signOut(submit) {
      try {
        await ApiAuthService.logout();
        this.$emit("update-me");
        if (submit) {
          this.submit();
        }
      } catch (error) {
        console.error("Logout error:", error);
      }
    },
    onSuccess() {
      this.$emit("login");
    },
  },
  computed: {
    ...mapGetters({
      tenant: "tenants/currentTenant",
      user: "user/getUser",
      instance: "instance/instance",
    }),
    ssoActive() {
      return !!this.instance?.applications.find(
        (app) => app.id === "keycloak" && app.active
      );
    },
  },
};
</script>

<style scoped>
.signed-in-card {
  max-width: 400px;
  margin: 0 auto;
  overflow: hidden;
}

.signed-in-banner {
  height: 100px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 0;
  position: relative;
}

.signed-in-banner .v-avatar {
  position: absolute;
  bottom: -32px;
}

.signed-in-card .v-card__text {
  padding-top: 44px !important;
}

.login-card {
  width: 520px;
  max-width: 100vw;
  overflow: hidden;
}

.login-banner {
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
</style>
