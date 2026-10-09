<template>
  <div data-test="readiness-check">
    <template v-if="!hideTitle">
      <h3 class="text-h6 mb-1">{{ $t("tenant.readiness.title") }}</h3>
      <p class="text-body-2 text--secondary">
        {{ $t("tenant.readiness.hint") }}
      </p>
    </template>
    <div class="d-flex align-center flex-wrap mb-2">
      <span
        v-if="checkedAt"
        class="text-caption text--secondary"
        data-test="readiness-checked-at"
      >
        {{ $t("tenant.readiness.checked-at", { time: checkedAtLabel }) }}
      </span>
      <v-spacer />
      <v-btn
        small
        text
        color="primary"
        :disabled="loading"
        data-test="readiness-reload"
        @click="load"
      >
        <v-icon left small>mdi-refresh</v-icon>
        {{ $t("tenant.readiness.reload") }}
      </v-btn>
    </div>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-alert v-else-if="failed" type="warning" text dense>
      {{ $t("tenant.readiness.load-failed") }}
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
          <v-list-item-subtitle v-if="criterion.transport">
            {{ $t(`tenant.readiness.transport.${criterion.transport}`) }}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-chip small label :color="stateColor(criterion.state)" outlined>
            {{ $t(`tenant.readiness.states.${criterion.state}`) }}
          </v-chip>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import { criterionColor } from "@/utils/tenantReadiness";

/**
 * The readiness check (glossary "Bereitschafts-Check"): what the backend
 * computes on every call, shown as information. It gates nothing.
 */
export default {
  name: "TenantReadinessCheck",
  props: {
    tenantId: { type: String, required: true },
    /** Without its own heading, for a host that names the section itself. */
    hideTitle: { type: Boolean, default: false },
  },
  data() {
    return { loading: false, failed: false, checkedAt: null, criteria: [] };
  },
  computed: {
    checkedAtLabel() {
      return new Date(this.checkedAt).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
  watch: {
    tenantId: { immediate: true, handler: "load" },
  },
  methods: {
    async load() {
      // Loads overlap (tenant switch, reload, tab shown again): the last wins.
      const tenantId = this.tenantId;
      const run = (this.latestRun = {});
      this.loading = true;
      this.failed = false;
      try {
        const readiness = await ApiTenantService.getReadiness(tenantId);
        if (run !== this.latestRun) return;
        this.checkedAt = readiness?.checkedAt || null;
        this.criteria = readiness?.criteria || [];
      } catch (error) {
        console.error(error);
        if (run !== this.latestRun) return;
        this.failed = true;
        this.checkedAt = null;
        this.criteria = [];
      } finally {
        if (run === this.latestRun) this.loading = false;
      }
    },
    criterionLabel(criterion) {
      const key = `tenant.readiness.criteria.${criterion.key}`;
      return this.$te(key) ? this.$t(key) : criterion.key;
    },
    stateColor: criterionColor,
  },
};
</script>
