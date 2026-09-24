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
        <template v-if="tenant">
          <span class="onboarding-page__dot grey--text">·</span>
          <span class="text-body-2 grey--text text--darken-2">
            {{ $t("booking.page.tenant", { name: tenant.name }) }}
          </span>
        </template>
      </div>
    </template>

    <v-skeleton-loader v-if="loading" type="article, list-item-three-line" />
    <v-alert v-else-if="loadFailed" type="error" text data-test="load-failed">
      {{ $t("tenant.onboarding.load-failed") }}
    </v-alert>

    <div v-else class="onboarding-page__body">
      <div class="onboarding-page__main">
        <OnboardingPath :entries="stepEntries" :value="step" @input="goTo" />

        <OnboardingTenantStep
          v-if="step === 'tenant'"
          :tenant="tenant"
          :prefill="contactPrefill"
          :in-progress="inProgress"
          :error="tenantError"
          :verification-mail="verificationMail"
          :verification-limit="verificationLimit"
          @submit="createTenant"
          @resend-verification="resendVerification"
          @sso-login="ssoLogin"
          @continue="goTo('offer')"
        />
        <OnboardingOfferStep
          v-else-if="step === 'offer'"
          :key="bookable ? bookable.id : 'new'"
          :bookable="bookable"
          :in-progress="inProgress"
          :save-failed="offerSaveFailed"
          @submit="saveOffer"
          @back="goTo('tenant')"
        />
        <div v-else-if="step === 'setup'" data-test="setup-step">
          <v-card outlined class="section-card onboarding-page__card">
            <v-card-title class="section-header">
              <v-icon>mdi-tune-variant</v-icon>
              <span>{{ $t("tenant.onboarding.setup.title") }}</span>
            </v-card-title>
            <v-divider />
            <v-card-text>
              <p class="onboarding-page__lead">
                {{ $t("tenant.onboarding.setup.intro") }}
              </p>
              <OnboardingSetupLinks
                :paid="paid"
                return-step="setup"
                :bookable-id="bookable.id"
              />
              <p class="onboarding-page__fine mb-0">
                {{ $t("tenant.onboarding.setup.defaults") }}
              </p>
            </v-card-text>
          </v-card>
          <div class="onboarding-actions">
            <v-btn text @click="goTo('offer')" data-test="setup-back">
              <v-icon left small>mdi-arrow-left</v-icon>
              {{ $t("tenant.onboarding.back") }}
            </v-btn>
            <v-btn
              color="primary"
              depressed
              @click="goTo('overview')"
              data-test="setup-continue"
            >
              {{ $t("tenant.onboarding.setup.continue") }}
            </v-btn>
          </div>
        </div>
        <OnboardingOverviewStep
          v-else
          ref="overview"
          :tenant="tenant"
          :bookable="bookable"
          :in-progress="inProgress"
          :complete-failed="completeFailed"
          @complete="complete"
          @edit-offer="goTo('offer')"
          @back="goTo('setup')"
          @exit="exit"
        />
      </div>

      <OnboardingPanel
        class="onboarding-page__panel"
        :tenant="tenant"
        :bookable="bookable"
        :level="level"
      />
    </div>
  </AdminLayout>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiAuthService from "@/services/api/ApiAuthService";
import Bookable from "@/entities/bookable";
import Tenant from "@/entities/tenant";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import OnboardingPath from "@/components/Tenant/Onboarding/OnboardingPath.vue";
import OnboardingPanel from "@/components/Tenant/Onboarding/OnboardingPanel.vue";
import OnboardingTenantStep from "@/components/Tenant/Onboarding/OnboardingTenantStep.vue";
import OnboardingOfferStep from "@/components/Tenant/Onboarding/OnboardingOfferStep.vue";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";
import OnboardingOverviewStep from "@/components/Tenant/Onboarding/OnboardingOverviewStep.vue";
import {
  ONBOARDING_PATH,
  SUPERVISION_LEVELS,
  WIZARD_STEPS,
  applyOfferForm,
  contactPrefill,
  findCreatedTenant,
  startStep,
  storedChoices,
  tenantCreationError,
} from "@/utils/tenantOnboarding";
import { rateLimitOf } from "@/utils/rateLimit";

/**
 * The guided setup: tenant, first bookable, optional setup, overview. Every
 * step saves through the regular API, so leaving keeps what was saved, and a
 * resume (`?tenant=`) loads the current data.
 *
 * Drawn as the booking page is: the progress as a headline over its path,
 * the step's form in section cards, and beside it a sticky panel with the
 * facts the run has saved so far.
 */
