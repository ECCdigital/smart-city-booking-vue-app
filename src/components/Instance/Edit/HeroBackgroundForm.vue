<template>
  <SubSection
    title="Hintergrund"
    icon="mdi-image-filter-hdr"
    description="Gilt auch für die Anmeldeseiten."
    class="hero-background-form"
  >
    <template #actions>
      <v-btn
        text
        small
        class="hero-background-form__reset"
        @click="resetToDefault"
      >
        Standardhintergrund
      </v-btn>
    </template>

    <div class="hero-background-form__families mb-4">
      <v-card
        v-for="option in families"
        :key="option.value"
        :data-family="option.value"
        :color="option.active ? 'primary' : undefined"
        :dark="option.active"
        :outlined="!option.active"
        :aria-pressed="String(option.active)"
        class="hero-background-form__family pa-2 text-center"
        @click="chooseFamily(option.value)"
      >
        <v-icon small :dark="option.active">{{ option.icon }}</v-icon>
        <div class="text-caption">{{ option.label }}</div>
      </v-card>
    </div>

    <template v-if="family === 'variant'">
      <v-select
        :value="background.variant"
        :items="variants"
        label="Muster"
        background-color="accent"
        filled
        dense
        @change="patch({ variant: $event })"
      />
      <v-switch
        :input-value="background.orbs"
        label="Leuchtkreise"
        color="primary"
        class="mt-0"
        dense
        hide-details
        @change="patch({ orbs: !!$event })"
      />
      <v-switch
        :input-value="background.noise"
        label="Körnung"
        color="primary"
        class="mt-2 mb-4"
        dense
        hide-details
        @change="patch({ noise: !!$event })"
      />
      <v-select
        :value="background.intensity"
        :items="intensities"
        label="Intensität"
        background-color="accent"
        filled
        dense
        @change="patch({ intensity: $event })"
      />
    </template>

    <template v-else-if="family === 'color'">
      <HeroHexField
        :value="background.light"
        label="Farbe"
        @input="patch({ light: $event })"
      />
      <HeroHexField
        :value="background.dark"
        label="Farbe im Dunkelmodus"
        optional
        hint="Leer lassen, um im Dunkelmodus dieselbe Farbe zu verwenden"
        @input="setDark"
      />
    </template>

    <template v-else>
      <MediaReferenceField
        :value="background.image"
        :scope="mediaScope"
        label="Bild"
        kind="image"
        public-only
        :public-only-reason="publicOnlyReason"
        :allow-external="false"
        empty-label="Kein Bild ausgewählt"
        @input="patch({ image: $event })"
      />
      <HeroFocalPointField
        v-if="background.image"
        :reference="background.image"
        :value="background.focalPoint"
        :scope="mediaScope"
        class="mt-3"
        @input="patch({ focalPoint: $event })"
      />

      <div class="text-caption text--secondary mt-4 mb-1">Abdunklung</div>
      <p class="text--secondary text-caption mb-2">
        Legt eine Fläche über das Bild, damit die Blöcke lesbar bleiben.
      </p>
      <HeroHexField
        :value="background.overlay.light.color"
        label="Farbe"
        @input="setOverlay('light', { color: $event })"
      />
      <v-slider
        :value="background.overlay.light.opacity"
        label="Abdunklung"
        min="0"
        max="100"
        step="1"
        thumb-label
        hide-details
        class="hero-background-form__opacity mb-4"
        @input="setOverlay('light', { opacity: $event })"
      >
        <template #append>
          <span class="text-caption text--secondary">
            {{ background.overlay.light.opacity }} %
          </span>
        </template>
      </v-slider>

      <v-switch
        :input-value="!!background.overlay.dark"
        label="Im Dunkelmodus eigene Werte"
        color="primary"
        class="mt-0"
        dense
        hide-details
        @change="toggleDarkOverlay($event)"
      />

      <template v-if="background.overlay.dark">
        <HeroHexField
          class="mt-4"
          :value="background.overlay.dark.color"
          label="Farbe im Dunkelmodus"
          @input="setOverlay('dark', { color: $event })"
        />
        <v-slider
          :value="background.overlay.dark.opacity"
          label="Abdunklung im Dunkelmodus"
          min="0"
          max="100"
          step="1"
          thumb-label
          hide-details
          class="hero-background-form__opacity"
          @input="setOverlay('dark', { opacity: $event })"
        >
          <template #append>
            <span class="text-caption text--secondary">
              {{ background.overlay.dark.opacity }} %
            </span>
          </template>
        </v-slider>
      </template>
    </template>

    <div v-if="messages.length > 0" class="hero-background-form__issues mt-2">
      <div
        v-for="message in messages"
        :key="message"
        class="error--text text-caption"
      >
        {{ message }}
      </div>
    </div>
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import HeroFocalPointField from "@/components/Instance/Edit/HeroFocalPointField.vue";
import HeroHexField from "@/components/Instance/Edit/HeroHexField.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  HERO_BACKGROUND_FAMILIES,
  HERO_BACKGROUND_INTENSITIES,
  HERO_BACKGROUND_VARIANTS,
  defaultHeroBackground,
  heroBackgroundFamily,
  heroBackgroundIssues,
  heroBackgroundOfFamily,
  normalizedHeroBackground,
} from "@/utils/heroBackground";

