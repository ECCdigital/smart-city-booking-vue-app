<template>
  <BaseSection :title="$t('instance.edit.sso.title')" icon="mdi-shield-lock">
    <InstanceEditKeycloak
      :instance="instance"
      :tenants="tenants"
      :available-roles="availableRoles"
      @update:instance="$emit('update:instance', $event)"
    />
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import InstanceEditKeycloak from "@/components/Instance/Edit/InstanceEditKeycloak.vue";

export default {
  name: "InstanceEditSingleSignOn",
  components: { BaseSection, InstanceEditKeycloak },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
  },
};
</script>
