<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-text-field
          v-model="search"
          label="Rolle suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          class="search-field"
        ></v-text-field>
        <v-data-table
          :headers="headers"
          :items="api.roles"
          :search="search"
          :footer-props="{
            'items-per-page-all-text': 'Alle',
            'items-per-page-text': 'Rollen pro Seite',
          }"
          class="accent elevation-1"
          fixed-header
          :loading="loading"
          loading-text="Daten werden geladen..."
        >
          <template v-slot:header.name="{ header }">
            {{ header.text.toUpperCase() }}
          </template>
          <template v-slot:item.adminInterfaces="{ item }">
            {{ translateAdminInterfaces(item.adminInterfaces) }}
          </template>
          <template v-slot:item.manageRoles="{ item }">
            {{ translateAccessLevels(item.manageRoles) }}
          </template>
          <template v-slot:item.manageUsers="{ item }">
            {{ translateAccessLevels(item.manageUsers) }}
          </template>
          <template v-slot:item.manageTenants="{ item }">
            {{ translateAccessLevels(item.manageTenants) }}
          </template>
          <template v-slot:item.manageBookables="{ item }">
            {{ translateAccessLevels(item.manageBookables) }}
          </template>
          <template v-slot:item.manageBookings="{ item }">
            {{ translateAccessLevels(item.manageBookings) }}
          </template>
          <template v-slot:item.manageCoupons="{ item }">
            {{ translateAccessLevels(item.manageCoupons) }}
          </template>
          <template v-slot:item.controls="{ item }">
            <span v-if="item.id !== 'super-admin'">
              <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn icon v-bind="attrs" v-on="on" small>
                    <v-icon>mdi-dots-horizontal</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item
                    link
                    @click="onOpenEditRoles(item.id)"
                    :disabled="!RolePermissionService.allowUpdate(item)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-pencil</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Rolle bearbeiten</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    link
                    @click="onOpenDeleteDialog(item.id)"
                    :disabled="!RolePermissionService.allowDelete(item)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-delete</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Rolle löschen</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </span>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <v-btn
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      class="v-btn"
      @click="onOpenCreateRole"
      :disabled="!RolePermissionService.allowCreate()"
    >
      <v-icon>mdi-plus</v-icon> Rolle erstellen
    </v-btn>
    <RoleEdit
      :role="selectedRole"
      :open="openEditDialog"
      @close="onCloseDialog"
    />
    <RoleDeleteConformationDialog
      :toDelete="selectedRole"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import ApiRolesService from "@/services/api/ApiRolesService";
import RoleEdit from "@/components/Role/RoleEdit";
import { mapActions, mapGetters } from "vuex";
import RoleDeleteConformationDialog from "@/components/Role/roleDeleteConformationDialog";
import { Role, RolePermission } from "@/entities/role";
import i18n from "../../language/index";
import RolePermissionService from "@/services/permissions/RolePermissionService";

export default {
  components: {
    RoleDeleteConformationDialog,
    AdminLayout,
    RoleEdit,
  },
  data() {
    return {
      search: "",
      api: {
        roles: [],
      },
      headers: [
        {
          text: "Rolle",
          align: "start",
          value: "name",
        },
        { text: "Admin-Bereiche", value: "adminInterfaces" },
        { text: "Benutzer", value: "manageUsers" },
        { text: "Ressourcen", value: "manageBookables" },
        { text: "Buchungen", value: "manageBookings" },
        { text: "Rollen", value: "manageRoles" },
        { text: "Gutscheine", value: "manageCoupons" },
        { text: "", value: "controls", sortable: false },
      ],
      openEditDialog: false,
      openDeleteDialog: false,
      selectedRole: {},
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    RolePermissionService() {
      return RolePermissionService;
    },
  },
  watch: {
    tenantId() {
      this.fetchRoles();
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    fetchRoles() {
      this.startLoading("fetch-roles");
      ApiRolesService.getTenantRoles()
        .then((response) => {
          this.api.roles = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-roles");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    onOpenEditRoles(roleId) {
      this.selectedRole = Object.assign(
        {},
        this.api.roles.find((role) => role.id === roleId)
      );
      this.openEditDialog = true;
    },
    onOpenDeleteDialog(roleId) {
      this.selectedRole = Object.assign(
        {},
        this.api.roles.find((role) => role.id === roleId)
      );
      this.openDeleteDialog = true;
    },
    onCloseDialog() {
      this.fetchRoles();
      this.openEditDialog = false;
    },
    onCloseDeleteDialog() {
      this.fetchRoles();
      this.openDeleteDialog = false;
    },
    onOpenCreateRole() {
      this.selectedRole = new Role();
      this.openEditDialog = true;
    },
    translateAccessLevels(accessLevels) {
      if (!accessLevels) {
        return i18n.t(`permissions.accessLevels.none`);
      }

      const activeAccessLevelNames = Object.keys(accessLevels).filter(
        (key) => !!accessLevels[key]
      );

      if (activeAccessLevelNames.length === 0) {
        return i18n.t("permissions.accessLevels.none");
      }

      if (activeAccessLevelNames.length === Object.keys(accessLevels).length) {
        return i18n.t("permissions.accessLevels.all");
      }

      return activeAccessLevelNames
        .map((key) => i18n.t(`permissions.accessLevels.${key}`))
        .join(", ");
    },
    translateAdminInterfaces(adminInterfaces) {
      if (!adminInterfaces || adminInterfaces.length === 0) {
        return i18n.t("permissions.adminInterfaces.none");
      }

      if (adminInterfaces.length === 10) {
        return i18n.t("permissions.adminInterfaces.all");
      }

      return adminInterfaces
        .map((key) => i18n.t(`permissions.adminInterfaces.${key}`))
        .join(", ");
    },
  },
  created() {
    this.fetchRoles();
  },
};
</script>

<style scoped>
.search-field {
  border-radius: 15px;
}
</style>