// The Background is painted on the public portal and on the auth pages, so it
// may only ever point at a public medium — the backend refuses anything else
// on save.
const PUBLIC_ONLY_REASON =
  "Der Hintergrund wird öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

/**
 * The „Hintergrund“ section at the foot of the Hero Editor's form: the three
 * family cards „Muster | Farbe | Bild“, the fields of the chosen family and
 * „Standardhintergrund“ (hero layout spec §8).
 *
 * The section owns no copy of the Background. It reads the one the editor
 * holds — through `normalizedHeroBackground`, so a stored object that predates
 * a default still fills its controls — and answers with the whole Background,
 * because switching family replaces the object rather than patching it.
 *
 * What it does own is the **memory of the other two families**: switching to
 * „Farbe“ and back to „Bild“ within this dialog session restores the image,
 * its focal point and its overlay, so that trying a family out costs nothing.
 * The memory lives as long as the dialog does, and no longer — a reopened
 * dialog starts from what is stored.
 *
 * The Background is instance-wide and never touches the „Standard-Layout“
 * chip, which is about the Catalog's layout: „Standardhintergrund“ is the
 * Background's own reset, independent of „Auf Standard zurücksetzen“ (§10).
 * The reset writes the default pattern and therefore replaces what „Muster“
 * remembered; it deliberately leaves the other two families' memory alone, so
 * an image tried out before the reset is one card click away rather than
 * gone.
 */
export default {
  name: "HeroBackgroundForm",
  components: {
    HeroFocalPointField,
    HeroHexField,
    MediaReferenceField,
    SubSection,
  },
  props: {
    /** The Background as the Draft holds it; `null` is the default one. */
    value: { type: Object, default: null },
    /**
     * What a backend `400` said about the Background, one line per detail.
     * The Background's controls are a family of small ones and a fault can
     * name any of them, so the messages stand at the section and name their
     * field rather than sitting under one control (hero layout spec §9).
     */
    errors: { type: Array, default: () => [] },
  },
  data() {
    return {
      // The last values of every family, this dialog session.
      remembered: {},
      variants: HERO_BACKGROUND_VARIANTS,
      intensities: HERO_BACKGROUND_INTENSITIES,
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
    };
  },
  computed: {
    /** The Background as the controls read it: complete, never null. */
    background() {
      return normalizedHeroBackground(this.value);
    },
    family() {
      return heroBackgroundFamily(this.value);
    },
    families() {
      return HERO_BACKGROUND_FAMILIES.map((option) => ({
        ...option,
        active: option.value === this.family,
      }));
    },
    /** Why the backend would refuse this Background (§9). */
    issues() {
      return heroBackgroundIssues(this.value);
    },
    /** What the section says: the local rules first, then the backend's. */
    messages() {
      return [...this.issues, ...this.errors];
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(next) {
        this.remembered = {
          ...this.remembered,
          [heroBackgroundFamily(next)]: normalizedHeroBackground(next),
        };
      },
    },
  },
  methods: {
    /**
     * Switches the family, restoring what it last held this session. A family
     * never seen before starts from its own defaults.
     */
    chooseFamily(family) {
      if (family === this.family) {
        return;
      }
      this.$emit(
        "input",
        this.remembered[family] || heroBackgroundOfFamily(family)
      );
    },
    /**
     * The Background's own reset. It writes the default pattern rather than
     * `null`: the two mean the same to the backend, and an explicit object is
     * what the form goes on editing.
     */
    resetToDefault() {
      this.$emit("input", defaultHeroBackground());
    },
    /**
     * An emptied „Farbe im Dunkelmodus“ drops the key, because an absent dark
     * colour means „follow the light one“ while an empty one means nothing at
     * all.
     */
    setDark(color) {
      if (color == null) {
        const next = { ...this.background };
        delete next.dark;

        this.$emit("input", next);
        return;
      }
      this.patch({ dark: color });
    },
    setOverlay(mode, fields) {
      const overlay = { ...this.background.overlay };
      overlay[mode] = { ...overlay[mode], ...fields };

      this.patch({ overlay });
    },
    /**
     * „Im Dunkelmodus eigene Werte“. Switching it on starts the dark overlay
     * from the light one, so the author changes what they see instead of
     * meeting black at 40 %.
     */
    toggleDarkOverlay(own) {
      const light = { ...this.background.overlay.light };

      this.patch({ overlay: own ? { light, dark: { ...light } } : { light } });
    },
    patch(fields) {
      this.$emit("input", { ...this.background, ...fields });
    },
  },
};
</script>

<style scoped>
/* Three cards of equal width, side by side down to the narrowest form. */
.hero-background-form__families {
  display: flex;
  gap: 8px;
}

.hero-background-form__family {
  flex: 1 1 0;
  cursor: pointer;
}

/* The slider's own label column keeps it aligned with the fields above it. */
.hero-background-form__opacity {
  margin-top: 8px;
}
</style>
