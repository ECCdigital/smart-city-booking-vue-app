<template>
  <div class="page-content" ref="contentCol">
    <v-form ref="rootForm" v-model="validRoot">
      <v-progress-linear :active="isLoading" indeterminate color="primary" />

      <div class="d-flex align-center mb-2">
        <div>
          <div class="text--secondary">
            ID: {{ tenant?.id }} • {{ tenant?.name || "Unbenannt" }}
          </div>
        </div>
        <v-spacer />
        <v-chip
          v-if="hasUnsavedChanges"
          color="warning"
          text-color="black"
          small
          class="mr-2"
          label
        >
          Ungespeicherte Änderungen
        </v-chip>
      </div>

      <v-row>
        <v-col class="col-12 col-md-auto">
          <v-tabs
            v-model="activeTab"
            color="primary"
            show-arrows
            :vertical="$vuetify.breakpoint.mdAndUp"
          >
            <v-tab
              v-for="t in visibleTabs"
              :key="t.key"
              class="d-flex justify-start"
              style="text-transform: none"
            >
              <v-icon left small>{{ t.icon }}</v-icon>
              {{ t.label }}
            </v-tab>
          </v-tabs></v-col
        >
        <v-col class="col-12 col-md-9">
          <keep-alive>
            <component
              :is="currentComponent"
              ref="activeChild"
              :tenant="tenant"
              :apps="apps"
              :workflow="workflow"
              :roles="roles"
              :challenges="verificationChallenges"
              :instance-custom-fields="instanceCustomFields"
              :has-unsaved-changes="hasUnsavedChanges"
              @update:tenant="onUpdateTenant"
              @update:apps="onUpdateApps"
              @update:workflow="onUpdateWorkflow"
              @update:challenges="onUpdateChallenges"
              @open-receipt-template="openReceiptTemplate"
              @open-invoice-template="openInvoiceTemplate"
              @open-cancellation-template="openCancellationTemplate"
            />
          </keep-alive>
        </v-col>
      </v-row>
    </v-form>

    <SaveBar
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      @submit="submitChanges"
      @cancel="fetchTenant"
      show-restore
      :disabled="inProgress || isLoading || !validRoot || hasUnsavedChanges"
      :in-progress="inProgress"
    />

    <ReceiptTemplateDialog
      :open="showEditTemplateDialog"
      :receipt-template="tenant.receiptTemplate"
      @close="showEditTemplateDialog = false"
      @submit="onSubmitReceiptTemplate"
    />
    <InvoiceTemplateDialog
      :open="showEditInvoiceTemplateDialog"
      :invoice-template="tenant.invoiceTemplate"
      @close="showEditInvoiceTemplateDialog = false"
      @submit="onSubmitInvoiceTemplate"
    />
    <CancellationTemplateDialog
      :open="showEditCancellationTemplateDialog"
      :cancellation-template="tenant.cancellationTemplate"
      @close="showEditCancellationTemplateDialog = false"
      @submit="onSubmitCancellationTemplate"
    />
  </div>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import { mapActions, mapGetters } from "vuex";

import TenantEditGeneral from "@/components/Tenant/Edit/TenantEditGeneral.vue";
import TenantEditWeb from "@/components/Tenant/Edit/TenantEditWeb.vue";
import TenantEditEmail from "@/components/Tenant/Edit/TenantEditEmail.vue";
import TenantEditPayments from "@/components/Tenant/Edit/TenantEditPayments.vue";
import TenantEditBooking from "@/components/Tenant/Edit/TenantEditBooking.vue";
import TenantEditEvents from "@/components/Tenant/Edit/TenantEditEvents.vue";
import TenantEditWorkflow from "@/components/Tenant/Edit/TenantEditWorkflow.vue";
import TenantEditVerificationChallenges from "@/components/Tenant/Edit/TenantEditVerificationChallenges.vue";
import TenantEditCatalog from "@/components/Tenant/Edit/TenantEditCatalog.vue";

