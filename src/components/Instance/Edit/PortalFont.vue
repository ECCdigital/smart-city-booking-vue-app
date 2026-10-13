<template>
  <SubSection
    class="mt-7"
    title="Schrift"
    icon="mdi-format-font"
    description="Die Schrift des Portals auf allen Seiten."
    no-margin
  />
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";

/**
 * The section „Schrift“ of the Portal tab. Its fields follow with their own
 * ticket of map #510; like every section it gets the branding and changes it
 * only through `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalFont",
  components: { SubSection },
  props: {
    branding: { type: Object, required: true },
  },
};
</script>
