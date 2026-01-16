<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-text-field
          v-model="search"
          label="Benutzer suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          style="border-radius: 15px"
        >
          <template v-slot:prepend-inner>
            <v-menu bottom left>
              <template v-slot:activator="{ on, attrs }">
                <v-badge
                  :value="hasActiveFilters"
                  color="primary"
                  dot
                  overlap
                >
                  <v-btn icon v-bind="attrs" v-on="on">
                    <v-icon>mdi-filter-variant</v-icon>
                  </v-btn>
                </v-badge>
              </template>

              <v-list dense>
                <v-subheader>Status</v-subheader>
                <v-list-item dense @click="verifiedFilter = !verifiedFilter">
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="verifiedFilter"
                      @change.prevent
                    />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Nur verifiziert</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item dense @click="suspendedFilter = !suspendedFilter">
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="suspendedFilter"
                      @change.prevent
                    />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Nur suspendiert</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>

              <v-list dense>
                <v-subheader>Mandant</v-subheader>
                <v-list-item
                  dense
                  v-for="(tenant, i) in tenants"
                  :key="i"
                  @click="toggleTenantFilter(tenant.id)"
                >
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="tenantFilter.includes(tenant.id)"
                      @change.prevent
                    />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>{{ tenant.name }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>

              <v-list dense>
                <v-subheader>Rolle</v-subheader>
                <v-list-item
                  dense
                  v-for="(role, i) in api.roles"
                  :key="i"
                  @click="toggleRoleFilter(role.id)"
                >
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="roleFilter.includes(role.id)"
                      @change.prevent
                    />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>{{ role.name }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-text-field>

        <!-- Stats -->
        <v-row class="mb-3">
          <v-col>
            <v-chip class="mr-2" small>
              <v-icon left x-small>mdi-account-group</v-icon>
              {{ filteredUsers.length }} Benutzer
            </v-chip>
            <v-chip class="mr-2" small color="green" text-color="white">
              <v-icon left x-small>mdi-check-circle</v-icon>
              {{ getVerifiedCount() }} Verifiziert
            </v-chip>
            <v-chip class="mr-2" small color="orange" text-color="white">
              <v-icon left x-small>mdi-alert-circle</v-icon>
              {{ getSuspendedCount() }} Suspendiert
            </v-chip>
          </v-col>
        </v-row>

        <div v-if="paginatedUsers.length > 0">
          <v-virtual-scroll
            :items="paginatedUsers"
            :item-height="100"
            height="700"
          >
            <template v-slot:default="{ item }">
              <v-list-item
                :key="item.id"
                class="elevation-2 mx-1 mb-2"
                :class="getListItemClass(item)"
                dense
                @click="openUserDetail(item)"
              >
                <v-list-item-avatar>
                  <v-avatar
                    :color="getAvatarColor(item)"
                    size="40"
                    class="white--text font-weight-bold"
                  >
                    {{ getUserInitials(item) }}
                  </v-avatar>
                </v-list-item-avatar>

                <v-list-item-content>
                  <v-list-item-title class="d-flex align-center">
                    <span>{{ getUserName(item) }}</span>
                    <v-icon
                      v-if="item.isVerified"
                      left
                      x-small
                      class="ml-1"
                      color="success"
                    >
                      mdi-check-decagram
                    </v-icon>
                    <v-chip
                      v-if="item.isSuspended"
                      color="orange"
                      text-color="white"
                      x-small
                      class="ml-1"
                    >
                      <v-icon left x-small>mdi-alert</v-icon>
                      Suspendiert
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle class="d-flex align-center flex-wrap">
                    <span class="">{{ item.id }}</span>
                  </v-list-item-subtitle>

                  <v-list-item-subtitle class="d-flex align-center flex-wrap">
                    <span
                      v-if="item.roles && item.roles?.length > 0"
                      class="text-caption"
                    >
                      {{ item.roles.length }} Rolle(n):
                      {{ getRoleNames(item.roles).slice(0, 3).join(", ") }}
                      <span v-if="item.roles.length > 3">...</span>
                    </span>
                  </v-list-item-subtitle>

                  <!-- Mandanten Zugehörigkeit -->
                  <v-list-item-subtitle
                    v-if="getUserMemberships(item.id).length > 0"
                    class="d-flex align-center flex-wrap mt-1"
                  >
                    <v-icon x-small class="mr-1">mdi-domain</v-icon>
                    <span class="text-caption mr-1">
                      {{ getUserMemberships(item.id).length }} Mandant(en):
                    </span>
                    <v-chip
                      v-for="(membership, idx) in getUserMemberships(
                        item.id
                      ).slice(0, 2)"
                      :key="idx"
                      x-small
                      class="mr-1"
                      :color="membership.owner ? 'amber' : 'blue-grey'"
                      :text-color="membership.owner ? 'black' : 'white'"
                    >
                      <v-icon
                        v-if="membership.owner"
                        left
                        x-small
                        class="mr-1"
                      >
                        mdi-crown
                      </v-icon>
                      {{ getTenantName(membership.tenantId) }}
                    </v-chip>
                    <span
                      v-if="getUserMemberships(item.id).length > 2"
                      class="text-caption"
                    >
                      +{{ getUserMemberships(item.id).length - 2 }} weitere
                    </span>
                  </v-list-item-subtitle>

                  <v-list-item-subtitle
                    v-if="item.created"
                    class="text-caption mt-1"
                  >
                    Beigetreten:
                    {{
                      Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(item.created))
                    }}
                  </v-list-item-subtitle>
                </v-list-item-content>

                <v-list-item-action v-if="item.id !== 'super-admin'">
                  <v-menu offset-y>
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        icon
                        v-bind="attrs"
                        v-on="on"
                        small
                        color="grey darken-1"
                      >
                        <v-icon small>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list dense>
                      <v-list-item
                        link
                        @click="onOpenEditUser(item.id)"
                        :disabled="!UserPermissionService.allowUpdate(item)"
                      >
                        <v-list-item-icon>
                          <v-icon small>mdi-pencil</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title>
                          Benutzer bearbeiten
                        </v-list-item-title>
                      </v-list-item>

                      <v-divider />

                      <v-list-item
                        link
                        @click="onOpenDeleteDialog(item.id)"
                        :disabled="!UserPermissionService.allowDelete(item)"
                      >
                        <v-list-item-icon>
                          <v-icon small color="red">mdi-delete</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title>Benutzer löschen</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-list-item-action>
              </v-list-item>
            </template>
          </v-virtual-scroll>
        </div>

        <!-- Pagination -->
        <v-pagination
          v-if="totalPages > 1"
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          class="mt-4"
        />

        <!-- Loading State -->
        <v-progress-linear v-if="loading" indeterminate />

        <!-- Empty State -->
        <v-card
          v-if="!loading && filteredUsers.length === 0"
          class="text-center py-8"
          flat
        >
          <v-icon size="48" color="grey lighten-2">mdi-account-group</v-icon>
          <v-card-title class="justify-center grey--text">
            Keine Benutzer gefunden
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <UserEdit
      :user="selectedUser"
      :roles="api.roles"
      :open="openEditDialog"
      @close="onCloseDialog"
    />
    <UserDeleteConformationDialog
      :toDelete="selectedUser"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiUsersService from "@/services/api/ApiUsersService";
