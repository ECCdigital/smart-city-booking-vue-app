<template>
  <v-alert
    v-if="visible"
    type="info"
    text
    dense
    class="pending-banner"
    data-test="supervision-pending-banner"
  >
    <div class="pending-banner__body">
      <div data-test="pending-banner-text">
        <strong>{{ $t("supervision.pending-banner.title") }}</strong>
        {{ $t("supervision.pending-banner.text", { name: tenantName }) }}
      </div>
      <v-btn
        v-if="mayResume"
        small
        text
        color="primary"
        class="pending-banner__resume"
        data-test="pending-banner-resume"
        @click="resume"
      >
        {{ $t("tenant.onboarding.resume") }}
      </v-btn>
    </div>
  </v-alert>
</template>

<script>
import { mapGetters } from "vuex";
import { SUPERVISION_LEVELS } from "@/utils/supervision";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import { firstBookableRoute } from "@/utils/tenantOnboarding";

/**
 * The band over a page of a tenant waiting for its approval (glossary
 * „Freigabe ausstehend“): everything may be prepared, nothing is public
 * until the operator approves. Not dismissible - it leaves with the level.
 */
export default {
  name: "SupervisionPendingBanner",
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
      currentTenant: "tenants/currentTenant",
      adminLevel: "tenants/currentSupervisionLevel",
      supervisionLevelOf: "user/supervisionLevelOf",
    }),
    // The sign-in's level is read anew on every navigation; the admin DTO's
    // is the only one an instance owner without a membership has.
    level() {
      return this.supervisionLevelOf(this.tenantId) ?? this.adminLevel;
    },
    visible() {
      return this.level === SUPERVISION_LEVELS.PENDING;
    },
    tenantName() {
      return this.currentTenant?.name || this.tenantId;
    },
    // The setup goes on with a new bookable in the guided flow
    // (ECCdigital/tickets#326): the tenant owner's and the instance owner's
    // way, who may write the tenant and its bookables.
    mayResume() {
      return TenantPermissionService.allowUpdate();
    },
  },
  methods: {
    resume() {
      this.$router.push(firstBookableRoute());
    },
  },
};
</script>

<style scoped>
.pending-banner__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-4);
}

/* The app's buttons capitalise every word (!important, variables.scss);
   the label is a sentence, so the override needs the same weight. */
.pending-banner__resume {
  flex: none;
  text-transform: none !important;
  letter-spacing: normal;
}
</style>
