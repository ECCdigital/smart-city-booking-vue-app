<template>
  <BaseSection :title="$t('instance.edit.sso.title')" icon="mdi-shield-lock">
    <SsoStatusCard :guide="guide" :saved="saved">
      <template #actions>
        <v-btn
          color="primary"
          depressed
          :disabled="!!checkLock"
          :loading="checking"
          data-test="sso-check"
          @click="checkRealm"
        >
          <v-icon left>mdi-stethoscope</v-icon>
          {{ $t("instance.edit.sso.check.action") }}
        </v-btn>
        <RealmGuideTextMenu :guide="guide" :result="result" />
      </template>

      <RealmCheckStatus
        :lock="checkLock"
        :failure="checkFailure"
        :result="result"
      />
    </SsoStatusCard>

    <v-expansion-panels
      v-model="connectionPanel"
      flat
      class="sso-panels mb-6"
      data-test="sso-connection"
    >
      <v-expansion-panel>
        <v-expansion-panel-header class="sso-panels__header">
          <div>
            <div class="sso-panels__title">
              {{ $t("instance.edit.sso.connection.title") }}
            </div>
            <div class="sso-panels__subtitle">
              {{ $t("instance.edit.sso.connection.subtitle") }}
            </div>
          </div>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <InstanceEditKeycloak
            :instance="instance"
            :tenants="tenants"
            :available-roles="availableRoles"
            @update:instance="$emit('update:instance', $event)"
          />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <RealmGuideChecklist :guide="guide" :results="checkSteps" />
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import InstanceEditKeycloak from "@/components/Instance/Edit/InstanceEditKeycloak.vue";
import RealmCheckStatus from "@/components/Instance/Edit/RealmCheckStatus.vue";
import RealmGuideChecklist from "@/components/Instance/Edit/RealmGuideChecklist.vue";
import RealmGuideTextMenu from "@/components/Instance/Edit/RealmGuideTextMenu.vue";
import SsoStatusCard from "@/components/Instance/Edit/SsoStatusCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import { getAuthMode } from "@/services/auth/authMode";
import { directRedirects } from "@/services/auth/directRedirects";
import { buildRealmGuide } from "@/services/keycloak/realmGuide";
import {
  checkBody,
  checkErrorMessage,
  checkResult,
  resultSteps,
  valueNames,
} from "@/services/keycloak/realmCheck";

