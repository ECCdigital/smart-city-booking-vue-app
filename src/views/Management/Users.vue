<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-row>
          <v-col>
            <v-autocomplete
              outlined
              dense
              hide-details
              placeholder="Benutzer"
              clearable
              v-model="newUserId"
              :items="api.users"
              item-text="id"
              item-value="id"
            >
            </v-autocomplete>
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

        <v-data-table
          :headers="headers"
          :items="members"
          :footer-props="{
            'items-per-page-all-text': 'Alle',
            'items-per-page-text': 'Benutzer pro Seite',
          }"
          class="accent elevation-1"
          fixed-header
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
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiUsersService from "@/services/api/ApiUsersService";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  components: {
    AdminLayout,
  },
  data() {
    return {
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
      const members = this.tenant.users.map((userRef) => ({
        ...userRef,
        _isOwner: this.tenant.ownerUserIds.includes(userRef.userId),
      }));

      // There might be users marked as owners that do not have any roles assigned and therefore do not occur in tenant user references.
      const shadowMembers = this.tenant.ownerUserIds
        .filter(
          (userId) =>
            !this.tenant.users.some((userRef) => userRef.userId === userId)
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
    }),
    async fetchTenant() {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.getTenant(this.tenantId);
        this.tenant = response.data;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchRoles() {
      const response = await ApiRolesService.getRoles(this.currentTenantId);
      this.api.roles = response.data;
    },

    async fetchUsers() {
      await this.startLoading("fetch-users");

      const users = await ApiUsersService.getUsers();
      this.api.users = users;

      await this.stopLoading("fetch-users");
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
      try {
        this.isLoading = true;
        const response = await ApiTenantService.addTenantUser(
          this.tenantId,
          this.newUserId,
          this.newRoleIds
        );

        this.newUserId = null;
        this.newRoleIds = [];

        this.tenant = response.data;
      } catch (e) {
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

        this.tenant = response.data;
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
        this.tenant = response.data;
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
        this.tenant = response.data;
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
    await this.fetchTenant();
    await this.fetchRoles();
    await this.fetchUsers();
  },
};
</script>

<style scoped></style>
