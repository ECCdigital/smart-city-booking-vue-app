<template>
  <div class="next-steps" data-test="next-steps">
    <v-sheet outlined class="next-steps__state">
      <v-avatar color="success" size="32">
        <v-icon dark small>mdi-check</v-icon>
      </v-avatar>
      <i18n
        path="tenant.onboarding.next.created"
        tag="div"
        class="next-steps__created"
        data-test="next-created"
      >
        <template #name>
          <em>{{ tenant.name }}</em>
        </template>
      </i18n>
    </v-sheet>

    <OnboardingSupervisionNotice :level="tenant.supervisionLevel" />

    <h2 class="next-steps__heading">
      {{ $t("tenant.onboarding.next.title") }}
    </h2>
    <div class="next-steps__tiles">
      <router-link
        v-for="tile in tiles"
        :key="tile.key"
        :to="tile.to"
        class="next-steps__tile"
        :data-test="`next-tile-${tile.key}`"
      >
        <v-icon color="primary">{{ tile.icon }}</v-icon>
        <span class="next-steps__tile-title">{{ $t(tile.titleKey) }}</span>
        <span class="next-steps__hint">{{ $t(tile.hintKey) }}</span>
      </router-link>
    </div>

    <v-card
      v-if="readinessAllowed"
      outlined
      class="section-card next-steps__card"
    >
      <v-card-title class="section-header">
        <v-icon>mdi-clipboard-check-outline</v-icon>
        <span>{{ $t("tenant.readiness.title") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="next-steps__hint">{{ $t("tenant.readiness.hint") }}</p>
        <TenantReadinessCheck :tenant-id="tenant.id" hide-title />
      </v-card-text>
    </v-card>

    <v-card outlined class="section-card next-steps__card">
      <v-card-title class="section-header">
        <v-icon>mdi-format-list-checks</v-icon>
        <span>{{ $t("tenant.onboarding.next.setup") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <!-- A tenant's payment serves its paid offers. -->
        <OnboardingSetupLinks paid />
      </v-card-text>
    </v-card>

    <div class="onboarding-actions">
      <v-btn text :to="{ name: 'dashboard' }" data-test="next-home">
        {{ $t("tenant.onboarding.next.home") }}
      </v-btn>
    </div>
  </div>
</template>

<script>
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import { firstBookableRoute } from "@/utils/tenantOnboarding";

// The ways on, equal in rank; none leads back here.
const TILES = Object.freeze([
  {
    key: "settings",
    icon: "mdi-cog-outline",
    to: { name: "tenant" },
    titleKey: "tenant.onboarding.next.settings",
    hintKey: "tenant.onboarding.next.settings-hint",
  },
  {
    key: "invite",
    icon: "mdi-account-plus-outline",
    to: { name: "user" },
    titleKey: "tenant.onboarding.next.invite",
    hintKey: "tenant.onboarding.next.invite-hint",
  },
  {
    key: "bookable",
    icon: "mdi-plus-box-outline",
    to: firstBookableRoute(),
    titleKey: "tenant.onboarding.first-bookable",
    hintKey: "tenant.onboarding.next.bookable-hint",
  },
]);

/**
 * Nächste Schritte (glossary, ECCdigital/tickets#367): the page after a
 * tenant's creation. Top to bottom: the created tenant, its level (none for
 * free), three equal ways on, the readiness check with legal texts and
 * payment - they belong to the tenant, not to a bookable - and a plain way
 * out. Every way is a plain link; none leads back here.
 */
export default {
  name: "OnboardingNextSteps",
  components: {
    OnboardingSupervisionNotice,
    OnboardingSetupLinks,
    TenantReadinessCheck,
  },
  props: {
    tenant: { type: Object, required: true },
  },
  computed: {
    tiles: () => TILES,
    readinessAllowed() {
      return TenantPermissionService.allowReadiness(this.tenant.id);
    },
  },
};
</script>

<style scoped>
.next-steps__state {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
  padding: var(--scb-space-3) var(--scb-space-4);
  margin-bottom: var(--scb-gap-cards);
  border-radius: var(--scb-radius-surface) !important;
}

.next-steps__created {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: var(--scb-line-height-tight);
}

.next-steps__heading {
  margin: var(--scb-space-2) 0 var(--scb-space-3);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.next-steps__card {
  margin-bottom: var(--scb-gap-cards);
}

.next-steps__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--scb-space-3);
  margin-bottom: var(--scb-gap-cards);
}

.next-steps__tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--scb-space-1);
  padding: var(--scb-space-3) var(--scb-space-4);
  color: inherit;
  text-decoration: none;
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  outline: none;
  transition: background-color var(--scb-motion-fast),
    border-color var(--scb-motion-fast);
}

.next-steps__tile:hover {
  border-color: var(--v-primary-base);
  background-color: var(--scb-hover-tint);
}

.next-steps__tile:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

.next-steps__tile-title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.next-steps__hint {
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .next-steps__tile {
    transition: none;
  }
}
</style>
