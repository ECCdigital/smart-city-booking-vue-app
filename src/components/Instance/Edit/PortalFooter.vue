<template>
  <SubSection
    class="mt-7"
    title="Fußbereich"
    icon="mdi-page-layout-footer"
    description="Logos in einer eigenen Zeile über dem Copyright, etwa Förderlogos."
    no-margin
  />
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";

/**
 * The section „Fußbereich“ of the Portal tab. Its fields follow with their own
 * ticket of map #510; like every section it gets the branding and changes it
 * only through `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalFooter",
  components: { SubSection },
  props: {
    branding: { type: Object, required: true },
  },
};
</script>
