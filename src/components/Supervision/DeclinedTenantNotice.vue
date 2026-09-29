<template>
  <div class="declined-tenant" data-test="declined-tenant">
    <div>{{ declinedText }}</div>
    <div v-if="membership.supervisionReason" data-test="declined-reason">
      {{
        $t("supervision.declined-tenant.reason", {
          reason: membership.supervisionReason,
        })
      }}
    </div>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";

/**
 * What a member of a declined tenant (glossary „abgewiesen“) still learns
 * about it: when the operator declined it, why, and that the own bookings
 * stay. Read from the membership of the sign-in (`permissions.tenants[]`),
 * because every request about the tenant itself is refused.
 */
export default {
  name: "DeclinedTenantNotice",
  props: {
    membership: { type: Object, required: true },
  },
  computed: {
    declinedText() {
      const at = this.membership.supervisionChangedAt;
      return at
        ? this.$t("supervision.declined-tenant.declined-at", {
            date: FormatService.dateTime(at),
          })
        : this.$t("supervision.declined-tenant.declined");
    },
  },
};
</script>

<style scoped>
.declined-tenant {
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
  white-space: normal;
}
</style>
