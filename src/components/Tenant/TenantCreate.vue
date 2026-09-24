<template>
  <v-dialog
    :value="open"
    persistent
    max-width="720"
    content-class="onboarding-page tenant-create"
  >
    <!-- Recreated on every opening: the form starts empty again. -->
    <OnboardingTenantStep
      v-if="open"
      dialog
      :title="$t('tenant.list.create-dialog.title')"
      :intro="$t('tenant.list.create-dialog.intro')"
      :prefill="prefill"
      :in-progress="inProgress"
      :error="error"
      :verification-mail="verificationMail"
      :verification-limit="verificationLimit"
      @submit="create"
      @cancel="closeDialog"
      @resend-verification="resendVerification"
      @sso-login="ssoLogin"
    >
      <template #notice>
        <OnboardingSupervisionNotice :level="initialLevel" />
      </template>
    </OnboardingTenantStep>
  </v-dialog>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiAuthService from "@/services/api/ApiAuthService";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import OnboardingTenantStep from "@/components/Tenant/Onboarding/OnboardingTenantStep.vue";
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import Tenant from "@/entities/tenant";
import { contactPrefill, tenantCreationError } from "@/utils/tenantOnboarding";
import { rateLimitOf } from "@/utils/rateLimit";

/** Where a verification mail or an SSO sign-in leads back to. */
const RETURN_PATH = "/instance/mandanten";

/**
 * The short creation dialog: the first step of the guided setup, drawn as
 * the guided setup draws it, with the same creation contract (name, contact
 * person and a valid mail required; contact prefilled from the account; a
 * refused creation explained). It ends with the creation - the offers come
 * later, in the tenant's own pages.
 */
export default {
  name: "TenantCreate",
  components: { OnboardingTenantStep, OnboardingSupervisionNotice },
  props: {
    open: { type: Boolean, required: true },
  },
  data() {
    return {
      inProgress: false,
      error: null,
      initialLevel: null,
      verificationMail: null,
      verificationLimit: null,
    };
  },
  computed: {
    ...mapGetters({ user: "user/getUser" }),
    /** The contact starts as the account's and stays editable (spec §9). */
    prefill() {
      return contactPrefill(this.user);
    },
  },
  watch: {
    open(val) {
      if (val) {
        this.error = null;
        this.verificationMail = null;
        this.verificationLimit = null;
        this.loadInitialLevel();
      }
    },
  },
  methods: {
    ...mapActions({ setNextUrl: "authStore/setNextUrl" }),
    closeDialog() {
      this.$emit("close");
    },
    /**
     * A self-created tenant starts at the instance's Startstufe, so the
     * dialog announces it before the creation. The instance owner's tenant
     * always starts free, and an unreadable level must not block the form.
     */
    async loadInitialLevel() {
      this.initialLevel = null;
      if (TenantPermissionService.isInstanceOwner()) return;
      try {
        const instance = await ApiInstanceService.getPublicInstance();
        this.initialLevel = instance?.tenantInitialSupervisionLevel || null;
      } catch (e) {
        this.initialLevel = null;
      }
    },
    async create(form) {
      this.inProgress = true;
      this.error = null;
      try {
        await ApiTenantService.createTenant(new Tenant(form));
        this.closeDialog();
      } catch (e) {
        // Limit, unproven account mail, tenant maximum or a named field.
        this.error = tenantCreationError(e);
      } finally {
        this.inProgress = false;
      }
    },
    /** A local account without verification proof: its mail again. */
    async resendVerification() {
      this.verificationMail = "sending";
      this.verificationLimit = null;
      try {
        await ApiAuthService.resendVerification(this.user.id, RETURN_PATH);
        this.verificationMail = "sent";
      } catch (error) {
        console.error(error);
        this.verificationLimit = rateLimitOf(error);
        this.verificationMail = "failed";
      }
    },
    /** An SSO account gains its proof at a sign-in through its provider. */
    async ssoLogin() {
      await this.setNextUrl(RETURN_PATH);
      this.$router.push({ name: "sso" });
    },
  },
};
</script>

<style>
/* The dialog is the step's card; the card's own margin and the dialog's
   rounding would otherwise stack. The selector is the dialog's own. */
.tenant-create.v-dialog {
  border-radius: var(--scb-radius-surface);
}

.tenant-create .onboarding-step__card {
  margin-bottom: 0;
}
</style>