import ReceiptTemplateDialog from "@/components/Tenant/ReceiptTemplateDialog.vue";
import InvoiceTemplateDialog from "@/components/Tenant/InvoiceTemplateDialog.vue";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiChallengeService from "@/services/api/ApiChallengeService";
import SaveBar from "@/components/commons/SaveBar.vue";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import TenantEditBookables from "@/components/Tenant/Edit/TenantEditBookables.vue";
import CancellationTemplateDialog from "@/components/Tenant/CancellationTemplateDialog.vue";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import {
  createLockAndAccessAppDefaults,
  withoutUnchangedSecrets,
} from "@/utilities/access-apps";

export default {
  name: "TenantOverview",
  components: {
    CancellationTemplateDialog,
    SaveBar,
    TenantEditGeneral,
    TenantEditWeb,
    TenantEditEmail,
    TenantEditPayments,
    TenantEditBooking,
    TenantEditEvents,
    TenantEditWorkflow,
    ReceiptTemplateDialog,
    InvoiceTemplateDialog,
    TenantEditVerificationChallenges,
    TenantEditCatalog,
    TenantEditBookables,
  },
  data() {
    return {
      isLoading: false,
      inProgress: false,
      validRoot: true,
      activeTab: 0,
      roles: [],
      tabs: [
        {
          key: "general",
          label: "Allgemein",
          icon: "mdi-home",
          comp: "TenantEditGeneral",
        },
        { key: "web", label: "Web", icon: "mdi-web", comp: "TenantEditWeb" },
        {
          key: "email",
          label: "E-Mail",
          icon: "mdi-email",
          comp: "TenantEditEmail",
        },
        {
          key: "payments",
          label: "Zahlungen",
          icon: "mdi-credit-card",
          comp: "TenantEditPayments",
        },
        {
          key: "bookables",
          label: "Buchungsobjekte",
          icon: "mdi-calendar-check",
          comp: "TenantEditBookables",
        },
        {
          key: "booking",
          label: "Buchung",
          icon: "mdi-calendar",
          comp: "TenantEditBooking",
        },
        {
          key: "events",
          label: "Events",
          icon: "mdi-calendar-multiselect",
          comp: "TenantEditEvents",
        },
        {
          key: "workflow",
          label: "Workflow",
          icon: "mdi-chart-tree",
          comp: "TenantEditWorkflow",
        },
        {
          key: "verification",
          label: "Verifikation",
          icon: "mdi-check-decagram",
          comp: "TenantEditVerificationChallenges",
        },
        {
          key: "catalogs",
          label: "Kataloge",
          icon: "mdi-book-open-page-variant",
          comp: "TenantEditCatalog",
        },
      ],
      instanceCustomFields: [],
      originalSnapshot: null,
      tenant: {},
      apps: {},
      workflow: {
        active: false,
        states: [],
        archive: [],
        eventStateMapping: {
          onCommit: "",
          onReject: "",
          onPay: "",
          onCreate: "",
        },
      },
      verificationChallenges: [],
      showEditTemplateDialog: false,
      showEditInvoiceTemplateDialog: false,
      showEditCancellationTemplateDialog: false,
      defaultApps: {
        giroCockpit: {
          type: "payment",
          id: "giroCockpit",
          title: "S-Public Services",
          paymentMerchantId: "",
          paymentProjectId: "",
          paymentSecret: "",
          paymentPurposeSuffix: "",
          active: false,
        },
        pmPayment: {
          type: "payment",
          id: "pmPayment",
          title: "pmPayment",
          paymentMerchantId: "",
          paymentProjectId: "",
          paymentSecret: "",
          paymentMode: "",
          active: false,
        },
        ePayBL: {
          type: "payment",
          id: "ePayBL",
          title: "ePayBL",
          baseUrl: "",
          merchantId: "",
          managerId: "",
          budgetAccount: "",
          objectNumber: "",
          paymentMethods: [],
          clientP12: "",
          certPassphrase: "",
          active: false,
        },
        invoice: {
          type: "payment",
          id: "invoice",
          title: "Rechnung",
          bank: "",
          iban: "",
          bic: "",
          accountHolder: "",
          daysUntilPaymentDue: null,
          active: false,
        },
        ...createLockAndAccessAppDefaults(),
      },
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    hasUnsavedChanges() {
      return (
        JSON.stringify({
          tenant: this.tenant,
          apps: this.apps,
          workflow: this.workflow,
          verificationChallenges: this.verificationChallenges,
        }) !== this.originalSnapshot
      );
    },
    visibleTabs() {
      return this.tabs.filter((tab) => this.isTabVisible(tab));
    },
    currentComponent() {
      return this.visibleTabs[this.activeTab]?.comp || "TenantEditGeneral";
    },
  },
  watch: {
    activeTab(newIndex) {
      const tabKey = this.visibleTabs[newIndex]?.key;
      if (!tabKey) return;
      if (this.$route.query.tab === tabKey) return;
      this.$router.replace({
        query: { ...this.$route.query, tab: tabKey },
      });
    },
    tenantId: {
      async handler() {
        await this.fetchTenant();
        await this.fetchRoles();
      },
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    isTabVisible(tab) {
      if (!tab.permission) return true;
      if (tab.permission === "manageTenants") {
        return TenantPermissionService.allowUpdate(this.tenant);
      }
      return true;
    },
    async fetchRoles() {
      try {
        const response = await ApiRolesService.getTenantRoles(true);
        this.roles = response.data || [];
      } catch (e) {
        console.error(e);
      }
    },
    async fetchTenant() {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.getTenant(this.tenantId);
        this.tenant = response.data || {};
        this.initializeApps();
        await this.fetchWorkflow();
        await this.fetchChallenges();
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
      this.$nextTick(() => {
        this.originalSnapshot = JSON.stringify({
          tenant: this.tenant,
          apps: this.apps,
          workflow: this.workflow,
          verificationChallenges: this.verificationChallenges,
          catalog: this.catalog,
        });
      });
    },
    resetCurrentValidation() {
      const ref = this.$refs.activeChild;
      if (ref?.resetValidation) ref.resetValidation();
    },
    initializeApps() {
      const existing = this.tenant.applications || [];
      const map = {};
      Object.keys(this.defaultApps).forEach((k) => {
        const found = existing.find((a) => a.id === k);
        map[k] = found ? { ...found } : { ...this.defaultApps[k] };
      });
      // Die Zugangs- und Schließsystem-Apps werden unter "Zutritt &
      // Schließsysteme" gepflegt; hier werden sie nur unverändert
      // mitgespeichert.
      this.apps = map;
    },
    replaceApps() {
      this.tenant.applications = Object.values(this.apps).map(
        withoutUnchangedSecrets
      );
    },
    async fetchWorkflow() {
      const data = await ApiWorkflowService.getWorkflow(this.tenant.id);
      this.workflow = data?.id
        ? data
        : {
          active: false,
          states: [],
          archive: [],
          description: "",
          name: "",
          eventStateMapping: "",
          tenantId: this.tenant.id,
        };
    },
    async fetchChallenges() {
      try {
        const response = await ApiChallengeService.getChallenges(
          this.tenant.id
        );
        this.verificationChallenges = response.data || [];
      } catch (e) {
        console.error(e);
      }
    },
    onUpdateTenant(next) {
      this.tenant = { ...this.tenant, ...next };
    },
    onUpdateApps(next) {
      this.apps = { ...this.apps, ...next };
    },
    onUpdateWorkflow(next) {
      this.workflow = { ...this.workflow, ...next };
    },
    onUpdateChallenges(next) {
      this.verificationChallenges = next;
    },
    async validateActiveChild() {
      const ref = this.$refs.activeChild;
      if (ref && typeof ref.validate === "function") {
        return await ref.validate();
      }
      return true;
    },
    async submitChanges() {
      const ok = await this.validateActiveChild();
      if (!ok) {
        setTimeout(() => {
          const ref = this.$refs.activeChild;
          if (ref && typeof ref.resetValidation === "function") {
            ref.resetValidation();
          }
        }, 4000);
        return;
      }

      this.replaceApps();
      this.inProgress = true;

      try {
        if (
          JSON.stringify(this.tenant) !==
          JSON.stringify(JSON.parse(this.originalSnapshot).tenant)
        ) {
          await ApiTenantService.submitTenant(this.tenant);
        }

        if (
          JSON.stringify(this.workflow) !==
          JSON.stringify(JSON.parse(this.originalSnapshot).workflow)
        ) {
          if (this.workflow.id) {
            this.workflow = await ApiWorkflowService.updateWorkflow(
              this.workflow,
              this.tenant.id
            );
          } else {
            this.workflow = await ApiWorkflowService.createWorkflow(
              this.workflow,
              this.tenant.id
            );
          }
        }
        const oldChallenges = JSON.parse(
          this.originalSnapshot
        ).verificationChallenges;

        if (
          JSON.stringify(this.verificationChallenges) !==
          JSON.stringify(oldChallenges)
        ) {
          const oldChallengesMap = new Map(oldChallenges.map((c) => [c.id, c]));
          const newChallengesMap = new Map(
            this.verificationChallenges.map((c) => [c.id, c])
          );

          for (const challenge of this.verificationChallenges) {
            const oldChallenge = oldChallengesMap.get(challenge.id);

            if (!oldChallenge) {
              await ApiChallengeService.createChallenge(
                this.tenant.id,
                challenge
              );
            } else if (
              JSON.stringify(challenge) !== JSON.stringify(oldChallenge)
            ) {
              await ApiChallengeService.updateChallenge(
                this.tenant.id,
                challenge
              );
            }
          }

          for (const oldChallenge of oldChallenges) {
            if (!newChallengesMap.has(oldChallenge.id)) {
              await ApiChallengeService.deleteChallenge(
                this.tenant.id,
                oldChallenge.id
              );
            }
          }
        }

        this.originalSnapshot = JSON.stringify({
          tenant: this.tenant,
          apps: this.apps,
          workflow: this.workflow,
          verificationChallenges: this.verificationChallenges,
        });

        await this.addToast({
          message: "Änderungen wurden erfolgreich gespeichert.",
          type: "success",
        });
      } catch (e) {
        await this.addToast({
          message: "Fehler beim Speichern der Änderungen.",
          type: "error",
        });
      } finally {
        this.inProgress = false;
      }
    },
    openReceiptTemplate() {
      this.showEditTemplateDialog = true;
    },
    openInvoiceTemplate() {
      this.showEditInvoiceTemplateDialog = true;
    },
    openCancellationTemplate() {
      this.showEditCancellationTemplateDialog = true;
    },
    onSubmitReceiptTemplate(template) {
      this.tenant.receiptTemplate = template;
      this.showEditTemplateDialog = false;
    },
    onSubmitInvoiceTemplate(template) {
      this.tenant.invoiceTemplate = template;
      this.showEditInvoiceTemplateDialog = false;
    },
    onSubmitCancellationTemplate(template) {
      this.tenant.cancellationTemplate = template;
      this.showEditCancellationTemplateDialog = false;
    },
    async fetchInstanceCustomFields() {
      try {
        const bookableCustomFields =
          await ApiInstanceService.getBookableCustomFields();
        this.instanceCustomFields = bookableCustomFields || [];
      } catch (e) {
        console.error(e);
      }
    },
  },
  async mounted() {
    const queryTabKey = this.$route.query.tab;
    const foundIndex = this.visibleTabs.findIndex((t) => t.key === queryTabKey);
    this.activeTab = foundIndex !== -1 ? foundIndex : 0;

    await this.fetchTenant();
    await this.fetchRoles();
    await this.fetchInstanceCustomFields();
  },
};
</script>

<style scoped>
.page-content {
  padding-bottom: calc(
    56px + /* SaveBar height */ 12px + /* bottom margin */ 12px + /* gap */ 16px
      /* extra spacing */
  );
}
</style>
