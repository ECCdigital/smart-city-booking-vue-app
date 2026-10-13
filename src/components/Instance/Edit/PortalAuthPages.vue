<template>
  <SubSection
    class="mt-7"
    title="Anmeldeseiten"
    icon="mdi-login"
    description="Login, Registrieren, Passwort vergessen und E-Mail bestätigen. Logo und Portalname stehen oben in der Karte."
    no-margin
  />
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";

/**
 * The section „Anmeldeseiten“ of the Portal tab. Its fields follow with their own
 * ticket of map #510; like every section it gets the branding and changes it
 * only through `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalAuthPages",
  components: { SubSection },
  props: {
    branding: { type: Object, required: true },
  },
};
</script>
