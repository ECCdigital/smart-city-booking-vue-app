<template>
  <div>
    <v-form>
      <div v-if="me" class="d-flex mb-5">
        <v-btn v-if="showBack" outlined small @click="back">
          <v-icon left small>mdi-arrow-left</v-icon>
          Zurück
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" small @click="submit" :disabled="!me">
          Weiter
          <v-icon right small>mdi-arrow-right</v-icon></v-btn
        >
      </div>

      <h2 v-if="me" class="mb-8">Anmeldung</h2>

      <v-toolbar v-if="me" flat color="primary" dark class="mb-8">
        <div class="text-subtitle-1 d-flex align-center justify-center">
          <v-icon left>mdi-account</v-icon>
          <div>
            Angemeldet als:
            <strong>{{ me.firstName }} {{ me.lastName }}</strong>
          </div>
        </div>

        <v-spacer></v-spacer>
        <v-btn text @click="signOut(false)">Benutzer wechseln</v-btn>
      </v-toolbar>
      <div v-else class="d-flex align-center justify-center" style="height: 100vh">
        <v-card outlined class="rounded-sm pa-5">
          <LoginCard
            :tenant="tenant"
            :sso-active="ssoActive"
            @success="onSuccess"
            style="width: 520px; max-width: 100vw"
          >
          </LoginCard>
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

    signOut(submit) {
      ApiAuthService.logout().then((response) => {
        if (response.status === 200) {
          this.$emit("update-me");

          if (submit) {
            this.submit();
          }
        }
      });
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

<style scoped></style>
