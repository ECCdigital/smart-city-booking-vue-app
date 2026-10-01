<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86): the card authentication in its own
       tab „Karten“, unchanged otherwise. -->
  <BaseSection title="Karten" icon="mdi-card-account-details">
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
  name: "InstanceEditCardsPrototype",
  components: { BaseSection, CardAuthList },
  props: {
    instance: { type: Object, required: true },
  },
};
</script>
