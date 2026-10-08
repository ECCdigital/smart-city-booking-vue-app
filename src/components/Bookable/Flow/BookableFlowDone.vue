<template>
  <div class="flow-done" data-test="flow-done">
    <v-sheet outlined class="flow-done__state" data-test="flow-done-state">
      <v-avatar :color="published ? 'success' : 'primary'" size="32">
        <v-icon dark small>
          {{ published ? "mdi-check" : "mdi-content-save-outline" }}
        </v-icon>
      </v-avatar>
      <div>
        <div class="flow-done__title" data-test="flow-done-title">
          {{ $t(`${stateKey}.title`) }}
        </div>
        <div class="flow-done__text">{{ $t(`${stateKey}.text`) }}</div>
      </div>
    </v-sheet>

    <v-card outlined class="section-card flow-done__card">
      <v-card-title class="section-header">
        <v-icon>mdi-clipboard-check-outline</v-icon>
        <span>{{ $t("tenant.readiness.title") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="flow-field__hint mt-0">{{ $t("tenant.readiness.hint") }}</p>
        <TenantReadinessCheck :tenant-id="bookable.tenantId" hide-title />
      </v-card-text>
    </v-card>

    <v-card outlined class="section-card flow-done__card">
      <v-card-title class="section-header">
        <v-icon>mdi-format-list-checks</v-icon>
        <span>{{ $t("bookable.flow.done.open-points") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="flow-field__hint mt-0">
          {{ $t("bookable.flow.done.open-points-hint") }}
        </p>
        <OnboardingSetupLinks :paid="paid" payment-when-paid-only />
      </v-card-text>
    </v-card>

    <template v-if="areas.length">
      <div class="flow-done__heading">
        {{ $t("bookable.flow.done.optional") }}
        <span class="flow-field__hint">
          – {{ $t("bookable.flow.done.optional-note") }}
        </span>
      </div>
      <div class="flow-done__sections" data-test="flow-done-sections">
        <button
          v-for="area in areas"
          :key="area.key"
          type="button"
          class="flow-done__section"
          :data-test="`flow-done-area-${area.key}`"
          @click="$emit('open-area', area.key)"
        >
          <span class="flow-done__section-title">
            {{ $t(area.titleKey) }}
            <v-icon small>mdi-chevron-right</v-icon>
          </span>
          <span class="flow-field__hint mt-0">
            {{ $t(area.hintKey) }}
          </span>
        </button>
      </div>
    </template>

    <div class="flow-footer">
      <v-btn text data-test="flow-another" @click="$emit('another')">
        <v-icon left small>mdi-plus</v-icon>
        {{ $t("bookable.flow.done.another") }}
      </v-btn>
      <v-btn
        color="primary"
        depressed
        data-test="flow-done-leave"
        @click="$emit('leave')"
      >
        <v-icon left small>mdi-view-grid-outline</v-icon>
        {{ $t("bookable.flow.leave") }}
      </v-btn>
    </div>
  </div>
</template>

<script>
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";
import bookableEditing from "@/mixins/bookableEditing";
import { isPaid, publishVariant } from "@/utils/bookableFlow";
import { shownAreas } from "@/utils/bookableAreas";

/**
 * After the save: what became of the publication, the readiness check, the
 * open points legal texts and payment (payment for a paid offer only), the
 * areas of „Weitere Einstellungen“ - each a link to its row in that step
 * (`open-area`) - and the ways on. Nothing here blocks.
 */
export default {
  name: "BookableFlowDone",
  components: { TenantReadinessCheck, OnboardingSetupLinks },
  mixins: [bookableEditing],
  props: {
    /** `published`, `draft` (a new bookable kept back) or `kept`. */
    outcome: { type: String, required: true },
    level: { type: String, default: null },
  },
  computed: {
    published() {
      return this.outcome === "published";
    },
    stateKey() {
      return this.published
        ? `bookable.flow.done.published.${publishVariant(this.level)}`
        : `bookable.flow.done.${this.outcome}`;
    },
    paid() {
      return isPaid(this.bookable);
    },
    areas() {
      return shownAreas(this.expertOptionShown);
    },
  },
};
</script>

<style scoped>
.flow-done__state {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
  padding: var(--scb-space-3) var(--scb-space-4);
  margin-bottom: var(--scb-gap-cards);
  border-radius: var(--scb-radius-surface) !important;
}

.flow-done__title {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: var(--scb-line-height-tight);
}

.flow-done__text {
  margin-top: 2px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.flow-done__card {
  margin-bottom: var(--scb-gap-cards);
}

.flow-done__heading {
  margin: var(--scb-space-2) 0 var(--scb-space-3);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.flow-done__sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--scb-space-3);
}

.flow-done__section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--scb-space-3) var(--scb-space-4);
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  cursor: pointer;
  outline: none;
  transition: background-color var(--scb-motion-fast),
    border-color var(--scb-motion-fast);
}

.flow-done__section:hover {
  border-color: var(--v-primary-base);
  background-color: var(--scb-hover-tint);
}

.flow-done__section:focus-visible {
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

.flow-done__section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

@media (prefers-reduced-motion: reduce) {
  .flow-done__section {
    transition: none;
  }
}
</style>
