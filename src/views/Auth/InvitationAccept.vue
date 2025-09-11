<template>
  <v-container
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    "
  >
    <v-card
      class="pa-6 rounded-lg elevation-4"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 750px"
    >
      <v-card-text class="text-center">
        <v-img src="/app-logo.png" max-width="120" class="mb-6 mx-auto" />

        <h2 class="mb-2 font-weight-bold">
          {{ $t("invitation.title") }}
        </h2>

        <div v-if="!isLoggedIn">
          <p class="subtitle-2 text--secondary mb-6">
            {{ $t("invitation.subtitle") }}
          </p>
          <v-alert type="info" outlined dense>
            {{ $t("invitation.login_required") }}
          </v-alert>
          <v-btn
            color="primary"
            elevation="2"
            block
            large
            class="mt-6"
            :to="{ name: 'login', query: { next: currentPath } }"
          >
            <v-icon left>mdi-login</v-icon>
            {{ $t("invitation.login_button") }}
          </v-btn>
        </div>

        <div v-else-if="isVerifying">
          <v-progress-circular
            indeterminate
            size="40"
            color="primary"
          ></v-progress-circular>
          <p class="mt-4">{{ $t("invitation.verifying") }}</p>
        </div>

        <div v-else-if="isAccepted">
          <v-alert type="success" border="left" colored-border>
            {{ $t("invitation.accepted.title") }}
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
            {{ $t("invitation.continue_button") }}
          </v-btn>
        </div>

        <div v-else-if="isVerified">
          <div v-if="verificationError">
            <v-alert type="error" class="mb-4">
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
            >
              <v-icon left>mdi-login</v-icon>
              {{ $t("invitation.login_different_user") }}
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
              >
                <v-icon left>mdi-check</v-icon>
                {{ $t("invitation.accept_button") }}
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
              >
                <v-icon left>mdi-close</v-icon>
                {{ $t("invitation.reject_button") || "Ablehnen" }}
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <ContactInformation class="mt-10" />
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
      verificationError: null,
      errorMessage: {
        400: this.$t("invitation.error.invalid_params"),
        403: this.$t("invitation.error.forbidden"),
        404: this.$t("invitation.error.not_found"),
        410: this.$t("invitation.error.expired"),
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
        await ApiInvitationService.acceptInvitation(this.tenantId, this.token);
        this.isAccepted = true;
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
