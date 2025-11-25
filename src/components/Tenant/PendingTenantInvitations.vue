<template>
  <div>
    <v-alert
      v-for="invitation in pendingInvitations"
      :key="invitation.tenantId"
      prominent
      border="left"
      colored-border
      color="info"
      class="mb-4 elevation-2"
    >
      <div class="d-flex align-center">
        <v-icon large color="primary" class="mr-4">mdi-email-fast</v-icon>
        <div>
          <div class="title mb-1">
            Einladung für
            <strong class="primary--text">{{ invitation.tenantName }}</strong>
          </div>
          <p class="mb-0 text--secondary">
            Sie haben eine ausstehende Einladung für diesen Mandanten. Möchten
            Sie sie annehmen oder ablehnen?
          </p>
        </div>

        <v-spacer></v-spacer>

        <div class="d-flex flex-column flex-sm-row">
          <v-btn
            color="success"
            small
            class="mr-0 mr-sm-2 mb-2 mb-sm-0"
            @click="acceptInvitation(invitation.tenantId, invitation.token)"
            :loading="
              loadingAction &&
              currentAction === 'accept' &&
              currentInvitationId === invitation.tenantId
            "
            :disabled="loadingAction"
          >
            <v-icon left>mdi-check</v-icon>
            Annehmen
          </v-btn>
          <v-btn
            color="error"
            small
            outlined
            @click="rejectInvitation(invitation.tenantId, invitation.token)"
            :loading="
              loadingAction &&
              currentAction === 'reject' &&
              currentInvitationId === invitation.tenantId
            "
            :disabled="loadingAction"
          >
            <v-icon left>mdi-close</v-icon>
            Ablehnen
          </v-btn>
        </div>
      </div>
    </v-alert>
  </div>
</template>

<script>
import ApiInvitationService from "@/services/api/ApiInvitationService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";

export default {
  name: "PendingTenantInvitations",
  data() {
    return {
      pendingInvitations: [],
      loadingInvitations: false,
      loadingAction: false,
      currentAction: null,
      currentInvitationId: null,
    };
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    async fetchPendingInvitations() {
      this.loadingInvitations = true;
      try {
        const response = await ApiInvitationService.getMyInvitations();
        this.pendingInvitations = response.data;
      } catch (error) {
        console.error("Error fetching pending invitations:", error);
      } finally {
        this.loadingInvitations = false;
      }
    },
    async acceptInvitation(tenantId, token) {
      this.loadingAction = true;
      this.currentAction = "accept";
      this.currentInvitationId = tenantId;
      try {
        await ApiInvitationService.acceptInvitation(tenantId, token);
        this.$emit("invitation:accepted");
        await this.addToast(
          ToastService.createToast("invitation.accepted", "success")
        );
        await this.fetchPendingInvitations();
      } catch (error) {
        console.error("Error accepting invitation:", error);
        await this.addToast(
          ToastService.createToast(
            "invitation.error.acceptance_failed",
            "error"
          )
        );
      } finally {
        this.loadingAction = false;
        this.currentAction = null;
        this.currentInvitationId = null;
      }
    },
    async rejectInvitation(tenantId, token) {
      this.loadingAction = true;
      this.currentAction = "reject";
      this.currentInvitationId = tenantId;
      try {
        await ApiInvitationService.rejectInvitation(tenantId, token);
        this.$emit("invitation:rejected");
        await this.addToast(
          ToastService.createToast("invitation.declined", "info")
        );
        await this.fetchPendingInvitations();
      } catch (error) {
        console.error("Error rejecting invitation:", error);
        await this.addToast(
          ToastService.createToast("invitation.error.declining_failed", "error")
        );
      } finally {
        this.loadingAction = false;
        this.currentAction = null;
        this.currentInvitationId = null;
      }
    },
  },
  mounted() {
    this.fetchPendingInvitations();
  },
};
</script>

<style scoped>
</style>
