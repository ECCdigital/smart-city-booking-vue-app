<template>
  <SubSection
    class="mt-7"
    title="Kopfleiste"
    icon="mdi-page-layout-header"
    description="Die Leiste oben auf jeder Seite, mit Logo, Portalname und Navigation. Die Schrift darauf wird schwarz oder weiß, je nach Kontrast. Logo, Variante und Favicon kommen aus der Mediathek der Instanz und werden allen Besuchern ausgeliefert, daher sind nur öffentliche Medien wählbar."
    no-margin
  >
    <div
      class="portal-header-cards"
      role="radiogroup"
      aria-label="Farbe der Kopfleiste"
    >
      <div
        v-for="option in headerOptions"
        :key="option.value"
        class="portal-header-card"
        :class="{ 'portal-header-card--active': header === option.value }"
        role="radio"
        :data-header="option.value"
        :aria-checked="String(header === option.value)"
        tabindex="0"
        @click="setHeader(option.value)"
        @keydown.enter.prevent="setHeader(option.value)"
        @keydown.space.prevent="setHeader(option.value)"
      >
        <div class="d-flex align-center mb-2">
          <v-icon
            small
            class="mr-1"
            :color="header === option.value ? 'primary' : undefined"
          >
            {{
              header === option.value
                ? "mdi-radiobox-marked"
                : "mdi-radiobox-blank"
            }}
          </v-icon>
          <span class="text-body-2 font-weight-medium">{{ option.text }}</span>
          <span v-if="option.note" class="text-caption text--secondary ml-2">{{
            option.note
          }}</span>
        </div>
        <PortalHeaderBar
          v-for="mode in modes"
          :key="mode"
          :header="option.value"
          :theme-colors="branding.theme.colors"
          :mode="mode"
          :logo="logo"
          :logo-dark="branding.logoDark"
          class="mt-1"
        />
      </div>
    </div>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <MediaReferenceField
          :value="logo"
          :scope="mediaScope"
          label="App-Logo"
          public-only
          :public-only-reason="publicOnlyReason"
          empty-label="Kein Logo ausgewählt"
          hint="Kopfleiste, Anmeldeseiten und Standard-Kopfbereich, idealerweise 200 × 50 Pixel."
          @input="setImage('logo', $event)"
        />
      </v-col>
      <v-col cols="12" md="6">
        <MediaReferenceField
          :value="branding.logoDark"
          :scope="mediaScope"
          :label="variantLabel"
          public-only
          :public-only-reason="publicOnlyReason"
          :allow-external="false"
          empty-label="Keine Variante: Logo wird invertiert"
          :hint="variantHint"
          @input="setLogoDark"
        />
      </v-col>
    </v-row>
    <PortalAppLogoPair :logo="logo" :logo-dark="branding.logoDark" />

    <v-row class="mt-2">
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
import PortalAppLogoPair from "@/components/Instance/Edit/PortalAppLogoPair.vue";
import PortalHeaderBar from "@/components/Instance/Edit/PortalHeaderBar.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import { brandingImage, brandingImagePatch } from "@/utils/instanceBranding";

// Logo, its variant and favicon are served to every visitor of the portal, so they may only
// ever point at public media — the backend refuses anything else on save.
// The colours the header bar can take (`branding.header`), in this order.
const HEADER_OPTIONS = Object.freeze([
  { value: "neutral", text: "Neutral", note: "" },
  { value: "primary", text: "Primär", note: "(wie heute)" },
  { value: "secondary", text: "Sekundär", note: "" },
]);

// Anything but one of the three reads as primary, the look from before the
// setting, as the storefront's Theme-CSS reads it.
const DEFAULT_HEADER = "primary";

const VARIANT_LABEL = "Variante für den Dunkelmodus (optional)";
const VARIANT_HINT =
  "Für Logos, die invertiert falsche Farben bekommen, etwa Wappen. Passt das Logo ohne Änderung auf dunklen Grund, wählen Sie dasselbe Bild.";

const PUBLIC_ONLY_REASON =
  "Logo, Variante und Favicon werden öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

/**
 * The section „Kopfleiste“ of the Portal tab (map #510): the colour of the
 * header bar as three cards, each previewing a small bar in light and dark;
 * the App-Logo with its optional variant for dark mode, previewed as a pair of
 * tiles; and the Favicon. It changes the branding only through `patch` events
 * with the top-level fields it changes.
 */
export default {
  name: "PortalHeader",
  components: {
    SubSection,
    MediaReferenceField,
    MediaReferenceImage,
    PortalAppLogoPair,
    PortalHeaderBar,
  },
  props: {
    branding: { type: Object, required: true },
  },
  data() {
    return {
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
      headerOptions: HEADER_OPTIONS,
      modes: ["light", "dark"],
      variantLabel: VARIANT_LABEL,
      variantHint: VARIANT_HINT,
    };
  },
  computed: {
    header() {
      const value = this.branding.header;
      return HEADER_OPTIONS.some((option) => option.value === value)
        ? value
        : DEFAULT_HEADER;
    },
    logo() {
      return brandingImage(this.branding, "logo");
    },
    favicon() {
      return brandingImage(this.branding, "favicon");
    },
  },
  methods: {
    setHeader(value) {
      if (value !== this.branding.header) {
        this.$emit("patch", { header: value });
      }
    },
    setLogoDark(value) {
      this.$emit("patch", { logoDark: value || null });
    },
    setImage(name, value) {
      this.$emit("patch", brandingImagePatch(name, value));
    },
  },
};
</script>

<style scoped>
.portal-header-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--scb-space-3);
}

.portal-header-card {
  padding: var(--scb-space-3);
  border-radius: var(--scb-radius-surface);
  border: 1px solid var(--scb-surface-border);
  cursor: pointer;
}

.portal-header-card--active {
  border-color: var(--v-primary-base);
  box-shadow: inset 0 0 0 1px var(--v-primary-base);
}
</style>
