<template>
  <AdminLayout>
    <div class="page-content" ref="contentCol">
      <v-form ref="rootForm" v-model="validRoot">
        <v-progress-linear :active="isLoading" indeterminate color="primary" />

        <div class="d-flex align-center mb-2">
          <v-spacer />
          <v-chip
            :style="{ visibility: hasUnsavedChanges ? 'visible' : 'hidden' }"
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
            </v-tabs>
          </v-col>

          <v-col class="col-12 col-md-9">
            <keep-alive>
              <component
                v-if="instance"
                :is="currentComponent"
                ref="activeChild"
                :instance="instance"
                :tenants="tenants"
                :catalog="catalog"
                :available-users="availableUserIds"
                :available-roles="availableRoles"
                @update:instance="onUpdateInstance"
                @update:catalog="onUpdateCatalog"
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
        @cancel="onRestoreChanges"
        show-restore
        :disabled="inProgress || isLoading || !validRoot || hasUnsavedChanges"
        :in-progress="inProgress"
      />

      <UnsavedChangesDialog
        v-model="leaveDialogOpen"
        @stay="resolveLeaveConfirm(false)"
        @discard="resolveLeaveConfirm(true)"
      />
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiUsersService from "@/services/api/ApiUsersService";
import { mapActions, mapGetters } from "vuex";
import SaveBar from "@/components/commons/SaveBar.vue";
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import unsavedChangesGuard from "@/mixins/unsavedChangesGuard";
import InstanceEditGeneral from "@/components/Instance/Edit/InstanceEditGeneral.vue";
import InstanceEditLegal from "@/components/Instance/Edit/InstanceEditLegal.vue";
import InstanceEditMail from "@/components/Instance/Edit/InstanceEditMail.vue";
import InstanceEditOwners from "@/components/Instance/Edit/InstanceEditOwners.vue";
import InstanceEditCatalog from "@/components/Instance/Edit/InstanceEditCatalog.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import InstanceEditTenants from "@/components/Instance/Edit/InstanceEditTenants.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import InstanceEditBookables from "@/components/Instance/Edit/InstanceEditBookables.vue";
import InstanceEditAuth from "@/components/Instance/Edit/InstanceEditAuth.vue";
import InstanceEditCheckout from "@/components/Instance/Edit/InstanceEditCheckout.vue";
import { brandingForSave, defaultBranding } from "@/utils/instanceBranding";
import { legalDocumentsForSave } from "@/utils/instanceLegalDocuments";

