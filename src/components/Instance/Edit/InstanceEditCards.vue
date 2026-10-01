<template>
  <BaseSection
    :title="$t('instance.edit.cards.title')"
    icon="mdi-card-account-details"
  >
    <CardAuthList
      :applications="instance.applications || []"
      @update:applications="$emit('update:instance', { applications: $event })"
    />
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import CardAuthList from "@/components/Instance/Edit/CardAuthList.vue";

export default {
  name: "InstanceEditCards",
  components: { BaseSection, CardAuthList },
  props: {
    instance: { type: Object, required: true },
  },
};
</script>
