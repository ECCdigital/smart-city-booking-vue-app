<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-row>
            <v-col>
              <v-text-field
                outlined
                dense
                placeholder="Benutzer"
                clearable
                v-model="newUserId"
                :rules="rules.email"
              >
              </v-text-field>
            </v-col>
            <v-col>
              <v-select
                outlined
                dense
                multiple
                v-model="newRoleIds"
                :items="api.roles"
                item-text="name"
                item-value="id"
                clearable
                small-chips
              ></v-select>
            </v-col>
            <v-col cols="auto">
              <v-btn color="primary" @click="addTenantUser">Hinzufügen</v-btn>
            </v-col>
          </v-row>
        </v-form>
        <v-text-field
          v-model="search"
          label="Benutzer suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          class="search-field"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="members"
          :footer-props="{
            'items-per-page-all-text': 'Alle',
            'items-per-page-text': 'Benutzer pro Seite',
          }"
          class="accent elevation-1"
          fixed-header
          :search="search"
          :loading="loading"
          loading-text="Daten werden geladen..."
        >
          <template v-slot:item.roles="{ item }">
            <v-chip
              small
              close
              class="mr-1 black--text"
              color="secondary"
              v-for="(roleId, i) in item.roles"
              :key="i"
              @click:close="removeTenantUserRole(item.userId, roleId)"
              >{{ getRoleById(roleId)?.name }}</v-chip
            >
          </template>
          <template v-slot:item._isOwner="{ item }">
            <v-checkbox readonly v-model="item._isOwner"></v-checkbox>
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
                  <v-list-item link @click="editUserRoles(item.userId)">
                    <v-list-item-icon>
                      <v-icon>mdi-pencil</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Rollen bearbeiten</v-list-item-title>
                  </v-list-item>
                  <v-list-item link @click="removeTenantUser(item.userId)">
                    <v-list-item-icon>
                      <v-icon>mdi-close</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Benutzer entfernen</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    link
                    @click="addTenantOwner(item.userId)"
                    v-if="item._isOwner !== true"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-shield-crown</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Zum Besitzer machen</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    link
                    @click="removeTenantOwner(item.userId)"
                    v-if="item._isOwner === true"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-account</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Zum Mitglied machen</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </span>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <TenantUserEditRoleDialog
      v-if="selectedUser"
      :user="selectedUser"
      :roles="api.roles"
      :open="showEditRolesDialog"
      @close="showEditRolesDialog = false"
      @save="editTenantUserRoles"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ToastService from "@/services/ToastService";
import TenantUserEditRoleDialog from "@/components/Tenant/TenantUserEditRoleDialog.vue";

export default {
  components: {
    TenantUserEditRoleDialog,
    AdminLayout,
  },
  data() {
    return {
      valid: true,
      rules: {
        email: [
          (v) => !!v || "E-Mail ist erforderlich",
          (v) => /.+@.+\..+/.test(v) || "E-Mail muss gültig sein",
        ],
      },
      search : "",
      showEditRolesDialog: false,
      selectedUser: null,
      isLoading: false,
      newUserId: null,
      newRoleIds: [],
      tenant: {
        users: [],
        ownerUserIds: [],
      },
      api: {
        users: [],
        roles: [],
        owner: [],
      },
      headers: [
        {
          text: "Benutzer",
          align: "start",
          value: "userId",
        },
        {
          text: "Rollen",
          align: "start",
          value: "roles",
        },
        {
          text: "Besitzer",
          align: "start",
          value: "_isOwner",
        },
        { text: "", value: "controls", sortable: false },
      ],
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    members() {
      const members = this.api.users.map((userRef) => ({
        ...userRef,
        _isOwner: this.api.owner.includes(userRef.userId),
      }));

      // There might be users marked as owners that do not have any roles assigned and therefore do not occur in tenant user references.
      const shadowMembers = this.api.owner
        .filter(
          (userId) =>
            !this.api.users.some((userRef) => userRef.userId === userId)
        )
        .map((userId) => ({
          userId: userId,
          roles: [],
          _isOwner: true,
        }));

      return [...members, ...shadowMembers];
    },
  },
  watch: {
    async tenantId() {
      await this.fetchTenant();
      await this.fetchRoles();
      await this.fetchUsers();
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),

    editUserRoles(userId) {
      this.selectedUser = this.api.users.find((user) => user.userId === userId);
      this.showEditRolesDialog = true;
    },

    async fetchRoles() {
      const response = await ApiRolesService.getTenantRoles(this.currentTenantId);
      this.api.roles = response.data;
    },

    async fetchTenantUsers() {
      await this.startLoading("fetch-users");
      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        this.api.users = response.users;
        this.api.owner = response.owner;
      } finally {
        await this.stopLoading("fetch-users");
      }
    },
    async removeTenantUser(userId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.removeTenantUser(
          this.tenantId,
          userId
        );

        this.tenant = response.data;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async addTenantUser() {
      if (!this.$refs.form.validate()) {
        return;
      }
      try {
        this.isLoading = true;
        const response = await ApiTenantService.addTenantUser(
          this.tenantId,
          this.newUserId,
          this.newRoleIds
        );

        this.newUserId = null;
        this.newRoleIds = [];

        this.api.users = response.users;
        this.api.owner = response.owner;
      } catch (e) {
        if (e.response.status === 404) {
          await this.addToast(
            ToastService.createToast("tenant.error.user-not-found", "error")
          );
        } else {
          console.error(e);
        }
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async removeTenantUserRole(userId, roleId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.removeTenantUserRole(
          this.tenantId,
          userId,
          roleId
        );

        this.api.users = response.users;
        this.api.owner = response.owner;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async addTenantOwner(userId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.addTenantOwner(
          this.tenantId,
          userId
        );
        this.api.owner = response.owner;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async removeTenantOwner(userId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.removeTenantOwner(
          this.tenantId,
          userId
        );
        this.api.owner = response.owner;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async editTenantUserRoles(userId, roleIds) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.editTenantUserRoles(
          this.tenantId,
          userId,
          roleIds
        );

        this.api.users = response.users;
        this.api.owner = response.owner;
        this.showEditRolesDialog = false;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    getRoleById(roleId) {
      const role = this.api.roles.find((role) => role.id === roleId);
      return role;
    },
  },
  async created() {
    await this.fetchRoles();
    await this.fetchTenantUsers();
  },
};
</script>

<style scoped></style>
