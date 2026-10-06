<template>
  <TenantReadinessCheck
    v-if="tenant && tenant.id"
    ref="check"
    :tenant-id="tenant.id"
  />
</template>

<script>
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";

/**
 * The readiness check as a tab of the tenant settings. It edits nothing; the
 * tabs are kept alive, so coming back to it computes the check again.
 */
export default {
  name: "TenantEditReadiness",
  components: { TenantReadinessCheck },
  // The settings hand every tab the same props; this one needs the tenant only.
  inheritAttrs: false,
  props: {
    tenant: { type: Object, default: () => ({}) },
  },
  data() {
    return { shownBefore: false };
  },
  activated() {
    if (this.shownBefore) this.$refs.check?.load();
    this.shownBefore = true;
  },
};
</script>
