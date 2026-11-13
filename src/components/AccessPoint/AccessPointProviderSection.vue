<script>
import {
  providerAccessPointDefaults,
  DOOR_TYPE,
  LOCKER_TYPE,
} from "@/utilities/access-points";
import { switchOffQuestion } from "@/utilities/access-app-lifecycle";

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
 *
 * The switch „Aktiv“ in the head (ECCdigital/tickets#1107) hands up
 * `switch` with the state asked for: on at once, off only once the line
 * beneath the head has named what stops opening and was confirmed. The
 * slot `iqs` holds the row of the IQs of Salto KS, above the access points.
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
    // The fault of the last test, named while the provider is failing.
    lastError: { type: String, default: "" },
    // The provider's access points, for what stops opening when it is
    // switched off.
    accessPoints: { type: Array, default: () => [] },
  },
  data() {
    return {
      // The question before switching off stands beneath the head.
      askingOff: false,
    };
  },
  computed: {
    knownState() {
      return Object.prototype.hasOwnProperty.call(STATES, this.state);
    },
    stateColor() {
      return STATES[this.state];
    },
    // Only a stored application can be switched.
    switchable() {
      return this.knownState;
    },
    active() {
      return this.state !== "disabled";
    },
    switchOffQuestion() {
      return switchOffQuestion(
        this.provider.title || this.provider.id,
        this.accessPoints
      );
    },
    createLabel() {
      const type = providerAccessPointDefaults(this.provider.id)?.type;
      return this.$t(CREATE_LABELS[type] || "accessPoint.management.create");
    },
  },
  watch: {
    state() {
      this.askingOff = false;
    },
  },
  methods: {
    onSwitch(on) {
      if (on) {
        this.askingOff = false;
        if (!this.active) this.$emit("switch", true);
      } else {
        this.askingOff = true;
      }
    },
    switchOff() {
      this.$emit("switch", false);
    },
    // „Zugangsdaten prüfen“ unfolds the settings, and leaves them open.
    checkCredentials() {
      if (!this.settingsOpen) this.$emit("settings");
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
      <v-chip
        v-if="knownState"
        small
        label
        :color="stateColor"
        :dark="!!stateColor"
        data-test="provider-section-state"
      >
        {{ $t(`accessPoint.management.section.states.${state}`) }}
      </v-chip>
      <v-spacer />
      <v-switch
        v-if="switchable"
        :input-value="active && !askingOff"
        :label="$t('accessPoint.management.section.active')"
        dense
        inset
        hide-details
        class="provider-section__switch"
        data-test="provider-section-active"
        @change="onSwitch"
      />
      <v-btn
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
        small
        depressed
        color="primary"
        :disabled="!active"
        data-test="provider-section-create"
        @click="$emit('create')"
      >
        <v-icon left small>mdi-plus</v-icon>
        {{ createLabel }}
      </v-btn>
    </header>
    <div
      v-if="askingOff"
      class="provider-section__note provider-section__note--off"
      data-test="provider-section-switch-off"
    >
      <v-icon small color="error" class="mr-2">mdi-power</v-icon>
      <span>{{ switchOffQuestion }}</span>
      <v-spacer />
      <v-btn x-small text @click="askingOff = false">
        {{ $t("accessPoint.management.section.switchOff.cancel") }}
      </v-btn>
      <v-btn x-small depressed color="error" @click="switchOff">
        {{ $t("accessPoint.management.section.switchOff.confirm") }}
      </v-btn>
    </div>
    <div
      v-else-if="state === 'failing'"
      class="provider-section__note provider-section__note--failing"
      data-test="provider-section-failing"
    >
      <v-icon small color="error" class="mr-2">mdi-alert-octagon</v-icon>
      <span>
        {{
          lastError
            ? $t("accessPoint.management.section.failing.error", {
                error: lastError,
              })
            : $t("accessPoint.management.section.failing.noError")
        }}
      </span>
      <v-spacer />
      <v-btn x-small outlined color="error" @click="checkCredentials">
        {{ $t("accessPoint.management.section.failing.check") }}
      </v-btn>
    </div>
    <slot v-if="settingsOpen" name="settings" />
    <slot name="iqs" />
    <!-- Switched off, the rows go pale; their actions stay at hand. -->
    <div
      class="provider-section__rows"
      :class="{ 'provider-section__rows--off': !active }"
      data-test="provider-section-rows"
    >
      <slot />
    </div>
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

.provider-section__switch {
  margin: 0 4px 0 0;
  padding: 0;
}

.provider-section__note {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
  border-bottom: 1px solid var(--scb-rule);
}

.provider-section__note--off,
.provider-section__note--failing {
  background: var(--scb-error-tint, rgba(244, 67, 54, 0.08));
}

.provider-section__rows--off {
  opacity: 0.55;
}

.provider-section__title {
  margin: 0;
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}
</style>
