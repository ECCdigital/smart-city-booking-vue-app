<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <SearchBar
          v-model="search"
          :fields="$t('user.list.search')"
          :filters="filterSections"
          @filter="onFilter"
        />

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
            height="650"
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
                      <v-icon v-if="membership.owner" left x-small class="mr-1">
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
                    v-else
                    class="d-flex align-center flex-wrap mt-1"
                  >
                    <v-icon x-small class="mr-1">mdi-domain-off</v-icon>
                    <span class="text-caption">
                      Keine Mandanten Zugehörigkeit
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
      :tenants="api.tenants"
      :memberships="selectedUserMemberships"
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
import ApiMembershipService from "@/services/api/ApiMembershipService";
import ApiTenantService from "@/services/api/ApiTenantService";
import SearchBar from "@/components/commons/SearchBar.vue";

/** The option "Ohne Mandantenzuordnung" among the tenants of the filter. */
const NO_TENANT = "__no-tenant__";

export default {
  components: {
    UserDeleteConformationDialog,
    AdminLayout,
    UserEdit,
    SearchBar,
  },
  data() {
    return {
      api: {
        users: [],
        roles: [],
        memberships: [],
        tenants: [],
      },
      search: "",
      verifiedFilter: false,
      suspendedFilter: false,
      noTenantFilter: false,
      tenantFilter: [],
      openEditDialog: false,
      openDeleteDialog: false,
      selectedUser: {},
      selectedUserMemberships: [],
      currentPage: 1,
      itemsPerPage: 6,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
    }),
    UserPermissionService() {
      return UserPermissionService;
    },
    /** Status and tenant behind the funnel of the search. */
    filterSections() {
      return [
        {
          key: "status",
          label: "Status",
          selected: [
            ...(this.verifiedFilter ? ["verified"] : []),
            ...(this.suspendedFilter ? ["suspended"] : []),
          ],
          options: [
            {
              value: "verified",
              label: "Nur verifiziert",
              icon: "mdi-check-circle",
              color: "green",
            },
            {
              value: "suspended",
              label: "Nur suspendiert",
              icon: "mdi-alert-circle",
              color: "orange",
            },
          ],
        },
        {
          key: "tenant",
          label: "Mandant",
          selected: this.noTenantFilter ? [NO_TENANT] : this.tenantFilter,
          options: [
            {
              value: NO_TENANT,
              label: "Ohne Mandantenzuordnung",
              icon: "mdi-domain-off",
            },
            ...this.api.tenants.map((tenant) => ({
              value: tenant.id,
              label: tenant.name,
              icon: "mdi-domain",
            })),
          ],
        },
      ];
    },
    filteredUsers() {
      let filtered = this.api.users;

      if (this.search) {
        const searchLower = this.search.toLowerCase().trim();
        if (searchLower) {
          filtered = filtered.filter((user) => {
            const fullName = `${user.firstName || ""} ${
              user.lastName || ""
            }`.trim();
            return [user.id, user.firstName, user.lastName, fullName].some(
              (field) => field?.toLowerCase().includes(searchLower)
            );
          });
        }
      }

      if (this.verifiedFilter) {
        filtered = filtered.filter((user) => user.isVerified);
      }

      if (this.suspendedFilter) {
        filtered = filtered.filter((user) => user.isSuspended);
      }

      if (this.noTenantFilter) {
        filtered = filtered.filter(
          (user) => this.getUserMemberships(user.id).length === 0
        );
      }

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
    noTenantFilter(val) {
      if (val) {
        this.tenantFilter = [];
      }
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

    async fetchTenants() {
      try {
        const response = await ApiTenantService.getTenants();
        this.api.tenants = response.data;
      } catch (error) {
        console.log(error);
      }
    },

    onFilter(key, selection) {
      if (key === "status") {
        this.verifiedFilter = selection.includes("verified");
        this.suspendedFilter = selection.includes("suspended");
      }
      if (key === "tenant") {
        // "Ohne Mandantenzuordnung" and a tenant exclude each other: the
        // newer pick wins (the watcher empties the tenants).
        if (selection.includes(NO_TENANT) && !this.noTenantFilter) {
          this.noTenantFilter = true;
        } else {
          this.noTenantFilter = false;
          this.tenantFilter = selection.filter((value) => value !== NO_TENANT);
        }
      }
    },

    getUserMemberships(userId) {
      return this.api.memberships.filter((m) => m.userId === userId);
    },

    getTenantName(tenantId) {
      const tenant = this.api.tenants.find((t) => t.id === tenantId);
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
      this.selectedUserMemberships = this.getUserMemberships(userId);
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
    await this.fetchTenants();
  },
};
</script>

<style scoped></style>

<style>
/* Make list items lighter in dark mode */
.theme--dark .v-list-item.elevation-2 {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
