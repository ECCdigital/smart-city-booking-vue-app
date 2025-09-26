<template>
  <v-container>
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

      <v-tabs
        v-model="activeTab"
        background-color="transparent"
        color="primary"
        show-arrows
        class="mb-4"
      >
        <v-tab v-for="t in tabs" :key="t.key">
          <v-icon left small>{{ t.icon }}</v-icon>
          {{ t.label }}
        </v-tab>
      </v-tabs>

      <keep-alive>
        <component
          :is="currentComponent"
          ref="activeChild"
          :tenant="tenant"
          :apps="apps"
          :workflow="workflow"
          @update:tenant="onUpdateTenant"
          @update:apps="onUpdateApps"
          @update:workflow="onUpdateWorkflow"
          @open-receipt-template="openReceiptTemplate"
          @open-invoice-template="openInvoiceTemplate"
        />
      </keep-alive>
    </v-form>

    <v-sheet class="save-bar" color="white" elevation="6">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-content-save</v-icon>
        <span class="mr-4">Änderungen speichern</span>
        <v-spacer />
        <v-btn text @click="resetCurrentValidation" class="mr-2">
          Validierung zurücksetzen
        </v-btn>
        <v-btn
          color="primary"
          :loading="inProgress"
          :disabled="inProgress || isLoading || !hasUnsavedChanges || !validRoot"
          @click="submitChanges"
        >
          Speichern
        </v-btn>
      </div>
    </v-sheet>

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
  </v-container>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import { mapActions, mapGetters } from "vuex";

// Unterkomponenten
import TenantEditGeneral from "@/components/Tenant/Edit/TenantEditGeneral.vue";
import TenantEditWeb from "@/components/Tenant/Edit/TenantEditWeb.vue";
import TenantEditEmail from "@/components/Tenant/Edit/TenantEditEmail.vue";
import TenantEditPayments from "@/components/Tenant/Edit/TenantEditPayments.vue";
import TenantEditLocks from "@/components/Tenant/Edit/TenantEditLocks.vue";
import TenantEditBooking from "@/components/Tenant/Edit/TenantEditBooking.vue";
import TenantEditEvents from "@/components/Tenant/Edit/TenantEditEvents.vue";
import TenantEditWorkflow from "@/components/Tenant/Edit/TenantEditWorkflow.vue";
import TenantEditVerificationChallenges from "@/components/Tenant/Edit/TenantEditVerificationChallenges.vue";

import ReceiptTemplateDialog from "@/components/Tenant/ReceiptTemplateDialog.vue";
import InvoiceTemplateDialog from "@/components/Tenant/InvoiceTemplateDialog.vue";

export default {
  name: "TenantOverview",
  components: {
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
  },
  data() {
    return {
      isLoading: false,
      inProgress: false,
      validRoot: true,
      activeTab: 0,
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
        }
      ],
      originalSnapshot: null,
      tenant: {},
      apps: {},
      workflow: {
        active: false,
        defaultState: "",
        states: [],
      },
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
        }) !== this.originalSnapshot
      );
    },
    currentComponent() {
      return this.tabs[this.activeTab]?.comp || "TenantEditGeneral";
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async fetchTenant() {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.getTenant(this.tenantId);
        this.tenant = response.data || {};
        this.initializeApps();
        await this.fetchWorkflow();
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
            defaultState: "",
            tenantId: this.tenant.id,
          };
    },
    onUpdateTenant(next) {
      this.tenant = { ...this.tenant, ...next };
    },
    onUpdateApps(next) {
      this.apps = { ...this.apps, ...next };
    },
    onUpdateWorkflow(next) {
      console.log("onUpdateWorkflow", next);
      this.workflow = { ...this.workflow, ...next };
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
        await ApiTenantService.submitTenant(this.tenant);

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

        this.originalSnapshot = JSON.stringify({
          tenant: this.tenant,
          apps: this.apps,
          workflow: this.workflow,
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
    await this.fetchTenant();
  },
};
</script>

<style scoped>
.save-bar {
  position: sticky;
  bottom: 16px;
  border-radius: 12px;
  padding: 12px 16px;
  z-index: 1;
}
</style>
