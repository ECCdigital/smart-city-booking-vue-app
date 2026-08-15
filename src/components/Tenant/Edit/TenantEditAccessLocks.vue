<script>
import TenantEditLocks from "@/components/Tenant/Edit/TenantEditLocks.vue";
import TenantEditAccess from "@/components/Tenant/Edit/TenantEditAccess.vue";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";

export default {
  name: "TenantEditAccessLocks",
  components: { TenantEditLocks, TenantEditAccess },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
    nukiTokenConfigured: { type: Boolean, default: false },
    saltoSecretConfigured: { type: Boolean, default: false },
    saltoPasswordConfigured: { type: Boolean, default: false },
  },
  computed: {
    showAccess() {
      return TenantPermissionService.allowUpdate(this.tenant);
    },
  },
  methods: {
    async validate() {
      const checks = [];
      if (this.$refs.locks?.validate) checks.push(this.$refs.locks.validate());
      if (this.showAccess && this.$refs.access?.validate) {
        checks.push(this.$refs.access.validate());
      }
      const results = await Promise.all(checks);
      return results.every(Boolean);
    },
    resetValidation() {
      this.$refs.locks?.resetValidation?.();
      if (this.showAccess) this.$refs.access?.resetValidation?.();
    },
  },
};
</script>

<template>
  <div>
    <TenantEditLocks
      ref="locks"
      :tenant="tenant"
      :apps="apps"
      @update:tenant="$emit('update:tenant', $event)"
      @update:apps="$emit('update:apps', $event)"
    />
    <TenantEditAccess
      v-if="showAccess"
      ref="access"
      :tenant="tenant"
      :apps="apps"
      :nuki-token-configured="nukiTokenConfigured"
      :salto-secret-configured="saltoSecretConfigured"
      :salto-password-configured="saltoPasswordConfigured"
      @update:apps="$emit('update:apps', $event)"
    />
  </div>
</template>
