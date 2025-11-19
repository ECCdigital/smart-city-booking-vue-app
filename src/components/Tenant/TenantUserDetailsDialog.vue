<template>
  <v-dialog v-model="open" max-width="1000" persistent scrollable>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-avatar
          :color="getAvatarColor()"
          size="48"
          class="white--text font-weight-bold mr-4"
        >
          {{ getUserInitials() }}
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-h5 font-weight-medium">
            {{ userName }}
            <v-icon v-if="user?.isVerified" color="success" small class="ml-2">
              mdi-check-decagram
            </v-icon>
          </div>
          <div class="text-caption grey--text">{{ user?.userId }}</div>
        </div>
        <v-chip
          v-if="user?.owner"
          color="amber"
          text-color="amber darken-4"
          class="mr-2"
        >
          <v-icon left small>mdi-crown</v-icon>
          Besitzer
        </v-chip>
        <v-chip
          :color="getStatusColor(user?.status)"
          text-color="white"
          class="mr-2"
        >
          {{ getStatusText(user?.status) }}
        </v-chip>
        <v-spacer />
        <v-btn icon @click="handleClose()">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Tabs -->
      <v-tabs v-model="activeTab" grow>
        <v-tab>
          <v-icon left>mdi-account</v-icon>
          Übersicht
          <v-badge
            v-if="hasPendingApproval"
            color="red"
            dot
            inline
            class="ml-2"
          />
        </v-tab>
        <v-tab>
          <v-icon left>mdi-shield-account</v-icon>
          Rollen
          <v-badge
            v-if="user?.roles?.length"
            :content="user.roles.length"
            color="primary"
            inline
            class="ml-2"
          />
        </v-tab>
        <v-tab>
          <v-icon left>mdi-email-multiple</v-icon>
          Einladungen
          <v-badge
            v-if="invitationCount > 0"
            :content="invitationCount"
            color="orange"
            inline
            class="ml-2"
          />
        </v-tab>
        <v-tab>
          <v-icon left>mdi-cog</v-icon>
          Aktionen
        </v-tab>
      </v-tabs>

      <v-divider />

      <!-- Tab Content -->
      <v-card-text class="pa-6" style="max-height: 600px; overflow-y: auto">
        <v-tabs-items v-model="activeTab">
          <!-- Overview Tab -->
          <v-tab-item>
            <!-- Pending Approvals Section -->
            <div
              v-for="(approval, index) in pendingApprovalDetails"
              :key="index"
              class="mb-3"
            >
              <v-card outlined style="border-color: #1976d2">
                <v-card-text class="pb-2">
                  <div class="d-flex align-center mb-2">
                    <v-chip
                      color="blue darken-1"
                      text-color="white"
                      small
                      class="mr-2"
                    >
                      <v-icon left x-small>mdi-clock-outline</v-icon>
                      Wartet auf Freigabe
                    </v-chip>
                    <span class="font-weight-medium">
                      {{ getChallengeNameById(approval.challengeId) }}
                    </span>
                  </div>

                  <div v-if="approval.message" class="text-caption mb-2">
                    {{ getMessageForCode(approval.message) }}
                  </div>

                  <div
                    v-if="approval.updatedAt"
                    class="text-caption grey--text"
                  >
                    {{ formatDate(approval.updatedAt) }}
                  </div>

                  <v-divider class="my-3" />

                  <div class="d-flex align-center">
                    <v-spacer />
                    <v-btn
                      color="red"
                      text
                      small
                      @click="rejectApproval(approval.invitationToken)"
                    >
                      <v-icon left small>mdi-close</v-icon>
                      Ablehnen
                    </v-btn>
                    <v-btn
                      color="blue darken-1"
                      dark
                      small
                      @click="approveChallenge(approval.invitationToken)"
                    >
                      <v-icon left small>mdi-check</v-icon>
                      Freigeben
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- User Information -->
            <v-row>
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-subtitle>Basisinformationen</v-card-subtitle>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle>Benutzer-ID</v-list-item-subtitle>
                        <v-list-item-title>{{
                          user?.userId
                        }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle>Name</v-list-item-subtitle>
                        <v-list-item-title>{{ userName }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle>Status</v-list-item-subtitle>
                        <v-list-item-title>
                          <v-chip
                            :color="getStatusColor(user?.status)"
                            text-color="white"
                            small
                          >
                            {{ getStatusText(user?.status) }}
                          </v-chip>
                        </v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle
                          >E-Mail-Addresse verifiziert
                        </v-list-item-subtitle>
                        <v-list-item-title>
                          <v-icon
                            :color="user?.isVerified ? 'success' : 'grey'"
                            small
                          >
                            {{
                              user?.isVerified
                                ? "mdi-check-circle"
                                : "mdi-close-circle"
                            }}
                          </v-icon>
                          {{ user?.isVerified ? "Ja" : "Nein" }}
                        </v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle>Besitzer</v-list-item-subtitle>
                        <v-list-item-title>
                          <v-icon :color="user?.owner ? 'amber' : 'grey'" small>
                            {{ user?.owner ? "mdi-crown" : "mdi-account" }}
                          </v-icon>
                          {{ user?.owner ? "Ja" : "Nein" }}
                        </v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>

              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-subtitle>Zusammenfassung</v-card-subtitle>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle>Rollen</v-list-item-subtitle>
                        <v-list-item-title>
                          {{ user?.roles?.length || 0 }} Rolle(n)
                        </v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-subtitle>Einladungen</v-list-item-subtitle>
                        <v-list-item-title>
                          {{ invitationCount }} Einladung(en)
                        </v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>
            </v-row>
          </v-tab-item>

          <!-- Roles Tab -->
          <v-tab-item>
            <div class="mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon color="primary" class="mr-2">mdi-shield-account</v-icon>
                <span class="text-h6 font-weight-medium">Rollen verwalten</span>
              </div>
              <p class="text-body-2 grey--text mb-0">
                Wählen Sie die Rollen aus, die diesem Benutzer zugewiesen werden
                sollen.
              </p>
            </div>
            <div v-if="roles && roles.length > 0" class="roles-container">
              <v-row>
                <v-col v-for="(role, i) in roles" :key="i" cols="12" sm="6">
                  <v-card
                    class="role-card"
                    :class="{ 'role-card--selected': isRoleSelected(role.id) }"
                    outlined
                    @click="toggleRole(role.id)"
                  >
                    <div class="role-card__content pa-3">
                      <div class="d-flex align-center">
                        <v-avatar
                          :color="
                            isRoleSelected(role.id)
                              ? 'primary'
                              : 'grey lighten-3'
                          "
                          size="36"
                          class="role-card__avatar"
                        >
                          <v-icon
                            :color="isRoleSelected(role.id) ? 'white' : 'grey'"
                            small
                          >
                            {{ getRoleIcon(role.name) }}
                          </v-icon>
                        </v-avatar>

                        <div class="flex-grow-1 ml-3">
                          <div class="text-subtitle-2 font-weight-medium">
                            {{ role.name }}
                          </div>
                          <p
                            v-if="role.description"
                            class="text-caption grey--text mb-0 text-truncate"
                            style="max-width: 200px"
                          >
                            {{ role.description }}
                          </p>
                        </div>

                        <v-icon
                          :color="
                            isRoleSelected(role.id)
                              ? 'primary'
                              : 'grey lighten-2'
                          "
                        >
                          {{
                            isRoleSelected(role.id)
                              ? "mdi-checkbox-marked-circle"
                              : "mdi-checkbox-blank-circle-outline"
                          }}
                        </v-icon>
                      </div>
                    </div>

                    <v-expand-transition>
                      <div
                        v-if="isRoleSelected(role.id)"
                        class="role-card__selected-indicator"
                      />
                    </v-expand-transition>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <v-alert v-else type="info" outlined icon="mdi-information">
              Keine Rollen verfügbar
            </v-alert>

            <!-- Summary -->
            <v-card
              v-if="roles && roles.length > 0"
              class="mt-4"
              color="primary lighten-5"
              flat
            >
              <v-card-text class="d-flex align-center py-2">
                <v-icon color="primary" small class="mr-2"
                  >mdi-information</v-icon
                >
                <span class="text-body-2">
                  <strong>{{ selectedRolesCount }}</strong> von
                  <strong>{{ roles.length }}</strong> Rollen ausgewählt
                </span>
              </v-card-text>
            </v-card>
          </v-tab-item>

          <!-- Invitations Tab -->
          <v-tab-item>
            <div class="mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon color="primary" class="mr-2">mdi-email-multiple</v-icon>
                <span class="text-h6 font-weight-medium"
                  >Einladungsverlauf</span
                >
              </div>
              <p class="text-body-2 grey--text mb-0">
                Übersicht über alle Einladungen, die an diesen Benutzer gesendet
                wurden.
              </p>
            </div>

            <v-list v-if="invitations && invitations.length > 0">
              <v-list-item
                v-for="(invitation, index) in invitations"
                :key="index"
                class="mb-3 elevation-2 mr-1 rounded-lg"
                :class="getInvitationClass(invitation)"
              >
                <v-list-item-content>
                  <v-list-item-title class="d-flex align-center mb-2">
                    <v-chip
                      :color="getInvitationStatusColor(invitation.status)"
                      text-color="white"
                      small
                      class="mr-2"
                    >
                      <v-icon left x-small>
                        {{ getInvitationStatusIcon(invitation.status) }}
                      </v-icon>
                      {{ getInvitationStatusText(invitation.status) }}
                    </v-chip>
                    <span class="text-caption grey--text">
                      {{ invitation.token.substring(0, 16) }}...
                    </span>

                    <v-spacer> </v-spacer>
                    <v-menu offset-y>
                      <template v-slot:activator="{ on: menu, attrs }">
                        <v-btn icon small v-bind="attrs" v-on="{ ...menu }">
                          <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list dense>
                        <v-list-item-group color="primary">
                          <v-list-item
                            v-if="
                              invitation.status === 'pending_approval' ||
                              invitation.status === 'rejected'
                            "
                            @click="approveChallenge(invitation.token)"
                          >
                            <v-list-item-icon>
                              <v-icon>mdi-check</v-icon>
                            </v-list-item-icon>
                            <v-list-item-content>
                              <v-list-item-title>Freigeben</v-list-item-title>
                            </v-list-item-content>
                          </v-list-item>
                          <v-list-item
                            v-if="invitation.status === 'pending_approval'"
                            @click="rejectApproval(invitation.token)"
                          >
                            <v-list-item-icon>
                              <v-icon>mdi-close</v-icon>
                            </v-list-item-icon>
                            <v-list-item-content>
                              <v-list-item-title>Ablehnen</v-list-item-title>
                            </v-list-item-content>
                          </v-list-item>
                          <v-list-item
                            @click="deleteInvitation(invitation.token)"
                          >
                            <v-list-item-icon>
                              <v-icon color="error">mdi-delete</v-icon>
                            </v-list-item-icon>
                            <v-list-item-content>
                              <v-list-item-title>Löschen</v-list-item-title>
                            </v-list-item-content>
                          </v-list-item>
                        </v-list-item-group>
                      </v-list>
                    </v-menu>
                  </v-list-item-title>

                  <v-list-item-subtitle
                    v-if="invitation.challengeStates?.length > 0"
                  >
                    <div
                      v-for="(challenge, cIndex) in invitation.challengeStates"
                      :key="cIndex"
                      class="mt-2"
                    >
                      <v-chip
                        x-small
                        :color="getChallengeStatusColor(challenge.status)"
                        text-color="white"
                        class="mr-2"
                      >
                        {{ getChallengeStatusText(challenge.status) }}
                      </v-chip>
                      <span class="text-caption">
                        {{ getChallengeNameById(challenge.challengeId) }}
                      </span>
                      <div
                        v-if="challenge.message"
                        class="text-caption grey--text mt-1"
                      >
                        {{ getMessageForCode(challenge.message) }}
                      </div>
                      <div
                        v-if="challenge.updatedAt"
                        class="text-caption grey--text"
                      >
                        {{ formatDate(challenge.updatedAt) }}
                      </div>
                    </div>
                  </v-list-item-subtitle>

                  <v-list-item-subtitle
                    v-if="invitation.reason"
                    class="mt-2 red--text"
                  >
                    Grund: {{ getMessageForCode(invitation.reason) }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>

            <v-card v-else class="text-center py-8" flat>
              <v-icon size="48" color="grey lighten-2">mdi-email-off</v-icon>
              <v-card-title class="justify-center grey--text">
                Keine Einladungen vorhanden
              </v-card-title>
            </v-card>
          </v-tab-item>

          <!-- Actions Tab -->
          <v-tab-item>
            <div class="mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon color="primary" class="mr-2">mdi-cog</v-icon>
                <span class="text-h6 font-weight-medium">Benutzeraktionen</span>
              </div>
              <p class="text-body-2 grey--text mb-0">
                Verwalten Sie den Status und die Berechtigungen dieses
                Benutzers.
              </p>
            </div>

            <!-- Status Management -->
            <div class="action-section mb-6">
              <div class="action-section__header mb-4">
                <v-icon color="blue darken-1" class="mr-2">
                  mdi-account-cog
                </v-icon>
                <span class="text-subtitle-1 font-weight-medium">
                  Status-Verwaltung
                </span>
              </div>

              <v-card outlined class="action-card">
                <v-card-text class="pa-5">
                  <div class="d-flex flex-column flex-sm-row align-start">
                    <div class="flex-grow-1 mb-4 mb-sm-0">
                      <div class="text-body-1 font-weight-medium mb-1">
                        Benutzer-Status ändern
                      </div>
                      <div class="text-body-2 grey--text">
                        Aktivieren oder sperren Sie den Zugang dieses Benutzers
                      </div>
                      <div class="mt-3">
                        <v-chip
                          small
                          :color="getStatusColor(user?.status)"
                          text-color="white"
                        >
                          <v-icon left x-small>mdi-circle</v-icon>
                          Aktuell: {{ getStatusText(user?.status) }}
                        </v-chip>
                      </div>
                    </div>

                    <div class="d-flex flex-column">
                      <v-btn
                        :outlined="user?.status === 'active'"
                        :color="user?.status === 'active' ? 'grey' : 'success'"
                        :disabled="user?.status === 'active'"
                        class="mb-2"
                        @click="changeUserStatus('active')"
                      >
                        <v-icon left>mdi-account-check</v-icon>
                        Aktivieren
                      </v-btn>
                      <v-btn
                        :outlined="user?.status === 'suspended'"
                        :color="
                          user?.status === 'suspended' ? 'grey' : 'warning'
                        "
                        :disabled="user?.status === 'suspended'"
                        @click="changeUserStatus('suspended')"
                      >
                        <v-icon left>mdi-account-cancel</v-icon>
                        Sperren
                      </v-btn>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- Owner Management -->
            <div class="action-section mb-6">
              <div class="action-section__header mb-4">
                <v-icon color="amber darken-2" class="mr-2">mdi-crown</v-icon>
                <span class="text-subtitle-1 font-weight-medium">
                  Besitzer-Verwaltung
                </span>
              </div>

              <v-card outlined class="action-card owner-card">
                <v-card-text class="pa-5">
                  <div class="d-flex flex-column flex-sm-row align-center">
                    <div class="flex-grow-1 mb-3 mb-sm-0">
                      <div class="text-body-1 font-weight-medium mb-1">
                        <v-icon
                          :color="user?.owner ? 'amber darken-2' : 'grey'"
                          class="mr-1"
                        >
                          mdi-crown
                        </v-icon>
                        {{
                          user?.owner ? "Besitzer-Status" : "Besitzer-Rechte"
                        }}
                      </div>
                      <div class="text-body-2 grey--text">
                        {{
                          user?.owner
                            ? "Dieser Benutzer hat Besitzer-Rechte"
                            : "Erteilen Sie diesem Benutzer Besitzer-Rechte"
                        }}
                      </div>
                    </div>
                    <v-btn
                      v-if="!user?.owner"
                      color="amber darken-2"
                      dark
                      @click="$emit('add-owner')"
                    >
                      <v-icon left>mdi-crown</v-icon>
                      Besitzer machen
                    </v-btn>
                    <v-btn
                      v-else
                      large
                      color="grey"
                      outlined
                      @click="$emit('remove-owner')"
                    >
                      <v-icon left>mdi-close-circle-outline</v-icon>
                      Entfernen
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- Danger Zone -->
            <div class="action-section">
              <div class="action-section__header mb-4">
                <v-icon color="red" class="mr-2">mdi-alert-octagon</v-icon>
                <span class="text-subtitle-1 font-weight-medium red--text">
                  Gefahrenbereich
                </span>
              </div>

              <v-card outlined class="action-card danger-card">
                <v-card-text class="pa-5">
                  <div class="d-flex flex-column flex-sm-row align-center">
                    <div class="flex-grow-1 mb-3 mb-sm-0">
                      <div class="text-body-1 font-weight-medium mb-1">
                        <v-icon color="red" class="mr-1">mdi-delete</v-icon>
                        Benutzer entfernen
                      </div>
                      <div class="text-body-2 grey--text">
                        Diese Aktion kann nicht rückgängig gemacht werden
                      </div>
                    </div>
                    <v-btn color="red" dark @click="confirmDelete = true">
                      <v-icon left>mdi-delete-forever</v-icon>
                      Entfernen
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="handleClose()">Schließen</v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDelete" max-width="500">
      <v-card>
        <v-card-title class="red--text">
          <v-icon color="red" left>mdi-alert</v-icon>
          Benutzer entfernen?
        </v-card-title>
        <v-card-text>
          Möchten Sie den Benutzer <strong>{{ userName }}</strong> wirklich aus
          dem Tenant entfernen? Diese Aktion kann nicht rückgängig gemacht
          werden.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmDelete = false">Abbrechen</v-btn>
          <v-btn color="red" dark @click="handleDelete">Entfernen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
export default {
  name: "TenantUserDetailDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      default: null,
    },
    roles: {
      type: Array,
      default: () => [],
    },
    challenges: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      activeTab: 0,
      confirmDelete: false,
      userStatus: null,
      userRoles: null,
      messages: {
        REJECTED_BY_ADMIN: "Abgelehnt durch Administrator",
        APPROVED_BY_ADMIN: "Freigegeben durch Administrator",
        MANUAL_APPROVAL_PENDING: "Manuelle Überprüfung ausstehend",
        MANUAL_APPROVAL_GRANTED: "Manuelle Überprüfung genehmigt",
        DOMAIN_VERIFIED: "E-Mail-Domain verifiziert",
        INVALID_DOMAIN: "Ungültige E-Mail-Domain",
      },
    };
  },
  computed: {
    selectedRolesCount() {
      return this.userRoles ? this.userRoles.length : 0;
    },
    userName() {
      if (this.user?.firstName && this.user?.lastName) {
        return `${this.user.firstName} ${this.user.lastName}`;
      }
      return this.user?.userId || "";
    },
    invitations() {
      return this.user?.invitations || [];
    },
    invitationCount() {
      return this.invitations.length;
    },
    failedInvitations() {
      return this.invitations.filter((inv) => inv.status === "failed");
    },
    pendingApprovalInvitations() {
      return this.invitations.filter(
        (inv) => inv.status === "pending_approval"
      );
    },
    pendingApprovalCount() {
      return this.pendingApprovalInvitations.length;
    },
    hasPendingApproval() {
      return this.pendingApprovalCount > 0;
    },
    pendingApprovalDetails() {
      const details = [];
      this.pendingApprovalInvitations.forEach((inv) => {
        inv.challengeStates?.forEach((challenge) => {
          if (challenge.status === "pending_approval") {
            details.push({
              ...challenge,
              invitationToken: inv.token,
            });
          }
        });
      });
      return details;
    },
  },
  watch: {
    user: {
      handler(newUser) {
        if (newUser) {
          this.userStatus = newUser.status;
          this.userRoles = newUser.roles || [];
        }
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    getMessageForCode(code) {
      return this.messages[code] || code;
    },

    changeUserStatus(newStatus) {
      this.userStatus = newStatus;
      this.$emit("update-status", newStatus);
    },

    getUserInitials() {
      if (this.user?.firstName && this.user?.lastName) {
        return (
          this.user.firstName.charAt(0).toUpperCase() +
          this.user.lastName.charAt(0).toUpperCase()
        );
      }
      return this.user?.userId?.substring(0, 2).toUpperCase() || "??";
    },
    getAvatarColor() {
      if (this.user?.owner) return "amber darken-2";
      if (this.user?.status === "active") return "green";
      if (this.user?.status === "pending") return "blue-grey";
      if (this.user?.status === "suspended") return "orange";
      if (this.user?.status === "rejected") return "red";
      return "grey";
    },
    getStatusColor(status) {
      const colors = {
        active: "green",
        pending: "orange",
        suspended: "red",
        rejected: "red",
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
    getInvitationClass(invitation) {
      return {
        "completed-invitation": invitation.status === "completed",
        "failed-invitation": invitation.status === "failed",
        "pending-invitation": invitation.status.includes("pending"),
        "rejected-invitation": invitation.status === "rejected",
      };
    },
    getInvitationStatusColor(status) {
      const colors = {
        completed: "green",
        failed: "red",
        pending: "orange",
        pending_approval: "blue",
        rejected: "red",
      };
      return colors[status] || "grey";
    },
    getInvitationStatusIcon(status) {
      const icons = {
        completed: "mdi-check-circle",
        failed: "mdi-close-circle",
        pending: "mdi-clock-outline",
        pending_approval: "mdi-account-clock",
        rejected: "mdi-close-circle-outline",
      };
      return icons[status] || "mdi-help-circle";
    },
    getInvitationStatusText(status) {
      const texts = {
        completed: "Abgeschlossen",
        failed: "Fehlgeschlagen",
        pending: "Ausstehend",
        pending_approval: "Wartet auf Freigabe",
        rejected: "Abgelehnt",
      };
      return texts[status] || status;
    },
    getChallengeStatusColor(status) {
      const colors = {
        passed: "green",
        failed: "red",
        pending: "orange",
        pending_approval: "blue",
        rejected: "red",
      };
      return colors[status] || "grey";
    },
    getChallengeStatusText(status) {
      const texts = {
        passed: "Bestanden",
        failed: "Fehlgeschlagen",
        pending: "Ausstehend",
        pending_approval: "Wartet auf Freigabe",
        rejected: "Abgelehnt",
      };
      return texts[status] || status;
    },
    getChallengeNameById(challengeId) {
      const challenge = this.challenges.find((c) => c.id === challengeId);
      return challenge?.name || challengeId;
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    isRoleSelected(roleId) {
      return this.userRoles?.includes(roleId);
    },
    toggleRole(roleId) {
      const index = this.userRoles.indexOf(roleId);
      if (index > -1) {
        this.userRoles = this.userRoles.filter((id) => id !== roleId);
      } else {
        this.userRoles = [...this.userRoles, roleId];
      }
      this.$emit("save-roles", this.userRoles);
    },
    getRoleIcon(roleName) {
      const iconMap = {
        Admin: "mdi-shield-crown",
        Administrator: "mdi-shield-crown",
        User: "mdi-account",
        Benutzer: "mdi-account",
        Moderator: "mdi-shield-account",
        Editor: "mdi-pencil",
        Viewer: "mdi-eye",
        Manager: "mdi-briefcase",
      };
      return iconMap[roleName] || "mdi-shield-account";
    },
    deleteInvitation(token) {
      this.$emit("delete-invitation", token);
    },
    handleDelete() {
      this.$emit("delete-user");
      this.handleClose();
    },
    approveChallenge(token) {
      const invitation = this.invitations.find((inv) => inv.token === token);
      const approval = invitation.challengeStates.find(
        (ch) => ch.status === "pending_approval" || ch.status === "rejected"
      );

      if (!approval) return;

      this.$emit("approve-challenge", {
        challengeId: approval.challengeId,
        invitationToken: token,
      });
    },
    rejectApproval(token) {
      const invitation = this.invitations.find((inv) => inv.token === token);
      const approval = invitation.challengeStates.find(
        (ch) => ch.status === "pending_approval"
      );

      this.$emit("reject-challenge", {
        challengeId: approval.challengeId,
        invitationToken: token,
      });
    },
    handleClose() {
      this.activeTab = 0;
      this.confirmDelete = false;
      this.userStatus = null;
      this.userRoles = null;
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.completed-invitation {
  border-left: 4px solid #4caf50;
}

.failed-invitation {
  border-left: 4px solid #f44336;
}

.pending-invitation {
  border-left: 4px solid #ff9800;
}

.rejected-invitation {
  border-left: 4px solid #f44336;
}

.role-card {
  position: relative;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
  overflow: hidden;
}

.role-card:hover {
  box-shadow: var(--v-shadow-4);
  transform: translateY(-2px);
}

.role-card--selected {
  border-color: var(--v-primary-base) !important;
  border-width: 2px !important;
  background: rgba(var(--v-primary-rgb), 0.04);
}

.role-card__content {
  position: relative;
  z-index: 1;
}

.role-card__avatar {
  transition: all 0.2s ease;
}

.role-card--selected .role-card__avatar {
  transform: scale(1.05);
}

.action-section__header {
  display: flex;
  align-items: center;
}

.action-card {
  transition: all 0.3s ease;
}

.owner-card {
  border-color: #ffa726 !important;
  background: linear-gradient(
    to right,
    rgba(255, 193, 7, 0.02),
    rgba(255, 193, 7, 0.05)
  );
}

.danger-card {
  border-color: #ef5350 !important;
  background: linear-gradient(
    to right,
    rgba(244, 67, 54, 0.02),
    rgba(244, 67, 54, 0.05)
  );
}

.action-buttons {
  min-width: 200px;
}

@media (max-width: 600px) {
  .action-buttons {
    width: 100%;
  }
}

/* Fade Transition */
.v-fade-transition-enter-active,
.v-fade-transition-leave-active {
  transition: opacity 0.3s ease;
}

.v-fade-transition-enter,
.v-fade-transition-leave-to {
  opacity: 0;
}
</style>
