<template>
  <div v-if="visible" class="mb-4" data-test="supervision-notice">
    <v-chip small label class="mb-2">
      {{
        $t("tenant.onboarding.level.badge", {
          level: $t(`tenant.onboarding.level.names.${variant}`),
        })
      }}
    </v-chip>
    <v-alert
      :type="variant === 'blocked' ? 'warning' : 'info'"
      text
      dense
      class="mb-0"
    >
      {{ $t(`tenant.onboarding.level.${variant}`) }}
    </v-alert>
  </div>
</template>

<script>
import {
  completionVariant,
  showsSupervisionNotice,
} from "@/utils/tenantOnboarding";

/**
 * Level and hint accompany the wizard for supervised and blocked; free gets
 * no supervision explanation in the onboarding (supervision spec §9).
 */
export default {
  name: "OnboardingSupervisionNotice",
  props: {
    level: { type: String, default: null },
  },
  computed: {
    variant() {
      return completionVariant(this.level);
    },
    visible() {
      return showsSupervisionNotice(this.level);
    },
  },
};
</script>
