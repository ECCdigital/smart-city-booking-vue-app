<template>
  <BaseSection :title="$t('instance.edit.sso.title')" icon="mdi-shield-lock">
    <SsoStatusCard :guide="guide" :saved="saved" />

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

    <RealmGuideChecklist :guide="guide" />
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import InstanceEditKeycloak from "@/components/Instance/Edit/InstanceEditKeycloak.vue";
import RealmGuideChecklist from "@/components/Instance/Edit/RealmGuideChecklist.vue";
import SsoStatusCard from "@/components/Instance/Edit/SsoStatusCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";
import { getAuthMode } from "@/services/auth/authMode";
import { directRedirects } from "@/services/auth/directRedirects";
import { buildRealmGuide } from "@/services/keycloak/realmGuide";

export default {
  name: "InstanceEditSingleSignOn",
  components: {
    BaseSection,
    InstanceEditKeycloak,
    RealmGuideChecklist,
    SsoStatusCard,
  },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
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
  // The view keeps the tab alive; the hint is about this visit only.
  deactivated() {
    this.saved = false;
  },
  methods: {
    /** Called by the view after a successful save. */
    onSaved() {
      this.saved = true;
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
