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
      class="pa-4 rounded-sm"
      style="overflow: hidden; width: 100%; min-width: 350px; max-width: 500px"
    >
      <v-card-text class="text-center">
        <v-img src="/app-logo.png" max-width="150" class="mb-4 mx-auto" />

        <h2 class="mt-8 mb-2">{{ $t("invitation.title") }}</h2>

        <div v-if="!isLoggedIn">
          <p class="subtitle-2 mb-10">{{ $t("invitation.subtitle") }}</p>
          <p>{{ $t("invitation.login_required") }}</p>
          <v-btn
            color="primary"
            elevation="0"
            block
            class="mt-4"
            :to="{ name: 'login', query: { next: currentPath } }"
          >
            {{ $t("invitation.login_button") }}
          </v-btn>
        </div>

        <div v-else-if="isVerifying">
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
          <p class="mt-4">{{ $t("invitation.verifying") }}</p>
        </div>

        <div v-else-if="isAccepted">
          <v-alert type="success">
            {{ $t("invitation.accepted") }}
          </v-alert>
          <v-btn
            color="primary"
            elevation="0"
            block
            class="mt-4"
            :to="{ name: 'dashboard' }"
          >
            {{ $t("invitation.continue_button") }}
          </v-btn>
        </div>

        <div v-else-if="isVerified">
          <v-alert v-if="verificationError" type="error" class="mb-4">
            {{ verificationError }}
          </v-alert>
          <div v-else>
            <p>
              Sie wurden eingeladen dem Mandanten
              <strong>{{ tenantName }}</strong> beizutreten. Wollen Sie die
              Einladung annehmen?
            </p>
          </div>

          <v-btn
            v-if="!verificationError"
            color="primary"
            elevation="0"
            block
            class="mt-4"
            @click="acceptInvitation"
            :loading="isAccepting"
          >
            {{ $t("invitation.accept_button") }}
          </v-btn>
        </div>

        <ContactInformation />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ContactInformation from "@/components/ContactInformation.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ToastService from "@/services/ToastService";

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
      verificationError: null,
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
    }),
    async verifyInvitation() {
      if (!this.token || !this.tenantId) {
        this.verificationError = this.$t("invitation.error.invalid_params");
        this.isVerified = true;
        return;
      }

      this.isVerifying = true;
      try {
        const response = await ApiTenantService.verifyInvitation(
          this.tenantId,
          this.token
        );
        this.tenantName = response.data?.tenantName;
        this.isVerified = true;
        this.verificationError = null;
      } catch (error) {
        console.error("Verification error:", error);
        this.verificationError =
          error.response?.data?.message ||
          this.$t("invitation.error.verification_failed");
        this.isVerified = true;
      } finally {
        this.isVerifying = false;
      }
    },
    async acceptInvitation() {
      this.isAccepting = true;
      try {
        await ApiTenantService.acceptInvitation(this.tenantId, this.token);
        this.isAccepted = true;
        this.addToast(
          ToastService.createToast("invitation.success.accepted", "success")
        );
      } catch (error) {
        console.error("Acceptance error:", error);
        this.addToast(
          ToastService.createToast(
            "invitation.error.acceptance_failed",
            "error"
          )
        );
      } finally {
        this.isAccepting = false;
      }
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
