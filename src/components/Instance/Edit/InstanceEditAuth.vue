<template>
  <BaseSection
    :title="prototype86 ? 'Single Sign-On' : 'Authentifizierung'"
    icon="mdi-shield-lock"
  >
    <!-- PROTOTYPE (ECCdigital/tickets#86): Keycloak guide and live check,
         variants switchable via ?variant=A|B|C (B chosen); the card
         authentication moved to its own tab „Karten“. Never in production
         builds. -->
    <template v-if="prototype86">
      <component
        :is="'KeycloakGuide' + protoVariant"
        :instance="instance"
        :tenants="tenants"
        :available-roles="availableRoles"
        :has-unsaved-changes="hasUnsavedChanges"
        @update:instance="$emit('update:instance', $event)"
      />
      <PrototypeSwitcher
        :variants="['B', 'A', 'C']"
        :names="{ A: 'Abschnitte', B: 'Checkliste', C: 'Assistent' }"
      />
      <ScenarioPanel />
    </template>
    <InstanceEditKeycloak
      v-else
      :instance="instance"
      :tenants="tenants"
      :available-roles="availableRoles"
      @update:instance="$emit('update:instance', $event)"
    />

    <v-divider v-if="!prototype86" class="my-8" />

    <SubSection
      v-if="!prototype86"
      title="Karten-Authentifizierung"
      icon="mdi-card-account-details"
    >
      <CardAuthList
        :applications="instance.applications || []"
        @update:applications="
          $emit('update:instance', { applications: $event })
        "
      />
    </SubSection>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import InstanceEditKeycloak from "@/components/Instance/Edit/InstanceEditKeycloak.vue";
import SubSection from "@/components/commons/SubSection.vue";
import CardAuthList from "@/components/Instance/Edit/CardAuthList.vue";
import PrototypeSwitcher from "@/components/commons/PrototypeSwitcher.vue";
import ScenarioPanel from "@/components/Instance/Edit/prototype-86/ScenarioPanel.vue";
import KeycloakGuideA from "@/components/Instance/Edit/prototype-86/KeycloakGuideA.vue";
import KeycloakGuideB from "@/components/Instance/Edit/prototype-86/KeycloakGuideB.vue";
import KeycloakGuideC from "@/components/Instance/Edit/prototype-86/KeycloakGuideC.vue";

let cardIdCounter = 0;

export default {
  name: "InstanceEditAuth",
  components: {
    CardAuthList,
    SubSection,
    BaseSection,
    InstanceEditKeycloak,
    PrototypeSwitcher,
    ScenarioPanel,
    KeycloakGuideA,
    KeycloakGuideB,
    KeycloakGuideC,
  },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
    hasUnsavedChanges: { type: Boolean, default: false },
  },
  computed: {
    // PROTOTYPE (ECCdigital/tickets#86)
    prototype86() {
      return process.env.NODE_ENV !== "production";
    },
    protoVariant() {
      const variant = this.$route.query.variant;
      return ["A", "B", "C"].includes(variant) ? variant : "B";
    },
    cardApps() {
      return (this.instance.applications || []).filter(
        (a) => a.type === "card-auth"
      );
    },
  },
  methods: {
    addCardApp() {
      const id = `card-auth-${Date.now()}-${++cardIdCounter}`;
      const newApp = {
        id,
        type: "card-auth",
        label: "",
        description: "",
        enabled: false,
        serviceUrl: "",
        apiToken: "",
        cardType: "",
        publicIdField: {
          label: "",
          placeholder: "",
          helpText: "",
        },
        secretField: {
          label: "",
          placeholder: "",
          helpText: "",
        },
      };

      const apps = [...(this.instance.applications || []), newApp];
      this.$emit("update:instance", { applications: apps });
    },

    onCardAppUpdate(idx, updatedApp) {
      const apps = [...(this.instance.applications || [])];
      // Find the actual index in the full applications array
      let cardCount = -1;
      for (let i = 0; i < apps.length; i++) {
        if (apps[i].type === "card-auth") {
          cardCount++;
          if (cardCount === idx) {
            apps.splice(i, 1, { ...updatedApp });
            break;
          }
        }
      }
      this.$emit("update:instance", { applications: apps });
    },

    onCardAppRemove(idx) {
      const apps = [...(this.instance.applications || [])];
      let cardCount = -1;
      for (let i = 0; i < apps.length; i++) {
        if (apps[i].type === "card-auth") {
          cardCount++;
          if (cardCount === idx) {
            apps.splice(i, 1);
            break;
          }
        }
      }
      this.$emit("update:instance", { applications: apps });
    },

    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>
