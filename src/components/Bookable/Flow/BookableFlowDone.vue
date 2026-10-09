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

    <p
      v-if="paymentMissing"
      class="flow-done__payment"
      data-test="flow-done-payment-missing"
    >
      <v-icon small color="warning">mdi-alert-outline</v-icon>
      <span>
        {{ $t("bookable.flow.done.payment-missing") }}
        <router-link :to="paymentRoute">
          {{ $t("tenant.onboarding.setup.payment-action") }}
        </router-link>
      </span>
    </p>

    <template v-if="areas.length">
      <div class="flow-done__heading">
        {{ $t("bookable.flow.steps.more.title") }}
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
import ApiTenantService from "@/services/api/ApiTenantService";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import bookableEditing from "@/mixins/bookableEditing";
import { isPaid, publishVariant } from "@/utils/bookableFlow";
import { shownAreas } from "@/utils/bookableAreas";
import { isCriterionMissing } from "@/utils/tenantReadiness";
import { tenantTabRoute } from "@/utils/tenantOnboarding";

const PUBLIC_OUTCOMES = ["published", "direct-link", "listed-not-bookable"];

/**
 * After the save: what became of the publication, the areas of „Weitere
 * Einstellungen“ - each a link to its row in that step (`open-area`) - and
 * the ways on. Nothing of the tenant: its readiness and setup are on
 * „Nächste Schritte“ - except one line when a paid bookable meets a tenant
 * without payment, because bookers could not pay for it. Nothing here blocks.
 */
export default {
  name: "BookableFlowDone",
  mixins: [bookableEditing],
  props: {
    /** What became of the publication: `publicationOutcome`. */
    outcome: { type: String, required: true },
    level: { type: String, default: null },
  },
  data() {
    return { paymentMissing: false };
  },
  computed: {
    // Something is public now: it is listed or bookable.
    published() {
      return PUBLIC_OUTCOMES.includes(this.outcome);
    },
    // A wish noted for later is worded by the tenant's level.
    stateKey() {
      return this.outcome === "noted"
        ? `bookable.flow.done.noted.${publishVariant(this.level)}`
        : `bookable.flow.done.${this.outcome}`;
    },
    areas() {
      return shownAreas(this.expertOptionShown);
    },
    paymentRoute: () => tenantTabRoute("payments"),
  },
  // Shown anew for every outcome, so it asks once per save.
  created() {
    this.checkPayment();
  },
  methods: {
    // The Bereitschafts-Check knows whether the tenant takes payments; only a
    // paid bookable asks, and only who may read the check.
    async checkPayment() {
      const tenantId = this.bookable.tenantId;
      if (!isPaid(this.bookable)) return;
      if (!TenantPermissionService.allowReadiness(tenantId)) return;
      try {
        const readiness = await ApiTenantService.getReadiness(tenantId);
        this.paymentMissing = isCriterionMissing(readiness, "payment");
      } catch (error) {
        // Without an answer the line stays away; the save itself succeeded.
        console.error(error);
      }
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

.flow-done__payment {
  display: flex;
  align-items: baseline;
  gap: var(--scb-space-2);
  margin: 0 0 var(--scb-gap-cards);
  font-size: var(--scb-font-size-sm);
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
