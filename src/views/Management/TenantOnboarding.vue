<template>
  <AdminLayout>
    <p class="text--secondary">{{ $t("tenant.onboarding.intro") }}</p>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-alert v-else-if="loadFailed" type="error" text data-test="load-failed">
      {{ $t("tenant.onboarding.load-failed") }}
    </v-alert>
    <v-row v-else>
      <v-col cols="12" md="3">
        <v-list dense nav class="pa-0" data-test="wizard-steps">
          <v-list-item
            v-for="(entry, index) in stepEntries"
            :key="entry.step"
            :disabled="!entry.reachable"
            :input-value="entry.step === step"
            color="primary"
            @click="goTo(entry.step)"
            :data-test="`wizard-step-${entry.step}`"
          >
            <v-list-item-content>
              <v-list-item-title>
                {{ index + 1 }}. {{ entry.label }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ entry.hint }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-col>
      <v-col cols="12" md="9">
        <v-card outlined class="pa-6">
          <OnboardingSupervisionNotice :level="level" />

          <OnboardingTenantStep
            v-if="step === 'tenant'"
            :tenant="tenant"
            :prefill="contactPrefill"
            :in-progress="inProgress"
            :error="tenantError"
            @submit="createTenant"
            @continue="goTo('offer')"
            @exit="exit"
          />
          <OnboardingOfferStep
            v-else-if="step === 'offer'"
            :key="bookable ? bookable.id : 'new'"
            :bookable="bookable"
            :in-progress="inProgress"
            :save-failed="offerSaveFailed"
            @submit="saveOffer"
            @exit="exit"
          />
          <div v-else-if="step === 'setup'" data-test="setup-step">
            <h2 class="text-h5 mb-1">
              {{ $t("tenant.onboarding.setup.title") }}
            </h2>
            <p class="text--secondary">
              {{ $t("tenant.onboarding.setup.intro") }}
            </p>
            <OnboardingSetupLinks
              :paid="paid"
              return-step="setup"
              :bookable-id="bookable.id"
            />
            <v-alert type="info" text dense class="mt-4">
              {{ $t("tenant.onboarding.setup.defaults") }}
            </v-alert>
            <div class="d-flex flex-wrap mt-6" style="gap: 12px">
              <v-btn
                color="primary"
                @click="goTo('overview')"
                data-test="setup-continue"
              >
                {{ $t("tenant.onboarding.setup.continue") }}
              </v-btn>
              <v-btn outlined @click="exit">
                {{ $t("tenant.onboarding.exit") }}
              </v-btn>
            </div>
          </div>
          <OnboardingOverviewStep
            v-else
            ref="overview"
            :tenant="tenant"
            :bookable="bookable"
            :choices-confirmed="choicesConfirmed"
            :in-progress="inProgress"
            :complete-failed="completeFailed"
            @complete="complete"
            @edit-offer="goTo('offer')"
            @exit="exit"
          />
        </v-card>
      </v-col>
    </v-row>
  </AdminLayout>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import Bookable from "@/entities/bookable";
import Tenant from "@/entities/tenant";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import OnboardingTenantStep from "@/components/Tenant/Onboarding/OnboardingTenantStep.vue";
import OnboardingOfferStep from "@/components/Tenant/Onboarding/OnboardingOfferStep.vue";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";
import OnboardingOverviewStep from "@/components/Tenant/Onboarding/OnboardingOverviewStep.vue";
import {
  SUPERVISION_LEVELS,
  WIZARD_STEPS,
  applyOfferForm,
  contactPrefill,
  findCreatedTenant,
  startStep,
  storedChoices,
  tenantCreationError,
} from "@/utils/tenantOnboarding";
import {
  confirmChoices,
  hasConfirmedChoices,
  resetConfirmedChoices,
} from "@/utils/tenantOnboardingRun";

/**
 * The guided setup: tenant, first bookable, optional setup, overview. Every
 * step saves through the regular API, so leaving keeps what was saved, and a
 * resume (`?tenant=`) loads the current data.
 */
export default {
  name: "TenantOnboarding",
  components: {
    AdminLayout,
    OnboardingSupervisionNotice,
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
      choicesConfirmed: false,
      tenantError: null,
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
    }),
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
      // left. Any other entry resumes at the bookable, where price and
      // availability are confirmed again.
      const returnStep = this.$route.query.step;
      const returning =
        this.bookable &&
        hasConfirmedChoices(this.bookable.id) &&
        ["setup", "overview"].includes(returnStep);
      this.choicesConfirmed = !!returning;
      this.step = returning ? returnStep : startStep({ tenant: this.tenant });
    },
    goTo(step) {
      this.step = step;
      window.scrollTo(0, 0);
    },
    exit() {
      resetConfirmedChoices();
      this.$router.push({ name: "dashboard" });
    },
    async createTenant(form) {
      this.inProgress = true;
      this.tenantError = null;
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
        confirmChoices(this.bookable.id);
        this.choicesConfirmed = true;
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
      if (!this.choicesConfirmed) return;
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
