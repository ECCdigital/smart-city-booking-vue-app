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
              v-for="t in tabs"
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
              @update:tenant="onUpdateTenant"
              @update:apps="onUpdateApps"
              @update:workflow="onUpdateWorkflow"
              @update:challenges="onUpdateChallenges"
              @open-receipt-template="openReceiptTemplate"
              @open-invoice-template="openInvoiceTemplate"
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
import TenantEditLocks from "@/components/Tenant/Edit/TenantEditLocks.vue";
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

export default {
  name: "TenantOverview",
  components: {
    SaveBar,
    TenantEditGeneral,
    TenantEditWeb,
    TenantEditEmail,
    TenantEditPayments,
    TenantEditLocks,
    TenantEditBooking,
    TenantEditEvents,
    TenantEditWorkflow,
    ReceiptTemplateDialog,
    InvoiceTemplateDialog,
    TenantEditVerificationChallenges,
    TenantEditCatalog,
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
          key: "locks",
          label: "Schließsysteme",
          icon: "mdi-lock",
          comp: "TenantEditLocks",
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
        pareva: {
          type: "locker",
          id: "pareva",
          title: "Pareva",
          serverUrl: "",
          lockerId: "",
          user: "",
          password: "",
          active: false,
        },
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
    currentComponent() {
      return this.tabs[this.activeTab]?.comp || "TenantEditGeneral";
    },
  },
  watch: {
    activeTab(newIndex) {
      const tabKey = this.tabs[newIndex].key;
      if (this.$route.query.tab === tabKey) return;
      this.$router.replace({
        query: { ...this.$route.query, tab: tabKey },
      });
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
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
      this.apps = map;
    },
    replaceApps() {
      this.tenant.applications = Object.values(this.apps).map((a) => ({
        ...a,
      }));
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
        // optional: nach 4s Validierung der aktiven Unterseite zurücksetzen
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

        if (
          JSON.stringify(this.verificationChallenges) !==
          JSON.stringify(
            JSON.parse(this.originalSnapshot).verificationChallenges
          )
        ) {
          for (const challenge of this.verificationChallenges) {
            if (challenge.id) {
              await ApiChallengeService.updateChallenge(
                this.tenant.id,
                challenge
              );
            } else {
              await ApiChallengeService.createChallenge(
                this.tenant.id,
                challenge
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
    onSubmitReceiptTemplate(template) {
      this.tenant.receiptTemplate = template;
      this.showEditTemplateDialog = false;
    },
    onSubmitInvoiceTemplate(template) {
      this.tenant.invoiceTemplate = template;
      this.showEditInvoiceTemplateDialog = false;
    },
  },
  async mounted() {
    const queryTabKey = this.$route.query.tab;
    const foundIndex = this.tabs.findIndex((t) => t.key === queryTabKey);
    this.activeTab = foundIndex !== -1 ? foundIndex : 0;

    await this.fetchTenant();
    await this.fetchRoles();
  },
};
</script>

<style scoped>
.page-content {
  padding-bottom: 26px;
}
</style>
