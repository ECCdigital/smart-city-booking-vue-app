<template>
  <BaseSection title="Portal Konfiguration" icon="mdi-web">
    <v-row>
      <v-col cols="12" md="6">
        <v-switch
          v-model="local.publicOffersEnabled"
          color="primary"
          label="Öffentliche Buchungsangebote anzeigen"
          hint="Wenn deaktiviert, sehen Besucher beim Aufruf der Portal-URL nur ihren persönlichen Bereich (Profil und Buchungen)."
          persistent-hint
          @change="emitUpdate"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="local.portalUrl"
          background-color="accent"
          filled
          dense
          label="Portal-URL"
          hint="Die URL zu Ihrem Portal"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-select
          v-model="localCatalog.visibility"
          :items="visibilityOptions"
          label="Sichtbarkeit"
          background-color="accent"
          filled
          dense
          @change="emitCatalog"
        ></v-select>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-select
          v-model="localCatalog.excludedTenantIds"
          :items="tenantsOptions"
          item-text="name"
          item-value="id"
          label="Vom Katalog ausschließen"
          multiple
          chips
          small-chips
          clearable
          background-color="accent"
          filled
          dense
          persistent-hint
          hint="Wählen Sie Mandanten, die im Katalog nicht angezeigt werden sollen."
          @change="emitCatalog"
        ></v-select>
      </v-col>
    </v-row>

    <SubSection
      class="mt-4"
      title="Theme"
      icon="mdi-palette"
      description="Passen Sie das Erscheinungsbild Ihres Portals an, indem Sie ein benutzerdefiniertes Theme aktivieren und die Primär- und Sekundärfarben festlegen."
      no-margin
    >
      <v-row>
        <v-col cols="12" md="6">
          <v-switch
            v-model="local.branding.active"
            color="primary"
            label="Benutzerdefiniertes Theme"
            class="mt-2"
            @change="emitUpdate"
          ></v-switch>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="local.branding.theme.colors.primary"
            label="Primärfarbe"
            background-color="accent"
            filled
            dense
            @input="emitUpdate"
          >
            <template v-slot:append>
              <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    :color="local.branding.theme.colors.primary"
                    :style="{
                      backgroundColor: local.branding.theme.colors.primary,
                    }"
                  >
                    <v-icon small>mdi-palette</v-icon>
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="local.branding.theme.colors.primary"
                  mode="hexa"
                  show-swatches
                  swatches-max-height="200px"
                  @input="emitUpdate"
                ></v-color-picker>
              </v-menu>
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="local.branding.theme.colors.secondary"
            label="Sekundärfarbe"
            background-color="accent"
            filled
            dense
            @input="emitUpdate"
          >
            <template v-slot:append>
              <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    :color="local.branding.theme.colors.secondary"
                    :style="{
                      backgroundColor: local.branding.theme.colors.secondary,
                    }"
                  >
                    <v-icon small>mdi-palette</v-icon>
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="local.branding.theme.colors.secondary"
                  mode="hexa"
                  show-swatches
                  swatches-max-height="200px"
                  @input="emitUpdate"
                ></v-color-picker>
              </v-menu>
            </template>
          </v-text-field>
        </v-col>
      </v-row>
    </SubSection>

    <SubSection
      class="mt-4"
      title="Logo & Favicon"
      icon="mdi-image-area"
      description="Wählen Sie Logo und Favicon aus der Mediathek der Instanz. Beide werden allen Besuchern des Portals ausgeliefert, daher sind nur öffentliche Medien wählbar."
      no-margin
    >
      <v-row>
        <v-col cols="12" md="6">
          <MediaReferenceField
            v-model="logo"
            :scope="mediaScope"
            label="Logo"
            public-only
            :public-only-reason="publicOnlyReason"
            empty-label="Kein Logo ausgewählt"
            hint="Wird im Kopfbereich des Portals angezeigt, idealerweise 200 × 50 Pixel."
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
            v-model="favicon"
            :scope="mediaScope"
            label="Favicon"
            public-only
            :public-only-reason="publicOnlyReason"
            empty-label="Kein Favicon ausgewählt"
            hint="Erscheint im Browser-Tab und sollte quadratisch sein, z. B. 32 × 32 oder 64 × 64 Pixel."
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

    <SubSection
      class="mt-8"
      title="Kopfbereich"
      icon="mdi-format-header-1"
      description="Passen Sie die Überschrift und Unterzeile im Kopfbereich Ihres Portals an, um Ihren Kunden eine ansprechende Einführung zu bieten. Die Überschrift sollte kurz und prägnant sein, während die Unterzeile zusätzliche Informationen oder einen Slogan enthalten kann, um das Interesse der Besucher zu wecken."
      no-margin
    >
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="localCatalog.hero.title"
            label="Überschrift im Kopfbereich"
            background-color="accent"
            placeholder="Marktplatz"
            filled
            dense
            @input="emitCatalog"
          />
        </v-col>
        <v-col ols="12" md="6">
          <v-text-field
            v-model="localCatalog.hero.subtitle"
            label="Unterzeile im Kopfbereich"
            background-color="accent"
            placeholder="Entdecken Sie unsere Angebote"
            filled
            dense
            @input="emitCatalog"
          />
        </v-col>
      </v-row>
    </SubSection>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import SubSection from "@/components/commons/SubSection.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import { BRANDING_IMAGES, defaultBranding } from "@/utils/instanceBranding";