export default {
  name: "InstanceEditSingleSignOn",
  components: {
    BaseSection,
    InstanceEditKeycloak,
    RealmCheckStatus,
    RealmGuideChecklist,
    RealmGuideTextMenu,
    SsoStatusCard,
  },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
    /** The form differs from the saved instance. */
    hasUnsavedChanges: { type: Boolean, default: false },
  },
  data() {
    return {
      /** `0` while „Verbindung zu Keycloak“ is open, else `undefined`. */
      connectionPanel: undefined,
      /** Saved while this tab was open; sign-in still runs on the old values. */
      saved: false,
      /** BFF mode: the BFF's answer naming its Adressen, once it arrived. */
      bffAddresses: null,
      /** BFF mode: the BFF did not answer. */
      bffFailed: false,
      /**
       * The result of „Realm prüfen“ (`checkResult`: the backend's rows plus
       * the Adressen nobody could check) until the tab is left or the form
       * is saved.
       */
      result: null,
      /** „Realm prüfen“ is on its way. */
      checking: false,
      /** Counts the visits, so an answer for an earlier one is dropped. */
      checkRun: 0,
      /** Why the last check brought no result, or `null`. */
      checkFailure: null,
    };
  },
  computed: {
    keycloakApp() {
      return (this.instance.applications || []).find(
        (a) => a.id === "keycloak"
      );
    },
    mode() {
      return getAuthMode();
    },
    /**
     * The Admin UI's side of the Anleitung: its Adressen and their
     * Rücksprungadressen. In direct mode they come from the function the
     * sign-in uses; in BFF mode only the BFF knows its paths and names them
     * per Adresse of its allowlist (`GET <BFF>/auth/sso/addresses`).
     */
    admin() {
      const origin = window.location.origin;
      if (this.mode === "bff") {
        if (this.bffAddresses) {
          const { allowlist, addresses } = this.bffAddresses;
          return { source: "bff", origin, allowlist, addresses };
        }
        return {
          source: this.bffFailed ? "bff-unavailable" : "bff-loading",
          addresses: [{ origin, placeholder: true }],
        };
      }
      return {
        source: "direct",
        addresses: [directRedirects(origin).keycloak],
      };
    },
    /**
     * Why „Realm prüfen“ is locked, or `null`. The backend checks the saved
     * values, so they must all be there and the form must be saved. In BFF
     * mode the BFF must have answered first; otherwise its Adressen would go
     * unchecked as if it had not named them.
     */
    checkLock() {
      if (!this.guide.complete) {
        return this.$t("instance.edit.sso.check.lock.missing", {
          values: valueNames(this.guide.missing),
        });
      }
      if (this.hasUnsavedChanges) {
        return this.$t("instance.edit.sso.check.lock.unsaved");
      }
      if (this.admin.source === "bff-loading") {
        return this.$t("instance.edit.sso.check.lock.bffLoading");
      }
      return null;
    },
    /** The result of the check per step of the checklist. */
    checkSteps() {
      return this.result ? resultSteps(this.result) : {};
    },
    guide() {
      return buildRealmGuide({
        keycloakApp: this.keycloakApp,
        portalUrl: this.instance.portalUrl,
        mode: this.mode,
        admin: this.admin,
      });
    },
  },
  watch: {
    // The form is open while values are missing. It never folds by itself, so
    // it does not close under the cursor when the last value is typed.
    "guide.complete": {
      immediate: true,
      handler(complete) {
        if (!complete) this.connectionPanel = 0;
      },
    },
  },
  created() {
    if (this.mode === "bff") this.loadBffAddresses();
  },
  // The view keeps the tab alive; the hint and the result of the check are
  // about this visit only.
  deactivated() {
    this.saved = false;
    this.dropCheck();
  },
  methods: {
    /**
     * Called by the view after a successful save. The result of the check is
     * about the values before, so it goes.
     */
    onSaved() {
      this.saved = true;
      this.dropCheck();
    },
    /** Forgets the result of the check; a check still on its way is dropped. */
    dropCheck() {
      this.result = null;
      this.checkFailure = null;
      this.checking = false;
      this.checkRun += 1;
    },
    /**
     * „Realm prüfen“: the backend checks the saved realm with the
     * Rücksprungadressen the Anleitung shows. An answer that arrives after
     * the tab was left is dropped.
     */
    async checkRealm() {
      if (this.checkLock || this.checking) return;
      const guide = this.guide;
      const run = this.checkRun;
      this.checking = true;
      this.checkFailure = null;
      try {
        const answer = await ApiInstanceService.checkKeycloakRealm(
          checkBody(guide)
        );
        if (run === this.checkRun) this.result = checkResult(guide, answer);
      } catch (error) {
        if (run === this.checkRun) this.checkFailure = checkErrorMessage(error);
      } finally {
        if (run === this.checkRun) this.checking = false;
      }
    },
    /**
     * An error, a timeout or a 401 the refresh does not cure all leave the
     * Anleitung with the own Adresse as placeholder and the hint that the list
     * may be incomplete.
     */
    async loadBffAddresses() {
      try {
        this.bffAddresses = await ApiAuthService.getSsoAddresses();
      } catch {
        this.bffFailed = true;
      }
    },
  },
};
</script>

<style scoped>
.sso-panels >>> .v-expansion-panel {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface) !important;
  overflow: hidden;
}

.sso-panels__header {
  min-height: var(--scb-row-height) !important;
  background: var(--scb-surface-tint-faint);
}

.sso-panels__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text);
}

.sso-panels__subtitle {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>
