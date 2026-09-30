<template>
  <AuthPage title="Einladung" icon="mdi-account-multiple-plus-outline">
    <div class="scb-form">
      <template v-if="!isLoggedIn">
        <p class="scb-form__note mb-0">
          Um die Einladung anzunehmen, bitte zuerst anmelden oder ein Konto
          erstellen.
        </p>
        <v-btn
          color="primary"
          block
          elevation="0"
          class="scb-form__submit mt-4"
          :to="{ name: 'login', query: { next: currentPath } }"
        >
          Anmelden
        </v-btn>
        <p class="scb-form__switch mt-4 mb-0">
          <span class="text--secondary">Noch kein Konto?</span>
          <router-link
            :to="{ name: 'register', query: { next: currentPath } }"
            class="scb-form__link"
          >
            Konto erstellen
          </router-link>
        </p>
      </template>

      <div v-else-if="isVerifying" class="d-flex flex-column align-center py-4">
        <v-progress-circular
          indeterminate
          color="primary"
          size="40"
          width="3"
        />
        <span class="scb-form__note mt-3">Einladung wird überprüft…</span>
      </div>

      <template v-else-if="pendingApproval">
        <p class="scb-form__note mb-0">
          Ihre Einladung wurde angenommen und wartet auf die Genehmigung durch
          einen Administrator.
        </p>
        <v-btn
          color="primary"
          block
          elevation="0"
          class="scb-form__submit mt-4"
          :to="{ name: 'dashboard' }"
        >
          Fortfahren
        </v-btn>
      </template>

      <template v-else-if="isAccepted">
        <p class="scb-form__note mb-0">Einladung erfolgreich angenommen.</p>
        <v-btn
          color="primary"
          block
          elevation="0"
          class="scb-form__submit mt-4"
          :to="{ name: 'dashboard' }"
        >
          Fortfahren
        </v-btn>
      </template>

      <template v-else-if="isVerified">
        <template v-if="verificationError">
          <v-alert type="error" text dense class="mb-0">
            {{ verificationError }}
          </v-alert>
          <v-btn
            v-if="errorCode === 403"
            color="primary"
            block
            elevation="0"
            class="scb-form__submit mt-4"
            @click="onChangeUser"
          >
            Mit anderem Benutzer anmelden
          </v-btn>
        </template>

        <template v-else>
          <p class="scb-form__note mb-0">
            Sie wurden eingeladen, dem Mandanten
            <strong>{{ tenantName }}</strong> beizutreten. Möchten Sie die
            Einladung annehmen oder ablehnen?
          </p>
          <v-btn
            color="primary"
            block
            elevation="0"
            class="scb-form__submit mt-4"
            :loading="isAccepting"
            :disabled="isRejecting"
            @click="acceptInvitation"
          >
            Einladung annehmen
          </v-btn>
          <v-btn
            color="error"
            outlined
            block
            elevation="0"
            class="mt-3"
            :loading="isRejecting"
            :disabled="isAccepting"
            @click="rejectInvitation"
          >
            Einladung ablehnen
          </v-btn>
        </template>
      </template>
    </div>
  </AuthPage>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AuthPage from "@/components/Auth/AuthPage.vue";
import ToastService from "@/services/ToastService";
import ApiInvitationService from "@/services/api/ApiInvitationService";
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  components: {
    AuthPage,
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
        const response = await ApiInvitationService.acceptInvitation(
          this.tenantId,
          this.token
        );
        this.isAccepted = true;
        this.pendingApproval = response.data?.pendingApproval || false;
        await this.addToast(
          ToastService.createToast("invitation.success.accepted", "success")
        );
      } catch (error) {
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