// Logo and favicon are served to every visitor of the portal, so they may only
// ever point at public media — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Logo und Favicon werden öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

export default {
  name: "InstanceEditCatalog",
  components: {
    SubSection,
    MediaReferenceField,
    MediaReferenceImage,
    BaseSection,
  },
  props: {
    instance: { type: Object, required: true },
    catalog: { type: Object, required: true },
    tenants: { type: Array, required: false, default: () => [] },
  },
  data() {
    return {
      local: this.cloneInstance(this.instance),
      localCatalog: JSON.parse(JSON.stringify(this.catalog)),
      visibilityOptions: [
        { text: "Öffentlich", value: "public" },
        { text: "Privat", value: "private" },
      ],
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
    };
  },
  computed: {
    logo: {
      get() {
        return this.brandingImage("logo");
      },
      set(value) {
        this.setBrandingImage("logo", value);
      },
    },
    favicon: {
      get() {
        return this.brandingImage("favicon");
      },
      set(value) {
        this.setBrandingImage("favicon", value);
      },
    },
    tenantsOptions() {
      return this.tenants.map((t) => ({
        id: t.id,
        name: t.name || `Tenant #${t.id}`,
      }));
    },
  },
  watch: {
    instance: {
      handler(n) {
        const next = this.cloneInstance(n);
        if (JSON.stringify(next) !== JSON.stringify(this.local)) {
          this.local = next;
        }
      },
      deep: true,
    },
    catalog: {
      deep: true,
      handler(v) {
        if (JSON.stringify(v) !== JSON.stringify(this.localCatalog)) {
          this.localCatalog = JSON.parse(JSON.stringify(v));
        }
      },
    },
    localCatalog: {
      deep: true,
      handler(newVal) {
        if (JSON.stringify(newVal) !== JSON.stringify(this.catalog)) {
          this.emitCatalog();
        }
      },
    },
  },
  methods: {
    cloneInstance(instance) {
      const cloned = { ...instance };
      cloned.branding = {
        ...defaultBranding(),
        ...(instance.branding || {}),
      };
      cloned.branding.theme = {
        colors: { primary: "", secondary: "" },
        ...((instance.branding && instance.branding.theme) || {}),
      };
      cloned.branding.theme.colors = {
        primary: "",
        secondary: "",
        ...(((instance.branding && instance.branding.theme) || {}).colors ||
          {}),
      };
      return cloned;
    },
    /**
     * A branding image as the form reads it: the stored media reference or —
     * as long as the media import has not converted it — the legacy address,
     * which reads as an external reference (§4.9 of the media spec).
     */
    brandingImage(name) {
      const { reference, readField } = BRANDING_IMAGES[name];
      return (
        this.local.branding[reference] || this.local.branding[readField] || null
      );
    },
    /**
     * Writes the reference and drops the legacy address along with it. The
     * read field is derived from the reference on the way out (§4.9); an
     * address left behind would resurface the old image the moment the user
     * removes the reference again.
     */
    setBrandingImage(name, value) {
      const { reference, readField } = BRANDING_IMAGES[name];
      this.$set(this.local.branding, reference, value || null);
      this.$set(this.local.branding, readField, "");
      this.emitUpdate();
    },
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    emitCatalog() {
      this.$emit("update:catalog", this.localCatalog);
    },
    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>

<style scoped></style>
