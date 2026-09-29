<template>
  <v-dialog :value="open" max-width="700px" @click:outside="$emit('close')">
    <v-card data-test="readiness-dialog">
      <v-card-title class="mx-3">
        <span class="text-h5">{{ tenant.name || tenant.id }}</span>
      </v-card-title>
      <v-divider class="mx-9 mb-5" />
      <v-card-text>
        <!-- Rendered while open only: every opening computes the check anew. -->
        <TenantReadinessCheck v-if="open && tenant.id" :tenant-id="tenant.id" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text data-test="readiness-dialog-close" @click="$emit('close')">
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
