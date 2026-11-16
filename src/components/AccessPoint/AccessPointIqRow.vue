<script>
import SaltoIqActivationSection from "@/components/Tenant/Edit/SaltoIqActivation/SaltoIqActivationSection.vue";
import { iqSummary } from "@/components/Tenant/Edit/SaltoIqActivation/iqActivationState";

/**
 * The IQs of Salto KS as a row of their own in its section
 * (ECCdigital/tickets#1107): folded, how many are activated, yellow while
 * one is missing; unfolded, the IQs with their state and „Aktivieren“,
 * which starts the wizard. The page loads the IQs and hands them in, with
 * `reload` to read them anew after a step; `error` names a list that could
 * not be read.
 */
export default {
  name: "AccessPointIqRow",
  components: { SaltoIqActivationSection },
  props: {
    tenantId: { type: String, required: true },
    iqs: { type: Array, default: () => [] },
    error: { type: String, default: "" },
    // Whether the list is unfolded; `.sync`.
    open: { type: Boolean, default: false },
    // async () => void
    reload: { type: Function, required: true },
  },
  computed: {
    summary() {
      return iqSummary(this.iqs);
    },
    missing() {
      return !this.error && this.summary.open > 0;
    },
  },
};
</script>

<template>
  <div
    class="salto-iq-row"
    :class="{ 'salto-iq-row--missing': missing }"
    data-test="salto-iq-row"
  >
    <div v-if="error" class="salto-iq-row__head">
      <v-icon small color="error" class="mr-2">mdi-alert-circle</v-icon>
      {{ $t("accessPoint.tenant.salto.iq.loadError") }} {{ error }}
    </div>
    <template v-else>
      <button
        type="button"
        class="salto-iq-row__head"
        data-test="salto-iq-row-head"
        @click="$emit('update:open', !open)"
      >
        <v-icon small class="mr-2" :color="missing ? 'warning' : 'success'">
          {{ missing ? "mdi-alert-circle" : "mdi-check-circle" }}
        </v-icon>
        <span v-if="iqs.length">
          {{ $t("accessPoint.management.section.iqs.summary", summary) }}
        </span>
        <span v-else>{{ $t("accessPoint.management.section.iqs.none") }}</span>
        <span v-if="missing" class="ml-1">
          ·
          {{ $tc("accessPoint.management.section.iqs.missing", summary.open) }}
        </span>
        <v-spacer />
        <v-icon small>{{
          open ? "mdi-chevron-up" : "mdi-chevron-down"
        }}</v-icon>
      </button>
      <SaltoIqActivationSection
        v-if="open"
        class="salto-iq-row__list"
        :tenant-id="tenantId"
        :iqs="iqs"
        :reload="reload"
      />
    </template>
  </div>
</template>

<style scoped>
.salto-iq-row {
  border-bottom: 1px solid var(--scb-rule);
}

.salto-iq-row__head {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--scb-space-2) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  text-align: left;
}

.salto-iq-row--missing .salto-iq-row__head {
  background: var(--scb-warning-tint);
}

.salto-iq-row__list {
  border-top: 1px solid var(--scb-rule);
  padding: var(--scb-space-3) var(--scb-space-4);
}
</style>
