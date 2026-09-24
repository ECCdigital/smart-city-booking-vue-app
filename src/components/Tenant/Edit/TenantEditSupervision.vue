<template>
  <div v-if="tenant && tenant.id">
    <!-- Every level but free names itself; free shows nothing special. -->
    <OnboardingSupervisionNotice :level="tenant.supervisionLevel" />
    <h3 class="text-h6 mb-2">{{ $t("supervision.history.title") }}</h3>
    <SupervisionHistoryList ref="history" :tenant-id="tenant.id" />
  </div>
</template>

<script>
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import SupervisionHistoryList from "@/components/Supervision/SupervisionHistoryList.vue";

/**
 * The supervision as a tab of the tenant settings: the tenant's own level
 * when it is not free, and the history of this tenant alone. It edits
 * nothing; the tabs are kept alive, so coming back reads the history again.
 */
export default {
  name: "TenantEditSupervision",
  components: { OnboardingSupervisionNotice, SupervisionHistoryList },
  // The settings hand every tab the same props; this one needs the tenant only.
  inheritAttrs: false,
  props: {
    tenant: { type: Object, default: () => ({}) },
  },
  data() {
    return { shownBefore: false };
  },
  activated() {
    if (this.shownBefore) this.$refs.history?.load();
    this.shownBefore = true;
  },
};
</script>
