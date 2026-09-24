<template>
  <div v-if="visible && compact" data-test="supervision-notice">
    <div class="booking-facts">
      <div class="booking-fact">
        <span class="booking-fact__label">
          {{ $t("tenant.onboarding.level.label") }}
        </span>
        <span class="booking-fact__value">
          <v-chip x-small label outlined :color="color">
            {{ $t(`tenant.onboarding.level.names.${variant}`) }}
          </v-chip>
        </span>
      </div>
    </div>
    <p class="supervision-notice__hint">
      {{ $t(`tenant.onboarding.level.${variant}`) }}
    </p>
  </div>
  <div v-else-if="visible" class="mb-4" data-test="supervision-notice">
    <v-chip small label class="mb-2">
      {{
        $t("tenant.onboarding.level.badge", {
          level: $t(`tenant.onboarding.level.names.${variant}`),
        })
      }}
    </v-chip>
    <v-alert :type="color" text dense class="mb-0">
      {{ $t(`tenant.onboarding.level.${variant}`) }}
    </v-alert>
  </div>
</template>

<script>
import {
  completionVariant,
  showsSupervisionNotice,
} from "@/utils/tenantOnboarding";

// Supervised informs; waiting for the approval warns; declined is an error.
const NOTICE_COLORS = Object.freeze({
  supervised: "info",
  pending: "warning",
  declined: "error",
});

/**
 * Level and hint accompany the wizard for every level but free, which gets
 * no supervision explanation in the onboarding (supervision spec §9). As a
 * badge over an alert in the tenant settings; `compact`, as a fact with a
 * line under it, in the wizard's panel.
 */
export default {
  name: "OnboardingSupervisionNotice",
  props: {
    level: { type: String, default: null },
    compact: { type: Boolean, default: false },
  },
  computed: {
    variant() {
      return completionVariant(this.level);
    },
    visible() {
      return showsSupervisionNotice(this.level);
    },
    color() {
      return NOTICE_COLORS[this.variant];
    },
  },
};
</script>

<style scoped>
.supervision-notice__hint {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
</style>
