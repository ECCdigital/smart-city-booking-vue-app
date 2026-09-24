<template>
  <div data-test="overview-step">
    <!-- Done: the closing action's result reads as a state, like a booking's. -->
    <v-sheet
      v-if="done"
      outlined
      class="overview-done"
      data-test="overview-done"
    >
      <v-avatar color="success" size="32" class="mr-3">
        <v-icon dark small>mdi-check</v-icon>
      </v-avatar>
      <div class="overview-done__text">
        <div
          class="overview-done__title success--text"
          data-test="overview-done-title"
        >
          {{ $t(`tenant.onboarding.overview.done.${variant}.title`) }}
        </div>
        <div
          v-if="variant !== 'free'"
          class="overview-done__hint"
          data-test="overview-done-text"
        >
          {{ $t(`tenant.onboarding.overview.done.${variant}.text`) }}
        </div>
      </div>
    </v-sheet>

    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-clipboard-check-outline</v-icon>
        <span>{{ $t("tenant.readiness.title") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="onboarding-step__lead">
          {{ $t("tenant.readiness.hint") }}
        </p>
        <TenantReadinessCheck
          ref="readiness"
          :tenant-id="tenant.id"
          hide-title
        />
      </v-card-text>
    </v-card>

    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-tune-variant</v-icon>
        <span>{{ $t("tenant.onboarding.overview.supplement") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <OnboardingSetupLinks
          :paid="paid"
          return-step="overview"
          :bookable-id="bookable.id"
        />
      </v-card-text>
    </v-card>

    <v-alert v-if="completeFailed" type="error" text dense>
      {{ $t("tenant.onboarding.overview.complete-failed") }}
    </v-alert>

    <div class="onboarding-actions">
      <v-btn v-if="!done" text @click="$emit('back')" data-test="overview-back">
        <v-icon left small>mdi-arrow-left</v-icon>
        {{ $t("tenant.onboarding.back") }}
      </v-btn>
      <div class="overview-actions__right">
        <v-btn
          v-if="!done"
          text
          @click="$emit('edit-offer')"
          data-test="overview-edit"
        >
          {{ $t("tenant.onboarding.overview.edit-offer") }}
        </v-btn>
        <v-btn
          v-if="!done"
          color="primary"
          depressed
          :loading="inProgress"
          @click="$emit('complete')"
          data-test="overview-complete"
        >
          {{ $t(`tenant.onboarding.overview.action.${variant}`) }}
        </v-btn>
        <v-btn
          v-else
          color="primary"
          depressed
          @click="$emit('exit')"
          data-test="overview-exit"
        >
          {{ $t("tenant.onboarding.exit") }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";
import { completionVariant, storedChoices } from "@/utils/tenantOnboarding";

/**
 * Step 4: the non-binding readiness check, the optional supplements and the
 * closing action, which reads by supervision level (supervision spec §9):
 * free publishes, supervised submits for review, blocked notes the
 * publication wish. A stored publication wish is the done state. The
 * summary of what was saved is the wizard's panel, beside every step.
 */
export default {
  name: "OnboardingOverviewStep",
  components: { TenantReadinessCheck, OnboardingSetupLinks },
  props: {
    tenant: { type: Object, required: true },
    bookable: { type: Object, required: true },
    inProgress: { type: Boolean, default: false },
    completeFailed: { type: Boolean, default: false },
  },
  computed: {
    variant() {
      return completionVariant(this.tenant.supervisionLevel);
    },
    done() {
      return this.bookable.isPublic === true;
    },
    paid() {
      return storedChoices(this.bookable).priceChoice === "paid";
    },
  },
  methods: {
    reloadReadiness() {
      this.$refs.readiness?.load();
    },
  },
};
</script>

<style scoped>
.overview-done {
  display: flex;
  align-items: center;
  padding: var(--scb-space-3) var(--scb-space-4);
  margin-bottom: var(--scb-gap-cards);
  border-radius: var(--scb-radius-surface) !important;
}

.overview-done__title {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: var(--scb-line-height-tight);
}

.overview-done__hint {
  margin-top: 2px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.overview-actions__right {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-left: auto;
}
</style>
