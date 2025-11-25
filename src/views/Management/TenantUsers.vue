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
                <v-subheader>Besitzer</v-subheader>
                <v-list-item @click="ownerOnly = !ownerOnly">
                  <v-list-item-action>
                    <v-checkbox :input-value="ownerOnly" @change.prevent />
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Nur Besitzer anzeigen</v-list-item-title>
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
            <v-chip class="mr-2" small color="red" text-color="white">
              {{ getStatusCount("suspended") }} Gesperrt
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
                      v-if="item.roles && item.roles?.length > 0"
                      class="text-caption"
                    >
                      {{ item.roles.length }} Rolle(n):
                      {{ getRoleNames(item.roles).slice(0, 3).join(", ") }}
                      <span v-if="item.roles.length > 3">...</span>
                    </span>
                  </v-list-item-subtitle>

                  <v-list-item-subtitle
                    v-if="hasFailedInvitation(item)"
                    class="d-flex align-center flex-wrap mt-1"
                  >
                    <v-chip x-small color="red" text-color="white" class="mr-2">
                      Einladung fehlgeschlagen
                    </v-chip>
                    <span class="text-caption">
                      {{
                        getFailedInvitations(item)
                          .map((fi) => fi.reasonText)
                          .join(" | ")
                      }}
                    </span>
                  </v-list-item-subtitle>

                  <v-list-item-subtitle
                    v-if="
                      hasPendingApprovalInvitation(item) &&
                      item.status !== 'suspended'
                    "
                    class="d-flex align-center flex-wrap mt-1"
                  >
                    <v-chip
                      x-small
                      color="blue darken-1"
                      text-color="white"
                      class="mr-2"
                    >
                      Wartet auf Freigabe
                    </v-chip>
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
                        v-if="item.status !== 'suspended'"
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

                      <v-list-item
                        v-if="hasPendingApprovalInvitation(item)"
                        link
                        @click="approveInvitation(item.userId)"
                      >
                        <v-list-item-icon>
                          <v-icon small color="blue darken-1"
                            >mdi-account-check</v-icon
                          >
                        </v-list-item-icon>
                        <v-list-item-title>Freigeben</v-list-item-title>
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

    <TenantUserDetailDialog
      :open="showUserDetailDialog"
      :user="selectedUser"
      :roles="api.roles"
      :challenges="api.challenges"
      @close="closeUserDetail"
      @save-roles="updateUserRoles"
      @update-status="updateUserStatus"
      @resend-invite="resendInvite(selectedUser?.userId)"
      @approve-challenge="approveChallenge"
      @reject-challenge="rejectChallenge"
      @add-owner="addTenantOwner(selectedUser?.userId)"
      @remove-owner="removeTenantOwner(selectedUser?.userId)"
      @delete-user="removeTenantUser(selectedUser?.userId)"
      @delete-invitation="handleDeleteInvitation"
    />

    <TenantInviteUserDialog
      :open="showInviteDialog"
      :roles="api.roles"
      :challenges="api.challenges.filter((c) => c.enabled)"
      :members="members"
      :invitation-links.sync="api.invitations"
      :tenantId="tenantId"
      @close="showInviteDialog = false"
      @invite="inviteMultipleUsers"
      @toast="addToast"
      @createLink="createInvitationLink"
      @deleteLink="deleteLink"
    ></TenantInviteUserDialog>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInvitationService from "@/services/api/ApiInvitationService";
import ToastService from "@/services/ToastService";
import Fuse from "fuse.js";
import TenantInviteUserDialog from "@/components/Tenant/TenantInviteUserDialog.vue";
import ApiChallengeService from "@/services/api/ApiChallengeService";
import TenantUserDetailDialog from "@/components/Tenant/TenantUserDetailsDialog.vue";

