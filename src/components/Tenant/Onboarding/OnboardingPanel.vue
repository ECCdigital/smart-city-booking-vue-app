<template>
  <v-card outlined class="section-card onboarding-panel" data-test="panel">
    <v-card-title class="section-header">
      <v-icon>mdi-clipboard-text-outline</v-icon>
      <span>{{ $t("tenant.onboarding.panel.title") }}</span>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <div class="booking-caption">
        {{ $t("tenant.onboarding.steps.tenant.label") }}
      </div>
      <div v-if="tenant" class="booking-facts" data-test="panel-tenant">
        <div class="booking-fact">
          <span class="booking-fact__label">
            {{ $t("tenant.onboarding.tenant.name") }}
          </span>
          <span class="booking-fact__value booking-fact__value--strong">
            {{ tenant.name }}
          </span>
        </div>
        <div class="booking-fact">
          <span class="booking-fact__label">
            {{ $t("tenant.onboarding.tenant.contact-name") }}
          </span>
          <span class="booking-fact__value">{{
            tenant.contactName || "–"
          }}</span>
        </div>
        <div class="booking-fact">
          <span class="booking-fact__label">
            {{ $t("tenant.onboarding.tenant.mail") }}
          </span>
          <span class="booking-fact__value">{{ tenant.mail || "–" }}</span>
        </div>
      </div>
      <p v-else class="onboarding-panel__pending">
        {{ $t("tenant.onboarding.panel.pending", { index: 1 }) }}
      </p>

      <div class="booking-caption booking-caption--spaced">
        {{ $t("tenant.onboarding.steps.offer.label") }}
      </div>
      <div v-if="bookable" class="booking-facts" data-test="panel-offer">
        <div v-for="row in summary" :key="row.label" class="booking-fact">
          <span class="booking-fact__label">{{ row.label }}</span>
          <span
            class="booking-fact__value"
            :class="{ 'booking-fact__value--strong': row.strong }"
          >
            {{ row.value }}
          </span>
        </div>
      </div>
      <p v-else class="onboarding-panel__pending">
        {{ $t("tenant.onboarding.panel.pending", { index: 2 }) }}
      </p>

      <template v-if="showsLevel">
        <div class="booking-caption booking-caption--spaced">
          {{ $t("tenant.onboarding.panel.supervision") }}
        </div>
        <OnboardingSupervisionNotice :level="level" compact />
      </template>

      <p class="onboarding-panel__note">
        {{ $t("tenant.onboarding.panel.note") }}
      </p>
    </v-card-text>
  </v-card>
</template>

<script>
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import { getTypeText } from "@/utils/bookables";
import {
  OFFER_WEEKDAYS,
  showsSupervisionNotice,
  storedChoices,
} from "@/utils/tenantOnboarding";

/**
 * The sticky panel beside the wizard: what the run has saved so far, as the
 * booking page lists its facts - the tenant, the first bookable, the
 * supervision level when it is not free. A step not yet reached says which
 * step will fill it. The panel gates nothing and is the same on every step.
 */
export default {
  name: "OnboardingPanel",
  components: { OnboardingSupervisionNotice },
  props: {
    tenant: { type: Object, default: null },
    bookable: { type: Object, default: null },
    level: { type: String, default: null },
  },
  computed: {
    showsLevel() {
      return showsSupervisionNotice(this.level);
    },
    /** The bookable's facts, read from what is stored - not from the form. */
    summary() {
      const t = (key, params) => this.$t(`tenant.onboarding.${key}`, params);
      const bookable = this.bookable;

      return [
        {
          label: t("overview.summary.offer"),
          value: bookable.title,
          strong: true,
        },
        {
          label: t("offer.type"),
          value: getTypeText(bookable.type) || "–",
        },
        { label: t("overview.summary.price"), value: this.priceLabel() },
        {
          label: t("overview.summary.amount"),
          value:
            Number(bookable.amount) === 0
              ? t("overview.summary.unlimited")
              : String(bookable.amount),
        },
        {
          label: t("overview.summary.confirmation"),
          value: bookable.autoCommitBooking
            ? t("offer.confirmation-auto")
            : t("offer.confirmation-manual"),
        },
        {
          label: t("overview.summary.availability"),
          value: this.availabilityLabel(),
        },
      ];
    },
  },
  methods: {
    /** "15,00 € pro Stunde", or the free word. */
    priceLabel() {
      const bookable = this.bookable;
      if (storedChoices(bookable).priceChoice !== "paid") {
        return this.$t("tenant.onboarding.offer.price-free");
      }
      const price = Number(bookable.priceCategories?.[0]?.priceEur) || 0;
      const typeKey = `tenant.onboarding.offer.price-types.${bookable.priceType}`;
      const type = this.$te(typeKey)
        ? this.$t(typeKey).toLowerCase()
        : bookable.priceType;
      const amount = price.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
      });
      return `${amount} € ${type}`;
    },
    /** "Mo, Di, Mi, 09:00–18:00", or the unrestricted word. */
    availabilityLabel() {
      const hours = this.bookable.openingHours?.[0];
      if (!this.bookable.isOpeningHoursRelated || !hours) {
        return this.$t("tenant.onboarding.offer.availability-always");
      }
      const days = (hours.weekdays || [])
        .map((id) => OFFER_WEEKDAYS.find((day) => day.id === id)?.short)
        .join(", ");
      return `${days}, ${hours.startTime}–${hours.endTime}`;
    },
  },
};
</script>

<style scoped>
.onboarding-panel__pending {
  margin: 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-caption);
}

.onboarding-panel__note {
  margin: var(--scb-space-5) 0 0;
  padding-top: var(--scb-space-3);
  border-top: 1px solid var(--scb-rule);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
</style>
