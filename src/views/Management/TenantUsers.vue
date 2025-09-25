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
                <v-btn icon v-bind="attrs" v-on="on">
                  <v-icon>mdi-filter-variant</v-icon>
                </v-btn>
              </template>

              <v-list dense>
                <v-subheader>Status</v-subheader>
                <v-list-item
                  dense
                  v-for="(opt, i) in statusOptions"
                  :key="i"
                  @click="
                    {
                      const index = statusFilter.indexOf(opt.value);
                      if (index > -1) {
                        statusFilter.splice(index, 1);
                      } else {
                        statusFilter.push(opt.value);
                      }
                    }
                  "
                >
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="statusFilter.includes(opt.value)"
                      @change.prevent
                    />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>{{ opt.text }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
              <v-list dense>
                <v-subheader>Rolle</v-subheader>
                <v-list-item
                  dense
                  v-for="(opt, i) in api.roles"
                  :key="i"
                  @click="
                    {
                      const index = roleFilter.indexOf(opt.id);
                      if (index > -1) {
                        roleFilter.splice(index, 1);
                      } else {
                        roleFilter.push(opt.id);
                      }
                    }
                  "
                >
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="roleFilter.includes(opt.id)"
                      @change.prevent
                    />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>{{ opt.name }}</v-list-item-title>
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
              {{ filteredMembers.length }} Benutzer
            </v-chip>
            <v-chip class="mr-2" small color="green" text-color="white">
              {{ getStatusCount("active") }} Aktiv
            </v-chip>
            <v-chip class="mr-2" small color="orange" text-color="white">
              {{ getStatusCount("pending") }} Ausstehend
            </v-chip>
            <v-chip class="mr-2" small color="amber" text-color="black">
              <v-icon left x-small>mdi-crown</v-icon>
              {{ getOwnerCount() }} Besitzer
            </v-chip>
          </v-col>
        </v-row>

        <div v-if="viewMode === 'compact' && paginatedMembers.length > 0">
          <v-virtual-scroll
            :items="paginatedMembers"
            :item-height="72"
            height="600"
          >
            <template v-slot:default="{ item }">
              <v-list-item
                :key="item.userId"
                class="elevation-2 mx-1"
                :class="getListItemClass(item)"
                dense
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
                      >mdi-check-decagram</v-icon
                    >
                    <v-chip
                      v-if="item.owner"
                      color="amber"
                      text-color="amber darken-4"
                      x-small
                      class="ml-1"
                    >
                      <v-icon left x-small>mdi-crown</v-icon>
                      Besitzer
                    </v-chip>
                  </v-list-item-title>
                  <v-list-item-subtitle class="d-flex align-center flex-wrap">
                    <span class="">{{ item.userId }}</span>
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="d-flex align-center flex-wrap">
                    <v-chip
                      :color="getStatusColor(item.status)"
                      text-color="white"
                      x-small
                      class="mr-2"
                    >
                      {{ getStatusText(item.status) }}
                    </v-chip>
                    <span
                      v-if="item.roleStatuses && item.roleStatuses.length > 0"
                      class="text-caption"
                    >
                      {{ item.roleStatuses.length }} Rolle(n):
                      {{
                        getRoleNames(item.roleStatuses.map((r) => r.role))
                          .slice(0, 3)
                          .join(", ")
                      }}
                      <span v-if="item.roleStatuses.length > 3">...</span>
                    </span>
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
                      <v-list-item link @click="editUserRoles(item.userId)">
                        <v-list-item-icon>
                          <v-icon small>mdi-pencil</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title>Rollen bearbeiten</v-list-item-title>
                      </v-list-item>

                      <v-list-item
                        v-if="
                          item.status === 'pending' ||
                          item.status === 'rejected'
                        "
                        link
                        @click="resendInvite(item.userId)"
                      >
                        <v-list-item-icon>
                          <v-icon small>mdi-send</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title
                          >Einladung erneut senden</v-list-item-title
                        >
                      </v-list-item>

                      <v-list-item
                        v-if="item.status === 'suspended'"
                        link
                        @click="activateUser(item.userId)"
                      >
                        <v-list-item-icon>
                          <v-icon small color="green">mdi-account-check</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title>Aktivieren</v-list-item-title>
                      </v-list-item>

                      <v-list-item
                        v-if="item.status === 'active'"
                        link
                        @click="suspendUser(item.userId)"
                      >
                        <v-list-item-icon>
                          <v-icon small color="orange"
                            >mdi-account-cancel</v-icon
                          >
                        </v-list-item-icon>
                        <v-list-item-title>Sperren</v-list-item-title>
                      </v-list-item>

                      <v-divider />

                      <v-list-item
                        link
                        @click="addTenantOwner(item.userId)"
                        v-if="!item.owner"
                      >
                        <v-list-item-icon>
                          <v-icon small color="amber">mdi-crown</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title
                          >Zum Besitzer machen</v-list-item-title
                        >
                      </v-list-item>

                      <v-list-item
                        link
                        @click="removeTenantOwner(item.userId)"
                        v-if="item.owner"
                      >
                        <v-list-item-icon>
                          <v-icon small>mdi-account</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title
                          >Besitzer-Status entfernen</v-list-item-title
                        >
                      </v-list-item>

                      <v-divider />

                      <v-list-item link @click="removeTenantUser(item.userId)">
                        <v-list-item-icon>
                          <v-icon small color="red">mdi-delete</v-icon>
                        </v-list-item-icon>
                        <v-list-item-title>Entfernen</v-list-item-title>
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
          v-if="!loading && filteredMembers.length === 0"
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

    <v-btn
      fixed
      large
      bottom
      right
      rounded
      color="primary"
      @click="showInviteDialog = true"
    >
      <v-icon class="mr-2">mdi-account-plus</v-icon>
      Benutzer einladen
    </v-btn>

    <TenantInviteUserDialog
      :open="showInviteDialog"
      :roles="api.roles"
      :members="members"
      :invitation-links.sync="api.invitations"
      :tenantId="tenantId"
      @close="showInviteDialog = false"
      @invite="inviteMultipleUsers"
      @toast="addToast"
      @createLink="createInvitationLink"
      @deleteLink="deleteLink"
    ></TenantInviteUserDialog>

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
import ApiInvitationService from "@/services/api/ApiInvitationService";
import ToastService from "@/services/ToastService";
import TenantUserEditRoleDialog from "@/components/Tenant/TenantUserEditRoleDialog.vue";
import Fuse from "fuse.js";
import TenantInviteUserDialog from "@/components/Tenant/TenantInviteUserDialog.vue";

export default {
  components: {
    TenantInviteUserDialog,
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
      search: "",
      statusFilter: [],
      roleFilter: [],
      showEditRolesDialog: false,
      selectedUser: null,
      isLoading: false,
      newUserId: null,
      newRoleIds: [],
      inviteType: "invite",
      viewMode: "compact",
      currentPage: 1,
      itemsPerPage: 50,
      showInviteDialog: false,
      api: {
        users: [],
        roles: [],
        userDetails: [],
        invitations: [],
      },
      inviteOptions: [
        { text: "Einladen (E-Mail senden)", value: "invite" },
        { text: "Direkt hinzufügen", value: "manual" },
      ],
      statusOptions: [
        { text: "Ausstehend", value: "pending" },
        { text: "Aktiv", value: "active" },
        { text: "Gesperrt", value: "suspended" },
        { text: "Abgelehnt", value: "rejected" },
      ],
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    members() {
      return this.api.users.map((user) => {
        const details = this.api.userDetails.find(
          (detail) => detail.id === user.userId
        );
        const firstName = details?.firstName || "";
        const lastName = details?.lastName || "";
        return {
          ...user,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          isVerified: details?.isVerified || false,
        };
      });
    },
    filteredMembers() {
      let filtered = this.members;

      if (this.search) {
        const fuse = new Fuse(filtered, {
          keys: ["userId", "firstName", "lastName", "fullName"],
          threshold: 0.4,
          ignoreLocation: true,
        });
        filtered = fuse.search(this.search).map((result) => result.item);
      }

      if (this.statusFilter.length > 0) {
        filtered = filtered.filter((user) =>
          this.statusFilter.includes(user.status)
        );
      }

      if (this.roleFilter.length > 0) {
        filtered = filtered.filter((user) =>
          user.roles.some((role) => this.roleFilter.includes(role))
        );
      }

      return filtered;
    },
    totalPages() {
      return Math.ceil(this.filteredMembers.length / this.itemsPerPage);
    },
    paginatedMembers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredMembers.slice(start, end);
    },
  },
  watch: {
    filteredMembers() {
      this.currentPage = 1;
    },
    async tenantId() {
      await this.fetchRoles();
      await this.fetchTenantUsers();
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),

    getStatusCount(status) {
      return this.filteredMembers.filter((user) => user.status === status)
        .length;
    },

    getOwnerCount() {
      return this.filteredMembers.filter((user) => user.owner).length;
    },

    getRoleNames(roleIds) {
      return roleIds.map((id) => this.getRoleById(id)?.name || id);
    },

    getListItemClass(user) {
      return {
        "owner-item": user.owner,
        "pending-item": user.status === "pending",
        "suspended-item":
          user.status === "suspended" || user.status === "rejected",
      };
    },

    getUserInitials(user) {
      if (user.firstName && user.lastName) {
        return (
          user.firstName.charAt(0).toUpperCase() +
          user.lastName.charAt(0).toUpperCase()
        );
      }
      return user.userId.substring(0, 2).toUpperCase();
    },

    getUserName(user) {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      return user.userId;
    },

    getAvatarColor(user) {
      if (user.owner) return "amber darken-2";
      if (user.status === "active") return "green";
      if (user.status === "pending") return "blue-grey";
      return "grey";
    },

    getStatusColor(status) {
      const colors = {
        active: "green",
        pending: "orange",
        suspended: "red",
      };
      return colors[status] || "grey";
    },

    getStatusText(status) {
      const texts = {
        active: "Aktiv",
        pending: "Ausstehend",
        suspended: "Gesperrt",
        rejected: "Abgelehnt",
      };
      return texts[status] || status;
    },

    editUserRoles(userId) {
      this.selectedUser = this.api.users.find((user) => user.userId === userId);
      this.showEditRolesDialog = true;
    },

    async fetchRoles() {
      const response = await ApiRolesService.getTenantRoles(this.tenantId);
      this.api.roles = response.data;
    },

    async fetchInvitations() {
      const response = await ApiInvitationService.getTenantInvitations(
        this.tenantId
      );
      this.api.invitations = response.data;
    },

    async fetchTenantUsers() {
      await this.startLoading("fetch-users");
      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;
      } finally {
        await this.stopLoading("fetch-users");
      }
    },

    async inviteMultipleUsers(users) {
      try {
        this.isLoading = true;

        for (const user of users) {
          await ApiTenantService.addTenantUser(
            this.tenantId,
            user.email,
            user.roles,
            "invite"
          );
        }

        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;

        await this.addToast({
          type: "success",
          message: `${users.length} Benutzer wurden erfolgreich eingeladen.`,
        });
      } catch (error) {
        await this.addToast({
          type: "error",
          message: `Fehler beim Einladen der Benutzer: ${error.message}`,
        });
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
          this.newRoleIds,
          this.inviteType
        );

        this.newUserId = null;
        this.newRoleIds = [];

        this.api.users = response.users;
        this.api.userDetails = response.userDetails;

        await this.addToast(
          ToastService.createToast("tenant.addUser.success", "success")
        );
      } catch (e) {
        if (e.response?.status === 404) {
          await this.addToast(
            ToastService.createToast("tenant.error.user-not-found", "error")
          );
        } else {
          console.error(e);
        }
      } finally {
        this.isLoading = false;
      }
    },

    async resendInvite(userId) {
      try {
        this.isLoading = true;
        await ApiInvitationService.resendInvitation(this.tenantId, userId);
        await this.addToast(
          ToastService.createToast("invitation.resend", "success")
        );
        await this.fetchTenantUsers();
        await this.fetchInvitations();
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    async activateUser(userId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.updateUserStatus(
          this.tenantId,
          userId,
          "active"
        );
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;
        await this.addToast(
          ToastService.createToast("tenant.updateStatus.success", "success")
        );
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    async suspendUser(userId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.updateUserStatus(
          this.tenantId,
          userId,
          "suspended"
        );
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;
        await this.addToast(
          ToastService.createToast("tenant.updateStatus.success", "success")
        );
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    async removeTenantUser(userId) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.removeTenantUser(
          this.tenantId,
          userId
        );
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;
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
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;
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
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;
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
        this.api.userDetails = response.userDetails;
        this.showEditRolesDialog = false;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    getRoleById(roleId) {
      return this.api.roles.find((role) => role.id === roleId);
    },

    async createInvitationLink(linkData) {
      try {
        this.isLoading = true;

        await ApiInvitationService.createMultiUseInvitation({
          tenantId: this.tenantId,
          roles: linkData.roles,
          expiresAt: linkData.expiresAt,
          maxUses: linkData.maxUses,
        });

        await this.fetchInvitations();

        await this.addToast({
          type: "success",
          message: "Einladungslink wurde erfolgreich erstellt",
        });
      } catch (error) {
        await this.addToast({
          type: "error",
          message: "Fehler beim Erstellen des Einladungslinks",
        });
      } finally {
        this.isLoading = false;
      }
    },

    async deleteLink(linkId) {
      try {
        this.isLoading = true;
        await ApiInvitationService.deleteInvitation(this.tenantId, linkId);
        await this.fetchInvitations();
        await this.addToast({
          type: "success",
          message: "Einladungslink wurde erfolgreich gelöscht",
        });
      } catch (error) {
        console.error("Failed to delete invitation link:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },

  async created() {
    await this.fetchRoles();
    await this.fetchTenantUsers();
    await this.fetchInvitations();
  },
};
</script>

<style scoped>
.owner-item {
  border-left-color: #ffa726;
}

.pending-item {
  border-left-color: #ff9800;
}

.suspended-item {
  border-left-color: #f44336;
  opacity: 0.8;
}

.user-card-small {
  height: 120px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.user-card-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.owner-card {
  border-left-color: #ffa726;
}

.pending-card {
  border-left-color: #ff9800;
}

.suspended-card {
  border-left-color: #f44336;
  opacity: 0.8;
}
</style>

<style>
/* Make list items lighter in dark mode */
.theme--dark .v-list-item.elevation-2 {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
