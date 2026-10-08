<template>
  <AdminLayout scroll-body class="onboarding-page">
    <template #page-header>
      <div class="onboarding-page__toolbar">
        <v-btn
          text
          small
          class="onboarding-page__exit px-0"
          data-test="exit"
          @click="exit"
        >
          <v-icon left small>mdi-arrow-left</v-icon>
          {{ $t("tenant.onboarding.exit") }}
        </v-btn>
      </div>
    </template>

    <v-skeleton-loader v-if="loading" type="article, list-item-three-line" />
    <v-alert v-else-if="loadFailed" type="error" text data-test="load-failed">
      {{ $t("tenant.onboarding.load-failed") }}
    </v-alert>

    <div v-else class="onboarding-page__main">
      <OnboardingTenantStep
        :tenant="tenant"
        :prefill="contactPrefill"
        :in-progress="inProgress"
        :error="tenantError"
        :verification-mail="verificationMail"
        :verification-limit="verificationLimit"
        @submit="createTenant"
        @resend-verification="resendVerification"
        @sso-login="ssoLogin"
        @continue="toFirstBookable"
      >
        <template #notice>
          <OnboardingSupervisionNotice :level="level" />
        </template>
      </OnboardingTenantStep>
    </div>
  </AdminLayout>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiAuthService from "@/services/api/ApiAuthService";
import Tenant from "@/entities/tenant";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import OnboardingTenantStep from "@/components/Tenant/Onboarding/OnboardingTenantStep.vue";
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import {
  ONBOARDING_PATH,
  SUPERVISION_LEVELS,
  contactPrefill,
  findCreatedTenant,
  firstBookableRoute,
  tenantCreationError,
} from "@/utils/tenantOnboarding";
import { rateLimitOf } from "@/utils/rateLimit";

/**
 * The onboarding of a new tenant (ECCdigital/tickets#326): only what the
 * tenant needs, and the tenant is created - done, whatever comes after. The
 * first bookable follows in the guided bookable flow, which may be skipped.
 * The supervision is as before: the level the tenant starts at is shown
 * before and after the creation, and the way on is open at every level.
 *
 * `?tenant=` shows a created tenant, with the way on to its first bookable.
 */
export default {
  name: "TenantOnboarding",
  components: {
    AdminLayout,
    OnboardingTenantStep,
    OnboardingSupervisionNotice,
  },
  data() {
    return {
      loading: true,
      loadFailed: false,
      inProgress: false,
      tenant: null,
      initialLevel: null,
      tenantError: null,
      verificationMail: null,
      verificationLimit: null,
    };
  },
  computed: {
    ...mapGetters({ user: "user/getUser" }),
    /** Before the creation: the level the new tenant is about to start at. */
    level() {
      return this.tenant ? this.tenant.supervisionLevel : this.initialLevel;
    },
    contactPrefill() {
      return contactPrefill(this.user);
    },
  },
  async mounted() {
    try {
      const tenantId = this.$route.query.tenant;
      if (tenantId) {
        this.tenant = (await ApiTenantService.getTenant(tenantId)).data;
        await this.selectTenant(tenantId);
      } else {
        await this.loadInitialLevel();
      }
    } catch (error) {
      console.error(error);
      this.loadFailed = true;
    } finally {
      this.loading = false;
    }
  },
  methods: {
    ...mapActions({
      selectTenant: "tenants/select",
      setTenants: "tenants/setTenants",
      setNextUrl: "authStore/setNextUrl",
    }),
    /**
     * A local account without verification proof: its verification mail
     * again, whose link leads back to this page after the login.
     */
    async resendVerification() {
      this.verificationMail = "sending";
      this.verificationLimit = null;
      try {
        await ApiAuthService.resendVerification(this.user.id, ONBOARDING_PATH);
        this.verificationMail = "sent";
      } catch (error) {
        console.error(error);
        this.verificationLimit = rateLimitOf(error);
        this.verificationMail = "failed";
      }
    },
    /**
     * An SSO account gains its proof at a sign-in through its identity
     * provider; the SSO login returns to this page.
     */
    async ssoLogin() {
      await this.setNextUrl(ONBOARDING_PATH);
      this.$router.push({ name: "sso" });
    },
    /**
     * The instance owner's tenants always start free; every other creation
     * starts at the instance's initial level (supervision spec §2).
     */
    async loadInitialLevel() {
      if (TenantPermissionService.isInstanceOwner()) {
        this.initialLevel = SUPERVISION_LEVELS.FREE;
        return;
      }
      const instance = await ApiInstanceService.getPublicInstance();
      this.initialLevel = instance?.tenantInitialSupervisionLevel || null;
    },
    exit() {
      this.$router.push({ name: "dashboard" });
    },
    toFirstBookable() {
      this.$router.push(firstBookableRoute({ onboarding: true }));
    },
    async createTenant(form) {
      this.inProgress = true;
      this.tenantError = null;
      this.verificationMail = null;
      try {
        const before = (await ApiTenantService.getTenants(true)).data;
        await ApiTenantService.createTenant(new Tenant(form));
        const after = (await ApiTenantService.getTenants(true)).data;
        await this.setTenants(after);

        const created = findCreatedTenant(before, after, form.name);
        if (!created) {
          this.tenantError = { key: "not-found" };
          return;
        }
        await this.selectTenant(created.id);
        // The navigation refreshes the user, whose permissions now carry
        // the new tenant; the flow then creates its first bookable.
        this.toFirstBookable();
      } catch (error) {
        this.tenantError = tenantCreationError(error);
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>

<style scoped>
.onboarding-page__toolbar {
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.onboarding-page__main {
  max-width: 720px;
  margin: 0 auto;
}
</style>

<style>
/* The step footer and the sectioned form of the tenant step; the selectors
   are the page's own, so the sheet is plain (not scoped). */
.onboarding-page .onboarding-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--scb-space-3);
  margin: var(--scb-space-2) 0 var(--scb-gap-cards);
}

.onboarding-page .onboarding-actions > :only-child {
  margin-left: auto;
}

.onboarding-page .section-card .v-card__text {
  padding: var(--scb-section-body-padding);
}

.onboarding-page .section-card .v-card__text > p:last-child {
  margin-bottom: 0;
}
</style>
