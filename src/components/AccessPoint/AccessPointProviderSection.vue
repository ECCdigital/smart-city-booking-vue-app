<script>
import {
  providerAccessPointDefaults,
  DOOR_TYPE,
  LOCKER_TYPE,
} from "@/utilities/access-points";
import { emptySection, nextAfterConnect } from "@/utilities/access-setup";

// What the creation in the head says it makes, by the type the provider's
// access points start as: an Open Locker one starts as a Schließfachanlage.
const CREATE_LABELS = {
  [DOOR_TYPE]: "accessPoint.management.section.createDoor",
  [LOCKER_TYPE]: "accessPoint.management.section.createLockerSystem",
};

// The state of the provider's connection as the backend derives it
// (`connectionState`), with the colour of its chip.
const STATES = {
  connected: "success",
  unchecked: "",
  failing: "error",
  disabled: "grey",
};

/**
 * The section of one provider on the Zugangspunkte page
 * (ECCdigital/tickets#1103): its name in the head beside the state of its
 * connection, „Einstellungen“ and the creation, and its access points
 * beneath, which the page hands in through the default slot. The settings
 * unfold between the two (ECCdigital/tickets#1104), handed in through the
 * slot `settings`. The section knows the provider, not the access points:
 * the page loads them and opens the dialogs.
 */
export default {
  name: "AccessPointProviderSection",
  props: {
    // The provider as `getProviders` reports it: `id` and `title`.
    provider: { type: Object, required: true },
    // The `connectionState` of the stored application; empty without one.
    state: { type: String, default: "" },
    // Whether the settings of the provider are unfolded beneath the head;
    // the page hands them in through the slot `settings`.
    settingsOpen: { type: Boolean, default: false },
    // A provider being connected (ECCdigital/tickets#1106): nothing stored
    // yet, so the head offers „Verwerfen“ alone.
    draft: { type: Boolean, default: false },
    // Whether the provider has no access point yet, and whether it was just
    // connected: the section then names the next step.
    empty: { type: Boolean, default: false },
    fresh: { type: Boolean, default: false },
    // The IQs of the provider not activated yet.
    openIqs: { type: Number, default: 0 },
  },
  computed: {
    knownState() {
      return Object.prototype.hasOwnProperty.call(STATES, this.state);
    },
    stateColor() {
      return STATES[this.state];
    },
    emptyText() {
      return emptySection(this.provider.id);
    },
    nextText() {
      return nextAfterConnect(this.provider, this.openIqs);
    },
    createLabel() {
      const type = providerAccessPointDefaults(this.provider.id)?.type;
      return this.$t(CREATE_LABELS[type] || "accessPoint.management.create");
    },
  },
};
</script>

<template>
  <section
    class="provider-section"
    :class="{ 'provider-section--draft': draft }"
    data-test="provider-section"
  >
    <header class="provider-section__head">
      <h3 class="provider-section__title" data-test="provider-section-title">
        {{ provider.title || provider.id }}
      </h3>
      <v-chip
        v-if="draft"
        small
        label
        outlined
        data-test="provider-section-state"
      >
        {{ $t("accessPoint.management.section.notConnected") }}
      </v-chip>
      <v-chip
        v-else-if="knownState"
        small
        label
        :color="stateColor"
        :dark="!!stateColor"
        data-test="provider-section-state"
      >
        {{ $t(`accessPoint.management.section.states.${state}`) }}
      </v-chip>
      <v-spacer />
      <v-btn
        v-if="draft"
        small
        text
        data-test="provider-section-discard"
        @click="$emit('discard')"
      >
        {{ $t("accessPoint.management.section.discard") }}
      </v-btn>
      <v-btn
        v-if="!draft"
        small
        text
        data-test="provider-section-settings"
        @click="$emit('settings')"
      >
        <v-icon left small>mdi-cog-outline</v-icon>
        {{ $t("accessPoint.management.section.settings") }}
        <v-icon right small>
          {{ settingsOpen ? "mdi-chevron-up" : "mdi-chevron-down" }}
        </v-icon>
      </v-btn>
      <v-btn
        v-if="!draft"
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
    <slot v-if="settingsOpen" name="settings" />
    <template v-if="!draft && empty">
      <div
        v-if="fresh"
        class="provider-section__note provider-section__note--next"
        data-test="provider-section-next"
      >
        <v-icon small color="primary" class="mr-2">mdi-check-circle</v-icon>
        <span>{{ nextText }}</span>
      </div>
      <div
        v-else
        class="provider-section__note"
        data-test="provider-section-empty"
      >
        {{ emptyText }}
      </div>
    </template>
    <slot />
  </section>
</template>

<style scoped>
.provider-section {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.provider-section--draft {
  border-style: dashed;
}

.provider-section__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 16px;
  background: var(--scb-surface-tint);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.provider-section__note {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.provider-section__note--next {
  color: var(--scb-text);
  background: var(--scb-selected-tint-faint);
}

.provider-section__title {
  margin: 0;
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}
</style>
