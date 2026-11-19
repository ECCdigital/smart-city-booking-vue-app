<template>
  <v-dialog
    :value="open"
    scrollable
    max-width="700px"
    @click:outside="$emit('close')"
  >
    <v-card data-test="readiness-dialog">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-clipboard-check-outline</v-icon>
        <span class="text-h5">{{ tenant.name || tenant.id }}</span>
        <v-spacer />
        <v-btn icon @click="$emit('close')"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <!-- Rendered while open only: every opening computes the check anew. -->
        <TenantReadinessCheck v-if="open && tenant.id" :tenant-id="tenant.id" />
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn
          outlined
          data-test="readiness-dialog-close"
          @click="$emit('close')"
        >
          {{ $t("tenant.readiness.close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";

/**
 * The readiness check of any tenant, as the instance owner opens it from the
 * instance's tenant list.
 */
export default {
  name: "TenantReadinessDialog",
  components: { TenantReadinessCheck },
  props: {
    open: { type: Boolean, default: false },
    tenant: { type: Object, default: () => ({}) },
  },
};
</script>