export default {
  components: {
    TenantUserDetailDialog,
    TenantInviteUserDialog,
    AdminLayout,
  },
  data() {
    return {
      valid: true,
      search: "",
      statusFilter: [],
      roleFilter: [],
      ownerOnly: false,
      showUserDetailDialog: false,
      selectedUser: null,
      isLoading: false,
      viewMode: "compact",
      currentPage: 1,
      itemsPerPage: 8,
      showInviteDialog: false,
      api: {
        users: [],
        roles: [],
        userDetails: [],
        invitations: [],
        challenges: [],
      },
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

      if (this.ownerOnly) {
        filtered = filtered.filter((user) => user.owner);
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

    hasActiveFilters() {
      return (
        this.statusFilter.length > 0 ||
        this.roleFilter.length > 0 ||
        this.ownerOnly
      );
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

    openUserDetail(user) {
      this.selectedUser = user;
      this.showUserDetailDialog = true;
    },

    closeUserDetail() {
      this.showUserDetailDialog = false;
      this.selectedUser = null;
    },

    async updateUserRoles(roleIds) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.editTenantUserRoles(
          this.tenantId,
          this.selectedUser.userId,
          roleIds
        );
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;

        // Update selected user
        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );

        await this.addToast({
          type: "success",
          message: "Rollen wurden erfolgreich aktualisiert",
        });
      } catch (e) {
        console.error(e);
        await this.addToast({
          type: "error",
          message: "Fehler beim Aktualisieren der Rollen",
        });
      } finally {
        this.isLoading = false;
      }
    },

    async updateUserStatus(status) {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.updateUserStatus(
          this.tenantId,
          this.selectedUser.userId,
          status
        );
        this.api.users = response.users;
        this.api.userDetails = response.userDetails;

        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );

        await this.addToast({
          type: "success",
          message: "Status wurde erfolgreich aktualisiert",
        });
      } catch (e) {
        console.error(e);
        await this.addToast({
          type: "error",
          message: "Fehler beim Aktualisieren des Status",
        });
      } finally {
        this.isLoading = false;
      }
    },

    async handleDeleteInvitation(token) {
      try {
        this.isLoading = true;
        await ApiInvitationService.deleteUserInvitation(
          this.tenantId,
          this.selectedUser.userId,
          token
        );

        await this.fetchTenantUsers();
        await this.fetchInvitations();

        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );

        await this.addToast({
          type: "success",
          message: "Einladung wurde erfolgreich gelöscht",
        });
      } catch (error) {
        await this.addToast({
          type: "error",
          message: "Fehler beim Löschen der Einladung",
        });
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },

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

    async fetchRoles() {
      const response = await ApiRolesService.getTenantRoles(this.tenantId);
      this.api.roles = response.data;
    },

    async fetchChallenges() {
      const response = await ApiChallengeService.getChallenges(this.tenantId);
      this.api.challenges = response.data;
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
            user.challenges,
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
        this.openUserDetailDialog = false;
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

        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );
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

        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );
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
          challenges: linkData.challenges || [],
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

    mapInvitationReasonToGerman(code) {
      const map = {
        INVALID_DOMAIN: "Ungültige Domain",
        BOUNCED: "E-Mail konnte nicht zugestellt werden",
        BLOCKED: "E-Mail blockiert",
        RATE_LIMIT: "Zu viele Versuche",
        EXPIRED: "Einladungslink abgelaufen",
        ALREADY_MEMBER: "Benutzer ist bereits Mitglied",
        NOT_ALLOWED: "Nicht erlaubt",
        UNKNOWN: "Unbekannter Fehler",
      };
      return map[code] || code;
    },
    getFailedInvitations(user) {
      if (!user?.invitations?.length) return [];
      return user.invitations
        .filter((i) => i.status === "failed")
        .map((i) => {
          const reasons =
            typeof i.reason === "string" && i.reason.length > 0
              ? i.reason
                  .split(";")
                  .map((r) => r.trim())
                  .filter(Boolean)
              : [];
          const reasonText =
            reasons.length > 0
              ? reasons.map(this.mapInvitationReasonToGerman).join(", ")
              : "Fehler";
          return { ...i, reasons, reasonText };
        });
    },
    hasFailedInvitation(user) {
      return this.getFailedInvitations(user).length > 0;
    },
    getPendingApprovalInvitations(user) {
      if (!user?.invitations?.length) return [];
      return user.invitations.filter((i) => i.status === "pending_approval");
    },
    hasPendingApprovalInvitation(user) {
      return this.getPendingApprovalInvitations(user).length > 0;
    },
    async approveChallenge({ challengeId, invitationToken }) {
      try {
        this.isLoading = true;
        await ApiInvitationService.approveChallenge(
          this.tenantId,
          challengeId,
          invitationToken,
          this.selectedUser.userId
        );

        await this.addToast({
          type: "success",
          message: "Challenge wurde erfolgreich freigegeben",
        });

        await this.fetchTenantUsers();
        await this.fetchInvitations();

        // Update selected user
        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );
      } catch (e) {
        await this.addToast({
          type: "error",
          message: "Freigabe der Challenge ist fehlgeschlagen",
        });
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    async rejectChallenge({ challengeId, invitationToken }) {
      try {
        this.isLoading = true;
        await ApiInvitationService.rejectChallenge(
          this.tenantId,
          challengeId,
          invitationToken,
          this.selectedUser.userId
        );

        await this.addToast({
          type: "success",
          message: "Challenge wurde abgelehnt",
        });

        await this.fetchTenantUsers();
        await this.fetchInvitations();

        // Update selected user
        this.selectedUser = this.members.find(
          (u) => u.userId === this.selectedUser.userId
        );
      } catch (e) {
        await this.addToast({
          type: "error",
          message: "Ablehnung der Challenge ist fehlgeschlagen",
        });
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    async approveInvitation(userID) {
      const invitation = this.getPendingApprovalInvitations(
        this.api.users.find((u) => u.userId === userID)
      )[0];
      if (!invitation) {
        return;
      }
      const challengeID = invitation.challengeStates.find(
        (cs) => cs.status === "pending_approval"
      )?.challengeId;

      if (challengeID) {
        try {
          this.isLoading = true;
          await ApiInvitationService.approveChallenge(
            this.tenantId,
            challengeID,
            invitation.token,
            userID
          );

          await this.addToast({
            type: "success",
            message: "Einladung wurde freigegeben.",
          });

          await this.fetchTenantUsers();
          await this.fetchInvitations();
        } catch (e) {
          await this.addToast({
            type: "error",
            message: "Freigabe der Einladung ist fehlgeschlagen.",
          });
          console.error(e);
        } finally {
          this.isLoading = false;
        }
      }
    },
  },

  async created() {
    await this.fetchRoles();
    await this.fetchTenantUsers();
    await this.fetchInvitations();
    await this.fetchChallenges();
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

.invite-failed {
  color: #e53935;
}
.invite-pending {
  color: #1976d2;
}
</style>
