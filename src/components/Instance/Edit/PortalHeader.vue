<template>
  <SubSection
    class="mt-7"
    title="Kopfleiste"
    icon="mdi-page-layout-header"
    description="Die Leiste oben auf jeder Seite, mit Logo, Portalname und Navigation. Logo und Favicon kommen aus der Mediathek der Instanz und werden allen Besuchern ausgeliefert, daher sind nur öffentliche Medien wählbar."
    no-margin
  >
    <v-row>
      <v-col cols="12" md="6">
        <MediaReferenceField
          :value="logo"
          :scope="mediaScope"
          label="App-Logo"
          public-only
          :public-only-reason="publicOnlyReason"
          empty-label="Kein Logo ausgewählt"
          hint="Wird im Kopfbereich des Portals angezeigt, idealerweise 200 × 50 Pixel."
          @input="setImage('logo', $event)"
        />
        <MediaReferenceImage
          v-if="logo"
          :reference="logo"
          :scope="mediaScope"
          size="sm"
          lazy-size="thumb"
          :height="72"
          contain
          rounded
          class="mt-2"
        />
      </v-col>
      <v-col cols="12" md="6">
        <MediaReferenceField
          :value="favicon"
          :scope="mediaScope"
          label="Favicon"
          public-only
          :public-only-reason="publicOnlyReason"
          empty-label="Kein Favicon ausgewählt"
          hint="Erscheint im Browser-Tab und sollte quadratisch sein, z. B. 32 × 32 oder 64 × 64 Pixel."
          @input="setImage('favicon', $event)"
        />
        <MediaReferenceImage
          v-if="favicon"
          :reference="favicon"
          :scope="mediaScope"
          size="thumb"
          :lazy-size="null"
          :height="72"
          contain
          rounded
          class="mt-2"
        />
      </v-col>
    </v-row>
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import { brandingImage, brandingImagePatch } from "@/utils/instanceBranding";

// Logo and favicon are served to every visitor of the portal, so they may only
// ever point at public media — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Logo und Favicon werden öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

/**
 * The section „Kopfleiste“ of the Portal tab: App-Logo and Favicon. It changes
 * the branding only through `patch` events with the top-level fields it
 * changes.
 */
export default {
  name: "PortalHeader",
  components: { SubSection, MediaReferenceField, MediaReferenceImage },
  props: {
    branding: { type: Object, required: true },
  },
  data() {
    return {
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
    };
  },
  computed: {
    logo() {
      return brandingImage(this.branding, "logo");
    },
    favicon() {
      return brandingImage(this.branding, "favicon");
    },
  },
  methods: {
    setImage(name, value) {
      this.$emit("patch", brandingImagePatch(name, value));
    },
  },
};
</script>
