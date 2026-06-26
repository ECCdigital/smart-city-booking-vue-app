<template>
  <BaseSection title="Authentifizierung" icon="mdi-shield-lock">
    <InstanceEditKeycloak
      :instance="instance"
      :tenants="tenants"
      :available-roles="availableRoles"
      @update:instance="$emit('update:instance', $event)"
    />

    <v-divider class="my-8" />

    <SubSection
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

let cardIdCounter = 0;

export default {
  name: "InstanceEditAuth",
  components: {
    CardAuthList,
    SubSection,
    BaseSection,
    InstanceEditKeycloak,
  },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
  },
  computed: {
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
