<script>
import { groupProviders } from "@/utilities/access-setup";

/**
 * The choice of providers to connect on the Zugangspunkte page
 * (ECCdigital/tickets#1106). On the empty page (`start`) it asks which
 * providers the tenant uses and lists them in two groups, each with
 * „Verbinden“; beneath the sections it is one line „Weiteren Anbieter
 * verbinden“. Either way it hands the chosen provider up as `connect`.
 */
export default {
  name: "AccessProviderPicker",
  props: {
    // The providers not connected yet: `{ id, title }`.
    providers: { type: Array, required: true },
    // The empty page rather than the line beneath the sections.
    start: { type: Boolean, default: false },
  },
  computed: {
    groups() {
      return groupProviders(this.providers);
    },
  },
};
</script>

<template>
  <div v-if="start" class="provider-picker" data-test="provider-picker-start">
    <div class="text-h6">
      {{ $t("accessPoint.management.setup.start.question") }}
    </div>
    <p class="provider-picker__intro text-body-2 text--secondary mt-1 mb-5">
      {{ $t("accessPoint.management.setup.start.intro") }}
    </p>
    <div class="provider-picker__groups">
      <div
        v-for="group in groups"
        :key="group.key"
        data-test="provider-pick-group"
      >
        <div
          class="provider-picker__group-title"
          data-test="provider-pick-group-title"
        >
          {{ $t(`accessPoint.management.setup.groups.${group.key}`) }}
        </div>
        <div class="provider-picker__list">
          <div
            v-for="provider in group.providers"
            :key="provider.id"
            class="provider-picker__row"
            data-test="provider-pick"
          >
            <span
              class="provider-picker__title"
              data-test="provider-pick-title"
            >
              {{ provider.title }}
            </span>
            <v-spacer />
            <v-btn
              small
              outlined
              color="primary"
              @click="$emit('connect', provider.id)"
            >
              {{ $t("accessPoint.management.setup.connect") }}
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-else-if="providers.length"
    class="provider-picker__more"
    data-test="provider-picker-more"
  >
    <span class="text--secondary mr-3">
      {{ $t("accessPoint.management.setup.more") }}
    </span>
    <v-chip
      v-for="provider in providers"
      :key="provider.id"
      small
      outlined
      class="mr-2 mb-1"
      data-test="provider-pick"
      @click="$emit('connect', provider.id)"
    >
      <v-icon left x-small>mdi-plus</v-icon>
      {{ provider.title }}
    </v-chip>
  </div>
</template>

<style scoped>
.provider-picker__intro {
  max-width: 62ch;
}

.provider-picker__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--scb-space-6);
}

.provider-picker__group-title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
  margin-bottom: 6px;
}

.provider-picker__list {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.provider-picker__row {
  display: flex;
  align-items: center;
  padding: var(--scb-space-3) var(--scb-space-4);
}

.provider-picker__row + .provider-picker__row {
  border-top: 1px solid var(--scb-rule);
}

.provider-picker__title {
  font-weight: var(--scb-font-weight-medium);
}

.provider-picker__more {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: var(--scb-font-size-sm);
}
</style>
