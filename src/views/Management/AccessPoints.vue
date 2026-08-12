<script>
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import SaveBar from "@/components/commons/SaveBar.vue";
import AccessPointManagement from "@/components/AccessPoint/AccessPointManagement.vue";
import TenantEditAccessLocks from "@/components/Tenant/Edit/TenantEditAccessLocks.vue";
import AccessPointPermissionService from "@/services/permissions/AccessPointPermissionService";

// The apps this page owns. Everything else on the tenant - above all the
// payment apps - is left untouched when saving.
const MANAGED_APP_IDS = ["pareva", "ifbs", "nuki", "salto-ks"];

export default {
  name: "AccessPoints",
  components: {
    AdminLayout,
    SaveBar,
    AccessPointManagement,
    TenantEditAccessLocks,
  },
  data() {
    return {
      activeTab: 0,
      isLoading: false,
      inProgress: false,
      tenant: {},
      apps: {},
      originalSnapshot: null,
      nukiTokenConfigured: false,
      saltoSecretConfigured: false,
      saltoPasswordConfigured: false,
      defaultApps: {
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
        ifbs: {
          type: "locker",
          id: "ifbs",
          title: "Parkraumservice",
          serverUrl: "",
          secretPhrase: "",
          apiKeyID: "",
          apiKey: "",
          active: false,
          customerService: {
            name: "",
            email: "",
            phone: "",
          },
        },
        nuki: {
          type: "access",
          id: "nuki",
          title: "Nuki",
          apiToken: "",
          apiBaseUrl: "https://api.nuki.io",
          active: false,
        },
        "salto-ks": {
          type: "access",
          id: "salto-ks",
          title: "Salto KS",
          clientId: "",
          clientSecret: "",
          username: "",
          password: "",
          siteId: "",
          apiBaseUrl: "https://clp-accept-user.my-clay.com",
          active: false,
        },
      },
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    // No read-only management page: users who may not write doors simply do
    // not get the tab.
    allowAccessPointManagement() {
      return AccessPointPermissionService.allowWrite();
    },
    tabs() {
      const tabs = [];
      if (this.allowAccessPointManagement) {
        tabs.push({
          key: "accesspoints",
          label: this.$t("accessPoint.management.tab"),
          icon: "mdi-door-closed-lock",
        });
      }
      tabs.push({
        key: "providers",
        label: this.$t("accessPoint.management.providersTab"),
        icon: "mdi-lock",
      });
      return tabs;
    },
    currentTabKey() {
      return this.tabs[this.activeTab]?.key;
    },
    hasUnsavedChanges() {
      return (
        JSON.stringify({ tenant: this.tenant, apps: this.apps }) !==
        this.originalSnapshot
      );
    },
  },
  watch: {
    activeTab(newIndex) {
      const tabKey = this.tabs[newIndex]?.key;
      if (!tabKey || this.$route.query.tab === tabKey) return;
      this.$router.replace({ query: { ...this.$route.query, tab: tabKey } });
    },
    tenantId() {
      this.fetchTenant();
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async fetchTenant() {
      if (!this.tenantId) return;

      try {
        this.isLoading = true;
        const response = await ApiTenantService.getTenant(this.tenantId);
        this.tenant = response.data || {};
        this.initializeApps();
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }

      this.$nextTick(() => {
        this.originalSnapshot = JSON.stringify({
          tenant: this.tenant,
          apps: this.apps,
        });
      });
    },
    initializeApps() {
      const existing = this.tenant.applications || [];
      const map = {};
      MANAGED_APP_IDS.forEach((id) => {
        const found = existing.find((app) => app.id === id);
        map[id] = found ? { ...found } : { ...this.defaultApps[id] };
      });

      // Only remember *that* a secret is stored, so an empty field can mean
      // "leave the existing one alone".
      this.nukiTokenConfigured = !!map.nuki.apiToken;
      this.saltoSecretConfigured = !!map["salto-ks"].clientSecret;
      this.saltoPasswordConfigured = !!map["salto-ks"].password;

      this.apps = map;
    },
    /**
     * Merge the managed apps back into the tenant. Merging rather than
     * replacing matters: the payment apps are edited on another page and must
     * survive a save here.
     */
    replaceApps() {
      const untouched = (this.tenant.applications || []).filter(
        (app) => !MANAGED_APP_IDS.includes(app.id)
      );

      const managed = Object.values(this.apps).map((a) => {
        const app = { ...a };
        // An empty secret field means "unchanged" - dropping the key keeps
        // the stored (encrypted) value on the server.
        if (app.id === "nuki" && !app.apiToken) {
          delete app.apiToken;
        }
        if (app.id === "salto-ks" && !app.clientSecret) {
          delete app.clientSecret;
        }
        if (app.id === "salto-ks" && !app.password) {
          delete app.password;
        }
        return app;
      });

      this.tenant.applications = [...untouched, ...managed];
    },
    onUpdateTenant(next) {
      this.tenant = { ...this.tenant, ...next };
    },
    onUpdateApps(next) {
      this.apps = { ...this.apps, ...next };
    },
    async validateProviders() {
      const ref = this.$refs.providers;
      if (ref && typeof ref.validate === "function") {
        return await ref.validate();
      }
      return true;
    },
    async submitChanges() {
      const ok = await this.validateProviders();
      if (!ok) {
        setTimeout(() => {
          this.$refs.providers?.resetValidation?.();
        }, 4000);
        return;
      }

      this.replaceApps();
      this.inProgress = true;

      try {
        await ApiTenantService.submitTenant(this.tenant);
        this.originalSnapshot = JSON.stringify({
          tenant: this.tenant,
          apps: this.apps,
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
  },
  async mounted() {
    const queryTabKey = this.$route.query.tab;
    const foundIndex = this.tabs.findIndex((t) => t.key === queryTabKey);
    this.activeTab = foundIndex !== -1 ? foundIndex : 0;

    await this.fetchTenant();
  },
};
</script>

<template>
  <AdminLayout>
    <div class="page-content" ref="contentCol">
      <v-progress-linear :active="isLoading" indeterminate color="primary" />

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
          <AccessPointManagement v-if="currentTabKey === 'accesspoints'" />

          <TenantEditAccessLocks
            v-else-if="tenant.id"
            ref="providers"
            :tenant="tenant"
            :apps="apps"
            :nuki-token-configured="nukiTokenConfigured"
            :salto-secret-configured="saltoSecretConfigured"
            :salto-password-configured="saltoPasswordConfigured"
            @update:tenant="onUpdateTenant"
            @update:apps="onUpdateApps"
          />
        </v-col>
      </v-row>
    </div>

    <SaveBar
      v-if="currentTabKey === 'providers'"
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      @submit="submitChanges"
      @cancel="fetchTenant"
      show-restore
      :disabled="hasUnsavedChanges"
      :in-progress="inProgress"
    />
  </AdminLayout>
</template>

<style scoped>
.page-content {
  padding-bottom: calc(
    56px + /* SaveBar height */ 12px + /* bottom margin */ 12px + /* gap */ 16px
      /* extra spacing */
  );
}
</style>
