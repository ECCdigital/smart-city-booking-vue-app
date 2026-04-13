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
        @cancel="fetchInstance"
        show-restore
        :disabled="inProgress || isLoading || !validRoot || hasUnsavedChanges"
        :in-progress="inProgress"
      />
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiRolesService from "@/services/api/ApiRolesService";
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";
import ApiUsersService from "@/services/api/ApiUsersService";
import { mapActions, mapGetters } from "vuex";
import SaveBar from "@/components/commons/SaveBar.vue";

// new child components
import InstanceEditGeneral from "@/components/Instance/Edit/InstanceEditGeneral.vue";
import InstanceEditMail from "@/components/Instance/Edit/InstanceEditMail.vue";
import InstanceEditOwners from "@/components/Instance/Edit/InstanceEditOwners.vue";
import InstanceEditSSO from "@/components/Instance/Edit/InstanceEditSSO.vue";
import InstanceEditCatalog from "@/components/Instance/Edit/InstanceEditCatalog.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import InstanceEditTenants from "@/components/Instance/Edit/InstanceEditTenants.vue";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "Instances",
  components: {
    MailKonfiguration,
    AdminLayout,
    SaveBar,
    InstanceEditGeneral,
    InstanceEditMail,
    InstanceEditOwners,
    InstanceEditSSO,
    InstanceEditCatalog,
    InstanceEditTenants,
  },
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
          key: "sso",
          label: "Single-Sign On",
          icon: "mdi-lock",
          comp: "InstanceEditSSO",
        },
        {
          key: "tenants",
          label: "Mandanten",
          icon: "mdi-domain",
          comp: "InstanceEditTenants",
        },
        {
          key: "catalog",
          label: "Katalog",
          icon: "mdi-book-open",
          comp: "InstanceEditCatalog",
        },
      ],
      catalog: {
        type: "instanze",
        theme: {
          active: false,
          colors: { primary: "", secondary: "" },
        },
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
    instanceMailConfig: {
      get() {
        return {
          genericMailTemplate: this.instance.mailTemplate,
          noreplyMail: this.instance.noreplyMail,
          noreplyDisplayName: this.instance.noreplyDisplayName,
          noreplyHost: this.instance.noreplyHost,
          noreplyPort: this.instance.noreplyPort,
          noreplyUser: this.instance.noreplyUser,
          noreplyPassword: this.instance.noreplyPassword,
          noreplyUseGraphApi: this.instance.noreplyUseGraphApi,
          noreplyStarttls: this.instance.noreplyStarttls,
          noreplyGraphTenantId: this.instance.noreplyGraphTenantId,
          noreplyGraphClientId: this.instance.noreplyGraphClientId,
          noreplyGraphClientSecret: this.instance.noreplyGraphClientSecret,
        };
      },
    },
    hasUnsavedChanges() {
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

    onUpdateInstance(next) {
      this.instance = { ...this.instance, ...next };
    },
    onUpdateCatalog(next) {
      this.catalog = { ...this.catalog, ...next };
    },
    async fetchInstance() {
      this.instance = await ApiInstanceService.getInstance();
      await this.fetchCatalog();

      // ensure applications array exists and has a keycloak entry
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
    async submitChanges() {
      const ok = await this.validateActiveChild();
      if (!ok) return;

      this.inProgress = true;
      try {
        await ApiInstanceService.updateInstance(this.instance);
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

<style scoped></style>
