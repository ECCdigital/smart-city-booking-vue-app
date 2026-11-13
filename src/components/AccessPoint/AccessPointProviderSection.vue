<script>
import {
  providerAccessPointDefaults,
  DOOR_TYPE,
  LOCKER_TYPE,
} from "@/utilities/access-points";

// What the creation in the head says it makes, by the type the provider's
// access points start as: an Open Locker one starts as a Schließfachanlage.
const CREATE_LABELS = {
  [DOOR_TYPE]: "accessPoint.management.section.createDoor",
  [LOCKER_TYPE]: "accessPoint.management.section.createLockerSystem",
};

/**
 * The section of one provider on the Zugangspunkte page
 * (ECCdigital/tickets#1103): its name in the head beside the creation, and
 * its access points beneath, which the page hands in through the default
 * slot. The section knows the provider, not the access points: the page
 * loads them and opens the dialogs.
 */
export default {
  name: "AccessPointProviderSection",
  props: {
    // The provider as `getProviders` reports it: `id` and `title`.
    provider: { type: Object, required: true },
  },
  computed: {
    createLabel() {
      const type = providerAccessPointDefaults(this.provider.id)?.type;
      return this.$t(CREATE_LABELS[type] || "accessPoint.management.create");
    },
  },
};
</script>

<template>
  <section class="provider-section" data-test="provider-section">
    <header class="provider-section__head">
      <h3 class="provider-section__title" data-test="provider-section-title">
        {{ provider.title || provider.id }}
      </h3>
      <v-spacer />
      <v-btn
        small
        depressed
        color="primary"
        data-test="provider-section-create"
        @click="$emit('create')"
      >
        <v-icon left small>mdi-plus</v-icon>
        {{ createLabel }}
      </v-btn>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.provider-section {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.provider-section__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 16px;
  background: var(--scb-surface-tint);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.provider-section__title {
  margin: 0;
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}
</style>
