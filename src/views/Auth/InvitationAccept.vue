<template>
  <v-container class="invite-page d-flex align-center justify-center">
    <v-card
      class="pa-8 rounded-xl elevation-6 invite-card"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 750px"
    >
      <v-card-text class="text-center px-6 px-sm-10">
        <v-img
          :src="appLogo"
          max-width="120"
          contain
          alt="App Logo"
          class="mb-6 mx-auto"
        />

        <h2 class="mb-1 font-weight-bold">Einladung</h2>

        <div class="subtitle-2 text--secondary mb-6">
          Beitreten und sofort loslegen
        </div>

        <div v-if="!isLoggedIn">
          <v-alert
            type="info"
            dense
            text
            border="left"
            colored-border
            class="mb-6"
          >
            Um die Einladung anzunehmen, bitte zuerst anmelden oder ein Konto
            erstellen.
          </v-alert>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-btn
                color="primary"
                elevation="2"
                large
                block
                class="mt-2"
                :to="{ name: 'login', query: { next: currentPath } }"
                aria-label="Zur Anmeldung"
              >
                <v-icon left>mdi-login</v-icon>
                Anmelden
              </v-btn>
            </v-col>
            <v-col cols="12" sm="6">
              <v-btn
                color="secondary"
                elevation="2"
                outlined
                large
                block
                class="mt-2"
                :to="{ name: 'register', query: { next: currentPath } }"
                aria-label="Zur Registrierung"
              >
                <v-icon left>mdi-account-plus</v-icon>
                Konto erstellen
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <div v-else-if="isVerifying">
          <v-progress-circular
            indeterminate
            size="40"
            color="primary"
          ></v-progress-circular>
          <p class="mt-4">Einladung wird überprüft...</p>
        </div>

        <div v-else-if="pendingApproval">
          <v-alert type="info" border="left" elevation="2" colored-border>
            Ihre Einladung wurde angenommen und wartet auf die Genehmigung durch
            einen Administrator.
          </v-alert>
          <v-btn
            color="primary"
            elevation="2"
            block
            large
            class="mt-6"
            :to="{ name: 'dashboard' }"
          >
            <v-icon left>mdi-arrow-right</v-icon>
            Fortfahren
          </v-btn>
        </div>

        <div v-else-if="isAccepted">
          <v-alert type="success" border="left" elevation="2" colored-border>
            Einladung erfolgreich angenommen
          </v-alert>
          <v-btn
            color="primary"
            elevation="2"
            block
            large
            class="mt-6"
            :to="{ name: 'dashboard' }"
          >
            <v-icon left>mdi-arrow-right</v-icon>
            Fortfahren
          </v-btn>
        </div>

        <div v-else-if="isVerified">
          <div v-if="verificationError">
            <v-alert type="error" text colored-border border="left"  class="mb-4">
              {{ verificationError }}
            </v-alert>
            <v-btn
              v-if="errorCode === 403"
              color="primary"
              elevation="2"
              block
              large
              class="mt-6"
              @click="onChangeUser"
              aria-label="Mit anderem Benutzer anmelden"
            >
              <v-icon left>mdi-login</v-icon>
              Mit anderem Benutzer anmelden
            </v-btn>
          </div>

          <div v-else>
            <p class="mb-6">
              Sie wurden eingeladen dem Mandanten
              <strong>{{ tenantName }}</strong> beizutreten.
              <br />
              Möchten Sie die Einladung annehmen oder ablehnen?
            </p>
          </div>

          <v-row v-if="!verificationError" dense>
            <v-col cols="6">
              <v-btn
                color="success"
                elevation="2"
                block
                large
                @click="acceptInvitation"
                :loading="isAccepting"
                :disabled="isRejecting"
                aria-label="Einladung annehmen"
              >
                <v-icon left>mdi-check</v-icon>
                Einladung annehmen
              </v-btn>
            </v-col>
            <v-col cols="6">
              <v-btn
                color="error"
                elevation="2"
                block
                large
                @click="rejectInvitation"
                :loading="isRejecting"
                :disabled="isAccepting"
                aria-label="Einladung ablehnen"
              >
                <v-icon left>mdi-close</v-icon>
                Einladung ablehnen
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-8"></v-divider>
        <ContactInformation class="mt-4" />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ContactInformation from "@/components/ContactInformation.vue";
