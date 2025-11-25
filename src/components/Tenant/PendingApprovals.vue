<template>
  <div>
    <v-alert
      v-for="approval in pendingApprovals"
      :key="approval.tenantId"
      prominent
      border="left"
      colored-border
      color="warning"
      class="mb-4 elevation-2"
    >
      <div class="d-flex align-center">
        <v-icon large color="warning" class="mr-4"> mdi-account-clock </v-icon>

        <div>
          <div class="title mb-1">
            Freigabe ausstehend für
            <strong class="primary--text">{{ approval.tenantName }}</strong>
          </div>

          <p class="mb-1 text--secondary">
            Ihre Mitgliedschaft für diesen Mandanten wurde angefragt und wartet
            auf die Freigabe durch einen Administrator.
          </p>

          <p v-if="getInstructions(approval).length" class="mb-0">
            <strong>Hinweis:</strong>
            {{ getInstructions(approval) }}
          </p>
        </div>
      </div>
    </v-alert>
  </div>
</template>

<script>
import ApiMembershipService from "@/services/api/ApiMembershipService";

export default {
  name: "PendingApprovals",
  data() {
    return {
      loadingInvitations: false,
      pendingApprovals: [],
    };
  },
  methods: {
    async fetchPendingApprovals() {
      this.loadingInvitations = true;
      try {
        const response = await ApiMembershipService.getMyPendingMemberships();
        this.pendingApprovals = Array.isArray(response.data)
          ? response.data
          : [];
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
        this.pendingApprovals = [];
      } finally {
        this.loadingInvitations = false;
      }
    },
    getInstructions(approval) {
      return approval && typeof approval.instructions === "string"
        ? approval.instructions.trim()
        : "";
    },
  },
  mounted() {
    this.fetchPendingApprovals();
  },
};
</script>

<style scoped></style>
