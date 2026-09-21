<template>
  <div data-test="readiness-check">
    <h3 class="text-h6 mb-1">{{ $t("tenant.onboarding.readiness.title") }}</h3>
    <p class="text-body-2 text--secondary">
      {{ $t("tenant.onboarding.readiness.hint") }}
    </p>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-alert v-else-if="failed" type="warning" text dense>
      {{ $t("tenant.onboarding.readiness.load-failed") }}
    </v-alert>
    <v-list v-else dense class="pa-0">
      <v-list-item
        v-for="criterion in criteria"
        :key="criterion.key"
        class="px-0"
        :data-test="`readiness-${criterion.key}`"
      >
        <v-list-item-content>
          <v-list-item-title>{{ criterionLabel(criterion) }}</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">
            {{ criterion.hint }}
            <span v-if="criterion.offers && criterion.offers.length">
              ({{ criterion.offers.map((offer) => offer.title).join(", ") }})
            </span>
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-chip small label :color="stateColor(criterion.state)" outlined>
            {{ $t(`tenant.onboarding.readiness.states.${criterion.state}`) }}
          </v-chip>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";

/**
 * The readiness check (glossary "Bereitschafts-Check"): what the backend
 * computes on every call, shown as information. It gates nothing.
 */
export default {
  name: "TenantReadinessCheck",
  props: {
    tenantId: { type: String, required: true },
  },
  data() {
    return { loading: false, failed: false, criteria: [] };
  },
  watch: {
    tenantId: { immediate: true, handler: "load" },
  },
  methods: {
    async load() {
      this.loading = true;
      this.failed = false;
      try {
        const readiness = await ApiTenantService.getReadiness(this.tenantId);
        this.criteria = readiness?.criteria || [];
      } catch (error) {
        console.error(error);
        this.failed = true;
      } finally {
        this.loading = false;
      }
    },
    criterionLabel(criterion) {
      const key = `tenant.onboarding.readiness.criteria.${criterion.key}`;
      return this.$te(key) ? this.$t(key) : criterion.key;
    },
    stateColor(state) {
      if (state === "fulfilled") return "success";
      return state === "missing" ? "warning" : "grey";
    },
  },
};
</script>