import ToastService from "@/services/ToastService";
import ApiInvitationService from "@/services/api/ApiInvitationService";
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  components: {
    ContactInformation,
  },
  data() {
    return {
      tenantName: null,
      isVerifying: false,
      isVerified: false,
      isAccepting: false,
      isAccepted: false,
      isRejecting: false,
      isRejected: false,
      pendingApproval: false,
      verificationError: null,
      errorMessage: {
        400: this.$t("invitation.error.invalid_params"),
        403: this.$t("invitation.error.forbidden"),
        404: this.$t("invitation.error.not_found"),
        410: this.$t("invitation.error.expired"),
        423: this.$t("invitation.error.membership_suspended"),
      },
      errorCode: null,
    };
  },
  computed: {
    ...mapGetters({
      instance: "instance/instance",
      user: "user/getUser",
    }),
    isLoggedIn() {
      return !!this.user;
    },
    tenantId() {
      return this.$route.params.tenantId;
    },
    token() {
      return this.$route.query.token;
    },
    currentPath() {
      return this.$route.fullPath;
    },
    appLogo() {
      return process.env.BASE_URL + "/app-logo.png";
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      deleteUser: "user/delete",
    }),
    async verifyInvitation() {
      this.errorCode = null;
      this.verificationError = null;
      this.isVerifying = false;
      this.isVerified = false;
      this.isAccepting = false;
      this.isAccepted = false;
      this.isRejecting = false;
      this.isRejected = false;
      if (!this.token || !this.tenantId) {
        this.verificationError = this.$t("invitation.error.invalid_params");
        this.isVerified = true;
        return;
      }

      this.isVerifying = true;
      try {
        const response = await ApiInvitationService.verifyInvitation(
          this.tenantId,
          this.token
        );
        this.tenantName = response.data?.tenantName;
        this.isVerified = true;
        this.verificationError = null;
      } catch (error) {
        this.verificationError =
          error.response?.status && this.errorMessage[error.response.status]
            ? this.errorMessage[error.response.status]
            : this.$t("invitation.error.verification_failed");
        this.errorCode = error.response?.status || null;
        this.isVerified = true;
      } finally {
        this.isVerifying = false;
      }
    },
    async acceptInvitation() {
      this.isAccepting = true;
      try {
        const response = await ApiInvitationService.acceptInvitation(this.tenantId, this.token);
        console.log("Acceptance response:", response);
        this.isAccepted = true;
        this.pendingApproval = response.data?.pendingApproval || false;
        await this.addToast(
          ToastService.createToast("invitation.success.accepted", "success")
        );
      } catch (error) {
        console.error("Acceptance error:", error);
        await this.addToast(
          ToastService.createToast(
            "invitation.error.acceptance_failed",
            "error"
          )
        );
      } finally {
        this.isAccepting = false;
      }
    },
    async rejectInvitation() {
      this.isRejecting = true;
      try {
        await ApiInvitationService.rejectInvitation(this.tenantId, this.token);
        this.isRejected = true;
        await this.addToast(
          ToastService.createToast("invitation.success.rejected", "info")
        );
        await this.$router.push({ name: "dashboard" });
      } catch (error) {
        console.error("Rejection error:", error);
        await this.addToast(
          ToastService.createToast("invitation.error.declining_failed", "error")
        );
      } finally {
        this.isRejecting = false;
      }
    },
    async onChangeUser() {
      await ApiAuthService.logout();
      await this.deleteUser();

      await this.$router.push({
        name: "login",
        query: { next: this.currentPath },
      });
    },
  },
  watch: {
    isLoggedIn(newValue) {
      if (newValue && !this.isVerified && !this.isVerifying) {
        this.verifyInvitation();
      }
    },
  },
  mounted() {
    if (this.isLoggedIn) {
      this.verifyInvitation();
    }
  },
};
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  padding: 24px;
}

.invite-card {
  backdrop-filter: saturate(1.1) blur(2px);
}

@media (max-width: 600px) {
  .invite-card {
    padding: 20px !important;
  }
}

.text--secondary {
  opacity: 0.85;
}
</style>