export default {
  name: "Instances",
  components: {
    AdminLayout,
    SaveBar,
    UnsavedChangesDialog,
    InstanceEditGeneral,
    InstanceEditLegal,
    InstanceEditMail,
    InstanceEditOwners,
    InstanceEditAuth,
    InstanceEditCatalog,
    InstanceEditTenants,
    InstanceEditBookables,
    InstanceEditCheckout,
  },
  mixins: [unsavedChangesGuard],
  data() {
    return {
      instance: null,
      isLoading: false,
      inProgress: false,
      validRoot: true,
      originalSnapshot: null,
      selectedOwner: null,
      availableUserIds: null,
      showKeycloakClientSecret: false,
      availableRoles: [],
      activeTab: 0,
      tabs: [
        {
          key: "general",
          label: "Allgemein",
          icon: "mdi-home",
          comp: "InstanceEditGeneral",
        },
        {
          key: "legal",
          label: "Rechtliches",
          icon: "mdi-scale-balance",
          comp: "InstanceEditLegal",
        },
        {
          key: "mail",
          label: "E-Mail",
          icon: "mdi-email",
          comp: "InstanceEditMail",
        },
        {
          key: "owners",
          label: "Admin",
          icon: "mdi-shield-crown",
          comp: "InstanceEditOwners",
        },
        {
          key: "auth",
          label: "Authentifizierung",
          icon: "mdi-shield-lock",
          comp: "InstanceEditAuth",
        },
        {
          key: "tenants",
          label: "Mandanten",
          icon: "mdi-domain",
          comp: "InstanceEditTenants",
        },
        {
          key: "portal",
          label: "Portal",
          icon: "mdi-web",
          comp: "InstanceEditCatalog",
        },
        {
          key: "bookables",
          label: "Buchungsobjekte",
          icon: "mdi-calendar-check",
          comp: "InstanceEditBookables",
        },
        {
          key: "checkout",
          label: "Checkout",
          icon: "mdi-basket",
          comp: "InstanceEditCheckout",
        },
      ],
      catalog: {
        type: "instanze",
        hero: {
          title: "",
          subtitle: "",
        },
      },
      defaultKeycloak: {
        id: "keycloak",
        type: "auth",
        active: false,
        title: "",
        serverUrl: "",
        realm: "",
        publicClient: "",
        privateClient: "",
        privateClientSecret: "",
        roleMapping: {
          active: false,
          roles: [],
        },
      },
      tenants: [],
    };
  },
  computed: {
    ...mapGetters({}),
    currentComponent() {
      return this.tabs[this.activeTab]?.comp || "InstanceEditGeneral";
    },
    hasUnsavedChanges() {
      if (
        this.isLoading ||
        !this.originalSnapshot ||
        typeof this.originalSnapshot !== "string"
      ) {
        return false;
      }
      return (
        JSON.stringify({ instance: this.instance, catalog: this.catalog }) !==
        this.originalSnapshot
      );
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
    ...mapActions({
      addToast: "toasts/add",
    }),
    async onRestoreChanges() {
      const discard = await this.confirmDiscardChanges();
      if (discard) {
        await this.fetchInstance();
      }
    },
    fetchTenants() {
      ApiTenantService.getTenants()
        .then((response) => {
          this.tenants = response.data;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    normalizeKeycloakApp(raw = {}) {
      const merged = {
        ...this.defaultKeycloak,
        ...raw,
      };

      merged.roleMapping = {
        ...this.defaultKeycloak.roleMapping,
        ...(raw.roleMapping || {}),
      };

      merged.roleMapping.roles = Array.isArray(merged.roleMapping.roles)
        ? merged.roleMapping.roles.map((r) => ({
          tenantId: r.tenantId ?? null,
          keycloakRole: r.keycloakRole ?? "",
          tenantRoleId: r.tenantRoleId ?? null,
        }))
        : [];

      return merged;
    },

    normalizeCardAuthApp(raw = {}) {
      return {
        id: raw.id || "",
        type: "card-auth",
        label: raw.label || "Card Authentication",
        description: raw.description || "",
        enabled: raw.enabled || false,
        serviceUrl: raw.serviceUrl || "",
        apiToken: raw.apiToken || "",
        cardType: raw.cardType || "",
        publicIdField: {
          label: raw.publicIdField?.label || "Card Number",
          placeholder: raw.publicIdField?.placeholder || "",
          helpText: raw.publicIdField?.helpText || "",
        },
        secretField: {
          label: raw.secretField?.label || "Secret",
          placeholder: raw.secretField?.placeholder || "",
          helpText: raw.secretField?.helpText || "",
        },
      };
    },

    onUpdateInstance(next) {
      this.instance = { ...this.instance, ...next };
    },
    onUpdateCatalog(next) {
      this.catalog = { ...this.catalog, ...next };
    },
    async fetchInstance() {
      this.instance = await ApiInstanceService.getInstance();
      await this.fetchCatalog();

      const branding = defaultBranding();
      this.instance.branding = {
        ...branding,
        ...(this.instance.branding || {}),
        theme: {
          ...branding.theme,
          ...((this.instance.branding && this.instance.branding.theme) || {}),
          colors: {
            ...branding.theme.colors,
            ...(((this.instance.branding && this.instance.branding.theme) || {})
              .colors || {}),
          },
        },
      };

      if (!this.instance.applications) this.instance.applications = [];

      const idx = this.instance.applications.findIndex(
        (app) => app?.id === "keycloak"
      );

      if (idx === -1) {
        this.instance.applications.push(this.defaultKeycloak);
      } else {
        this.instance.applications.splice(
          idx,
          1,
          this.normalizeKeycloakApp(this.instance.applications[idx])
        );
      }

      this.instance.applications = this.instance.applications.map((app) => {
        if (app.type === "card-auth") {
          return this.normalizeCardAuthApp(app);
        }
        return app;
      });

      // snapshot after fetching
      this.$nextTick(() => {
        this.originalSnapshot = JSON.stringify({
          instance: this.instance,
          catalog: this.catalog,
        });
      });
    },

    async fetchCatalog() {
      try {
        const response = await ApiCatalogService.getCatalog(this.instance.id);
        this.catalog = response.data;
      } catch (e) {
        // ignore error and load default catalog
      }
    },

    async fetchUsers() {
      this.availableUserIds = await ApiUsersService.getUsers();
    },
    async fetchRoles() {
      const response = await ApiRolesService.getRoles();
      this.availableRoles = response.data;
    },
    async validateActiveChild() {
      const ref = this.$refs.activeChild;
      if (ref && typeof ref.validate === "function") {
        return await ref.validate();
      }
      return true;
    },
    /**
     * The instance as it goes to the API: the derived read fields of the
     * branding and of the legal documents drop out wherever a media reference
     * stands, because the backend derives them from that reference on the way
     * out (§4.9 of the media spec).
     */
    instancePayload() {
      return legalDocumentsForSave({
        ...this.instance,
        branding: brandingForSave(this.instance.branding),
      });
    },
    async submitChanges() {
      const ok = await this.validateActiveChild();
      if (!ok) return;

      this.inProgress = true;
      try {
        await ApiInstanceService.updateInstance(this.instancePayload());
        await ApiCatalogService.updateCatalog(this.catalog);
        this.originalSnapshot = JSON.stringify({
          instance: this.instance,
          catalog: this.catalog,
        });
        await this.addToast({
          message: "Instanz erfolgreich aktualisiert",
          type: "success",
        });
      } catch (e) {
        await this.addToast({
          message: "Fehler beim Aktualisieren der Instanz",
          type: "error",
        });
      } finally {
        this.inProgress = false;
      }
    },
  },
  async mounted() {
    const queryTabKey = this.$route.query.tab;
    const foundIndex = this.tabs.findIndex((t) => t.key === queryTabKey);
    this.activeTab = foundIndex !== -1 ? foundIndex : 0;

    await this.fetchInstance();
    await this.fetchUsers();
    await this.fetchRoles();
    await this.fetchTenants();
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