import ApiRolesService from "@/services/api/ApiRolesService";
import UserEdit from "@/components/User/UserEdit";
import UserDeleteConformationDialog from "@/components/User/userDeleteConformationDialog";
import UserPermissionService from "@/services/permissions/UserPermissionService";
import Fuse from "fuse.js";
import ApiMembershipService from "@/services/api/ApiMembershipService";

export default {
  components: {
    UserDeleteConformationDialog,
    AdminLayout,
    UserEdit,
  },
  data() {
    return {
      api: {
        users: [],
        roles: [],
        memberships: [],
      },
      search: "",
      verifiedFilter: false,
      suspendedFilter: false,
      roleFilter: [],
      tenantFilter: [],
      openEditDialog: false,
      openDeleteDialog: false,
      selectedUser: {},
      currentPage: 1,
      itemsPerPage: 8,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenants: "tenants/tenants",
    }),
    UserPermissionService() {
      return UserPermissionService;
    },
    hasActiveFilters() {
      return (
        this.verifiedFilter ||
        this.suspendedFilter ||
        this.roleFilter.length > 0 ||
        this.tenantFilter.length > 0
      );
    },
    filteredUsers() {
      let filtered = this.api.users;

      // Search filter
      if (this.search) {
        const fuse = new Fuse(filtered, {
          keys: ["id", "firstName", "lastName"],
          threshold: 0.4,
          ignoreLocation: true,
        });
        filtered = fuse.search(this.search).map((result) => result.item);
      }

      // Verified filter
      if (this.verifiedFilter) {
        filtered = filtered.filter((user) => user.isVerified);
      }

      // Suspended filter
      if (this.suspendedFilter) {
        filtered = filtered.filter((user) => user.isSuspended);
      }

      // Role filter
      if (this.roleFilter.length > 0) {
        filtered = filtered.filter((user) =>
          user.roles?.some((role) => this.roleFilter.includes(role))
        );
      }

      // Tenant filter
      if (this.tenantFilter.length > 0) {
        filtered = filtered.filter((user) => {
          const userMemberships = this.getUserMemberships(user.id);
          return userMemberships.some((m) =>
            this.tenantFilter.includes(m.tenantId)
          );
        });
      }

      return filtered;
    },
    totalPages() {
      return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    },
    paginatedUsers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredUsers.slice(start, end);
    },
  },
  watch: {
    filteredUsers() {
      this.currentPage = 1;
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),

    async fetchUsers() {
      await this.startLoading("fetch-users");
      try {
        const response = await ApiUsersService.getUsers();
        this.api.users = response;
      } catch (error) {
        console.error(error);
      } finally {
        await this.stopLoading("fetch-users");
      }
    },

    async fetchRoles() {
      try {
        const response = await ApiRolesService.getRoles();
        this.api.roles = response.data || response;
      } catch (error) {
        console.error(error);
      }
    },

    async fetchMemberships() {
      try {
        const response = await ApiMembershipService.getMemberships();
        this.api.memberships = response.data || response;
      } catch (error) {
        console.error(error);
      }
    },

    toggleRoleFilter(roleId) {
      const index = this.roleFilter.indexOf(roleId);
      if (index > -1) {
        this.roleFilter.splice(index, 1);
      } else {
        this.roleFilter.push(roleId);
      }
    },

    toggleTenantFilter(tenantId) {
      const index = this.tenantFilter.indexOf(tenantId);
      if (index > -1) {
        this.tenantFilter.splice(index, 1);
      } else {
        this.tenantFilter.push(tenantId);
      }
    },

    getUserMemberships(userId) {
      return this.api.memberships.filter((m) => m.userId === userId);
    },

    getTenantName(tenantId) {
      const tenant = this.tenants.find((t) => t.id === tenantId);
      return tenant?.name || tenantId.substring(0, 8);
    },

    getVerifiedCount() {
      return this.filteredUsers.filter((user) => user.isVerified).length;
    },

    getSuspendedCount() {
      return this.filteredUsers.filter((user) => user.isSuspended).length;
    },

    getUserInitials(user) {
      if (user.firstName && user.lastName) {
        return (
          user.firstName.charAt(0).toUpperCase() +
          user.lastName.charAt(0).toUpperCase()
        );
      }
      return user.id.substring(0, 2).toUpperCase();
    },

    getUserName(user) {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      return user.id;
    },

    getAvatarColor(user) {
      if (user.isSuspended) return "orange";
      if (user.isVerified) return "green";
      return "blue-grey";
    },

    getListItemClass(user) {
      return {
        "suspended-item": user.isSuspended,
        "verified-item": user.isVerified && !user.isSuspended,
      };
    },

    getRoleNames(roleIds) {
      if (!roleIds) return [];
      return roleIds.map((id) => this.getRoleName(id)).filter(Boolean);
    },

    getRoleName(roleId) {
      return this.api.roles.find((role) => role.id === roleId)?.name || roleId;
    },

    openUserDetail(user) {
      this.onOpenEditUser(user.id);
    },

    onOpenEditUser(userId) {
      this.selectedUser = Object.assign(
        {},
        this.api.users.find((user) => user.id === userId)
      );
      this.openEditDialog = true;
    },

    onOpenDeleteDialog(userId) {
      this.selectedUser = Object.assign(
        {},
        this.api.users.find((user) => user.id === userId)
      );
      this.openDeleteDialog = true;
    },

    onCloseDialog() {
      this.fetchUsers();
      this.openEditDialog = false;
    },

    onCloseDeleteDialog() {
      this.fetchUsers();
      this.openDeleteDialog = false;
    },
  },

  async created() {
    await this.fetchRoles();
    await this.fetchUsers();
    await this.fetchMemberships();
  },
};
</script>

<style scoped>
.verified-item {
  border-left: 3px solid #4caf50;
}

.suspended-item {
  border-left: 3px solid #ff9800;
  opacity: 0.8;
}
</style>

<style>
/* Make list items lighter in dark mode */
.theme--dark .v-list-item.elevation-2 {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
