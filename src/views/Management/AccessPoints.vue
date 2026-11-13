<script>
import { mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin.vue";
import AccessPointManagement from "@/components/AccessPoint/AccessPointManagement.vue";
import AccessAuditExport from "@/components/Tenant/Edit/AccessAuditExport.vue";
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import unsavedChangesGuard from "@/mixins/unsavedChangesGuard";
import AccessPointPermissionService from "@/services/permissions/AccessPointPermissionService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

/**
 * The Zugangspunkte page: one section per provider with its settings and
 * access points, and the export of the access log at the end
 * (ECCdigital/tickets#1103, #1104). Each provider saves on its own from its
 * settings; the page only asks before unsaved settings are left.
 */
export default {
  name: "AccessPoints",
  components: {
    AdminLayout,
    AccessPointManagement,
    AccessAuditExport,
    UnsavedChangesDialog,
  },
  mixins: [unsavedChangesGuard],
  data() {
    return {
      // Whether the settings of a provider hold changes not saved yet.
      settingsDirty: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    // No read-only management page: users who may not write doors do not
    // get the sections.
    allowAccessPointManagement() {
      return AccessPointPermissionService.allowWrite();
    },
    allowAuditExport() {
      return BookingPermissionService.allowAuditExport();
    },
    hasUnsavedChanges() {
      return this.settingsDirty;
    },
  },
};
</script>

<template>
  <AdminLayout>
    <AccessPointManagement
      v-if="allowAccessPointManagement"
      @update:dirty="settingsDirty = $event"
    />

    <div v-if="allowAuditExport && tenantId" class="mt-8">
      <v-divider class="mb-6" />
      <AccessAuditExport :tenant="tenantId" />
    </div>

    <UnsavedChangesDialog
      v-model="leaveDialogOpen"
      @stay="resolveLeaveConfirm(false)"
      @discard="resolveLeaveConfirm(true)"
    />
  </AdminLayout>
</template>
