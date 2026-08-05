<template>
  <AdminLayout>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-2"
    ></v-progress-linear>

    <PendingApprovals></PendingApprovals>
    <PendingTenantInvitations
      @invitation:accepted="fetchTenants"
      @invitation:rejected="fetchTenants"
    />

    <div class="mb-6">
      <p class="text-subtitle-1 grey--text">
        Zentrale Kennzahlen rund um Buchungsobjekte, Buchungen und die Nutzung
        der Anwendung.
      </p>
    </div>

    <div>COMING SOON!!!</div>
  </AdminLayout>
</template>
<script setup>
import AdminLayout from "@/layouts/Admin.vue";
import PendingTenantInvitations from "@/components/Tenant/PendingTenantInvitations.vue";
import PendingApprovals from "@/components/Tenant/PendingApprovals.vue";
</script>

<style scoped></style>