export default {
  name: "TenantOnboarding",
  components: {
    AdminLayout,
    OnboardingPath,
    OnboardingPanel,
    OnboardingTenantStep,
    OnboardingOfferStep,
    OnboardingSetupLinks,
    OnboardingOverviewStep,
  },
  data() {
    return {
      loading: true,
      loadFailed: false,
      inProgress: false,
      step: "tenant",
      tenant: null,
      bookable: null,
      initialLevel: null,
      tenantError: null,
      verificationMail: null,
      verificationLimit: null,
      offerSaveFailed: false,
      completeFailed: false,
    };
  },
  computed: {
    ...mapGetters({ user: "user/getUser" }),
    /** Before the creation: the level the new tenant is about to start at. */
    level() {
      return this.tenant ? this.tenant.supervisionLevel : this.initialLevel;
    },
    paid() {
      return storedChoices(this.bookable).priceChoice === "paid";
    },
    contactPrefill() {
      return contactPrefill(this.user);
    },
    /** The path's segments: what each step holds, and whether it can be opened. */
    stepEntries() {
      const done = {
        tenant: !!this.tenant,
        offer: !!this.bookable,
        setup: false,
        overview: this.bookable?.isPublic === true,
      };
      const reachable = {
        tenant: true,
        offer: !!this.tenant,
        setup: !!this.bookable,
        overview: !!this.bookable,
      };
      return WIZARD_STEPS.map((step) => ({
        step,
        reachable: reachable[step],
        state:
          step === this.step ? "current" : done[step] ? "done" : "upcoming",
        label: this.$t(`tenant.onboarding.steps.${step}.label`),
        hint: this.$t(
          `tenant.onboarding.steps.${step}.hint-${done[step] ? "done" : "open"}`
        ),
      }));
    },
  },
  async mounted() {
    try {
      const tenantId = this.$route.query.tenant;
      if (tenantId) {
        await this.loadTenant(tenantId);
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
     * again, whose link leads back to this setup after the login.
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
     * provider; the SSO login returns to this setup.
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
    async loadTenant(tenantId) {
      const [tenantResponse, bookablesResponse] = await Promise.all([
        ApiTenantService.getTenant(tenantId),
        ApiBookablesService.getBookables(tenantId, false),
      ]);
      this.tenant = tenantResponse.data;
      await this.selectTenant(tenantId);

      const bookables = bookablesResponse.data || [];
      const wanted = this.$route.query.bookable;
      // Events stay in the regular administration, their tickets with them.
      const candidates = bookables.filter((bookable) => !bookable.eventId);
      this.bookable =
        candidates.find((bookable) => bookable.id === wanted) ||
        candidates[0] ||
        null;

      // Back from the legal or payment form: the run continues where it
      // left. Any other entry resumes at the bookable.
      const returnStep = this.$route.query.step;
      const returning =
        this.bookable && ["setup", "overview"].includes(returnStep);
      this.step = returning ? returnStep : startStep({ tenant: this.tenant });
    },
    goTo(step) {
      this.step = step;
      this.$el.querySelector(".admin-page__body--scroll")?.scrollTo(0, 0);
    },
    exit() {
      this.$router.push({ name: "dashboard" });
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
        this.tenant = (await ApiTenantService.getTenant(created.id)).data;
        // The navigation refreshes the user, whose permissions now carry the
        // new tenant, and makes the run resumable by its address.
        await this.$router.replace({ query: { tenant: created.id } });
        this.goTo("offer");
      } catch (error) {
        this.tenantError = tenantCreationError(error);
      } finally {
        this.inProgress = false;
      }
    },
    async saveOffer(form) {
      this.inProgress = true;
      this.offerSaveFailed = false;
      try {
        const next = applyOfferForm(this.bookable || new Bookable(), form);
        const response = await ApiBookablesService.createOrUpdateBookable(
          next,
          this.tenant.id
        );
        this.bookable = response.data;
        this.goTo("setup");
      } catch (error) {
        console.error(error);
        this.offerSaveFailed = true;
      } finally {
        this.inProgress = false;
      }
    },
    /**
     * The closing action stores the publication wish. The backend submits a
     * first wish for review on its own, at every level (supervision spec
     * §6.1); a missing payment setup does not stand in the way.
     */
    async complete() {
      this.inProgress = true;
      this.completeFailed = false;
      try {
        const response = await ApiBookablesService.createOrUpdateBookable(
          { ...this.bookable, isPublic: true, isBookable: true },
          this.tenant.id
        );
        this.bookable = response.data;
        this.$refs.overview?.reloadReadiness();
      } catch (error) {
        console.error(error);
        this.completeFailed = true;
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
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 4px;
}

/* Two columns as the booking page draws them: the steps in the wide
   column, the run's facts in a sticky panel beside them. */
.onboarding-page__body {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
}

.onboarding-page__main {
  flex: 1;
  min-width: 0;
  max-width: 880px;
}

.onboarding-page__panel {
  width: var(--scb-panel-width);
  flex: none;
  position: sticky;
  top: 0;
  margin-bottom: var(--scb-gap-cards);
}

.onboarding-page__card {
  margin-bottom: var(--scb-gap-cards);
}

.onboarding-page__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.onboarding-page__fine {
  margin-top: var(--scb-space-4);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-caption);
}

/* $scb-bp-md / $scb-bp-sm / $scb-bp-xs of tokens.scss. */
@media (max-width: 1264px) {
  .onboarding-page__panel {
    width: var(--scb-panel-width-narrow);
  }
}

@media (max-width: 959px) {
  .onboarding-page__body {
    flex-direction: column;
    align-items: stretch;
  }
  .onboarding-page__panel {
    width: 100%;
    position: static;
  }
}

@media (max-width: 599px) {
  .onboarding-page__dot {
    display: none;
  }
}
</style>

<style>
/* The step footers and the sectioned forms the step components share; the
   selectors are the wizard's own, so the sheet is plain (not scoped). */
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

.onboarding-page .onboarding-actions__note {
  flex: 1 1 100%;
  margin: 0;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-caption);
}

.onboarding-page .section-card .v-card__text {
  padding: var(--scb-section-body-padding);
}

.onboarding-page .section-card .v-card__text > p:last-child {
  margin-bottom: 0;
}
</style>
