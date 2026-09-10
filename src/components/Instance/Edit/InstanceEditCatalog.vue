<template>
  <BaseSection title="Portal Konfiguration" icon="mdi-web">
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          ref="nameField"
          v-model="localCatalog.name"
          background-color="accent"
          filled
          dense
          required
          label="Portalname"
          hint="Erscheint im Browser-Titel, im Kopfbereich und auf den Anmeldeseiten."
          persistent-hint
          :rules="[rules.required]"
          :error-messages="nameApiErrors"
          @input="onNameInput"
        />
      </v-col>
    </v-row>

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
          ref="portalUrlField"
          v-model="local.portalUrl"
          background-color="accent"
          filled
          dense
          label="Portal-URL"
          hint="Die URL zu Ihrem Portal"
          :rules="[rules.absoluteHttpUrl]"
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
      icon="mdi-page-layout-header"
      description="Gestalten Sie den Kopfbereich Ihres Portals mit Textblöcken, Bildern und einem Hintergrund, der auch auf den Anmeldeseiten erscheint."
      no-margin
    >
      <v-card outlined class="pa-4">
        <div class="d-flex align-center flex-wrap hero-entry-card">
          <div class="flex-grow-1">
            <div class="text-body-1 font-weight-medium">
              {{ heroStatusLine }}
            </div>
            <div v-if="hasUnsavedChanges" class="text-caption text--secondary">
              Bitte zuerst speichern.
            </div>
          </div>
          <v-btn
            color="primary"
            outlined
            :disabled="hasUnsavedChanges"
            @click="openHeroEditor"
          >
            <v-icon left small>mdi-pencil</v-icon>
            Kopfbereich bearbeiten
          </v-btn>
        </div>
      </v-card>
    </SubSection>

    <HeroEditorDialog
      v-model="heroEditorOpen"
      :theme-colors="themeColors"
      @closed="$emit('refetch')"
    />
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import SubSection from "@/components/commons/SubSection.vue";
import HeroEditorDialog from "@/components/Instance/Edit/HeroEditorDialog.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import { BRANDING_IMAGES, defaultBranding } from "@/utils/instanceBranding";

// Logo and favicon are served to every visitor of the portal, so they may only
// ever point at public media — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Logo und Favicon werden öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

const REQUIRED_MESSAGE = "Pflichtfeld";
const ABSOLUTE_URL_MESSAGE =
  "Bitte eine vollständige Adresse mit http:// oder https:// angeben.";

// The Background families of the Shared contract, as the status line names
// them. A missing Background is the default one, a `variant`.
const BACKGROUND_LABELS = Object.freeze({
  variant: "Muster",
  color: "Farbe",
  image: "Bild",
});

/**
 * Whether `value` is an absolute http(s) address. The Live Preview of the
 * Hero Editor needs the origin of the Portal-URL, which a bare host or a
 * relative path does not have.
 */
function isAbsoluteHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname
    );
  } catch {
    return false;
  }
}

export default {
  name: "InstanceEditCatalog",
  components: {
    SubSection,
    MediaReferenceField,
    MediaReferenceImage,
    BaseSection,
    HeroEditorDialog,
  },
  props: {
    instance: { type: Object, required: true },
    catalog: { type: Object, required: true },
    tenants: { type: Array, required: false, default: () => [] },
    // The Hero Editor loads what is stored; it stays closed while the tab
    // holds changes the editor would not see.
    hasUnsavedChanges: { type: Boolean, default: false },
  },
  data() {
    return {
      local: this.cloneInstance(this.instance),
      localCatalog: JSON.parse(JSON.stringify(this.catalog)),
      heroEditorOpen: false,
      nameApiErrors: [],
      rules: {
        required: (v) => !!(v && String(v).trim()) || REQUIRED_MESSAGE,
        absoluteHttpUrl: (v) =>
          !v || isAbsoluteHttpUrl(v) || ABSOLUTE_URL_MESSAGE,
      },
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
    /**
     * What the entry card says about the stored Hero: the default the
     * backend derives while no layout is stored, otherwise the stored layout's
     * size and the Background family. Both are read from the stored objects —
     * the tab never edits them, so props and store agree.
     */
    heroStatusLine() {
      const layout = this.catalog.heroLayout;
      if (!layout) {
        return "Standard-Layout";
      }
      const count = Array.isArray(layout.blocks) ? layout.blocks.length : 0;
      const blocks = count === 1 ? "1 Block" : `${count} Blöcke`;
      return `Angepasst · ${blocks} · Hintergrund: ${this.backgroundLabel}`;
    },
    /**
     * The saved branding colours, not the edited ones: the entry button is
     * disabled while the tab is dirty, so what the editor paints its colour
     * chips with is what the portal serves.
     */
    themeColors() {
      return this.instance.branding?.theme?.colors || null;
    },
    backgroundLabel() {
      const type = this.instance.branding?.background?.type;
      return BACKGROUND_LABELS[type] || BACKGROUND_LABELS.variant;
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
    onNameInput() {
      this.nameApiErrors = [];
      this.emitCatalog();
    },
    openHeroEditor() {
      this.heroEditorOpen = true;
    },
    /**
     * The backend's answer to the tab save, as `details[].field` JSON paths.
     * Only `name` belongs to this tab's fields; the rest stays with the toast.
     */
    showApiErrors(details) {
      this.nameApiErrors = (details || [])
        .filter((detail) => detail && detail.field === "name")
        .map((detail) =>
          detail.code === "required"
            ? REQUIRED_MESSAGE
            : detail.message || "Ungültiger Wert"
        );
    },
    /** The fields of this tab that carry rules. Refs, so not a computed. */
    validatedFields() {
      return [this.$refs.nameField, this.$refs.portalUrlField].filter(Boolean);
    },
    validate() {
      this.nameApiErrors = [];
      // Validate every field before reading the result, so each one shows its
      // own message rather than only the first.
      const results = this.validatedFields().map((field) =>
        field.validate(true)
      );
      return results.every(Boolean);
    },
    resetValidation() {
      this.nameApiErrors = [];
      this.validatedFields().forEach((field) => field.resetValidation());
    },
  },
};
</script>

<style scoped>
.hero-entry-card {
  gap: 12px;
}
</style>
