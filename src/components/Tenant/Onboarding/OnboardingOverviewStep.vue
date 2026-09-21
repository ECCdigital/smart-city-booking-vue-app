<template>
  <div data-test="overview-step">
    <template v-if="done">
      <h2 class="text-h5 mb-3" data-test="overview-done-title">
        {{ $t(`tenant.onboarding.overview.done.${variant}.title`) }}
      </h2>
      <v-alert
        v-if="variant !== 'free'"
        type="success"
        text
        dense
        data-test="overview-done-text"
      >
        {{ $t(`tenant.onboarding.overview.done.${variant}.text`) }}
      </v-alert>
    </template>
    <h2 v-else class="text-h5 mb-1">
      {{ $t("tenant.onboarding.overview.title") }}
    </h2>
    <p class="text--secondary">{{ bookable.title }} · {{ tenant.name }}</p>

    <v-simple-table dense class="mb-6">
      <tbody>
        <tr v-for="row in summary" :key="row.label">
          <td class="text--secondary" style="width: 160px">{{ row.label }}</td>
          <td>{{ row.value }}</td>
        </tr>
      </tbody>
    </v-simple-table>

    <TenantReadinessCheck ref="readiness" :tenant-id="tenant.id" />

    <h3 class="text-h6 mt-6">
      {{ $t("tenant.onboarding.overview.supplement") }}
    </h3>
    <OnboardingSetupLinks
      :paid="paid"
      return-step="overview"
      :bookable-id="bookable.id"
    />

    <v-alert
      v-if="!done && !choicesConfirmed"
      type="warning"
      text
      dense
      class="mt-4"
      data-test="overview-confirm-choices"
    >
      {{ $t("tenant.onboarding.overview.confirm-choices") }}
    </v-alert>
    <v-alert v-if="completeFailed" type="error" text dense class="mt-4">
      {{ $t("tenant.onboarding.overview.complete-failed") }}
    </v-alert>

    <div class="d-flex flex-wrap mt-6" style="gap: 12px">
      <v-btn
        v-if="!done"
        color="primary"
        :disabled="!choicesConfirmed"
        :loading="inProgress"
        @click="$emit('complete')"
        data-test="overview-complete"
      >
        {{ $t(`tenant.onboarding.overview.action.${variant}`) }}
      </v-btn>
      <v-btn outlined @click="$emit('edit-offer')" data-test="overview-edit">
        {{ $t("tenant.onboarding.overview.edit-offer") }}
      </v-btn>
      <v-btn
        :outlined="!done"
        :color="done ? 'primary' : undefined"
        @click="$emit('exit')"
      >
        {{ $t("tenant.onboarding.exit") }}
      </v-btn>
    </div>
  </div>
</template>

<script>
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";
import { getTypeText } from "@/utils/bookables";
import {
  OFFER_WEEKDAYS,
  completionVariant,
  storedChoices,
} from "@/utils/tenantOnboarding";

/**
 * Step 4: summary, the non-binding readiness check and the closing action,
 * which reads by supervision level (supervision spec §9): free publishes,
 * supervised submits for review, blocked notes the publication wish. A stored
 * publication wish is the done state.
 */
export default {
  name: "OnboardingOverviewStep",
  components: { TenantReadinessCheck, OnboardingSetupLinks },
  props: {
    tenant: { type: Object, required: true },
    bookable: { type: Object, required: true },
    choicesConfirmed: { type: Boolean, default: false },
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
    summary() {
      const t = (key, params) => this.$t(`tenant.onboarding.${key}`, params);
      const bookable = this.bookable;
      const hours = bookable.openingHours?.[0];
      const price = Number(bookable.priceCategories?.[0]?.priceEur) || 0;

      return [
        {
          label: t("overview.summary.offer"),
          value: `${bookable.title} (${getTypeText(bookable.type)})`,
        },
        {
          label: t("overview.summary.price"),
          value: this.paid
            ? `${price.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
              })} € · ${
                this.$te(
                  `tenant.onboarding.offer.price-types.${bookable.priceType}`
                )
                  ? t(`offer.price-types.${bookable.priceType}`)
                  : bookable.priceType
              }`
            : t("offer.price-free"),
        },
        {
          label: t("overview.summary.booking"),
          value: `${
            bookable.isScheduleRelated
              ? t("offer.schedule-period")
              : t("offer.schedule-none")
          }, ${t("overview.summary.units", { amount: bookable.amount })}`,
        },
        {
          label: t("overview.summary.confirmation"),
          value: bookable.autoCommitBooking
            ? t("offer.confirmation-auto")
            : t("offer.confirmation-manual"),
        },
        {
          label: t("overview.summary.availability"),
          value:
            bookable.isOpeningHoursRelated && hours
              ? `${(hours.weekdays || [])
                  .map(
                    (id) => OFFER_WEEKDAYS.find((day) => day.id === id)?.short
                  )
                  .join(", ")} · ${hours.startTime}–${hours.endTime}`
              : t("offer.availability-always"),
        },
      ];
    },
  },
  methods: {
    reloadReadiness() {
      this.$refs.readiness?.load();
    },
  },
};
</script>
