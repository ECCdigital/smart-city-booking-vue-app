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
        <v-switch
          v-model="local.publicOffersEnabled"
          color="primary"
          label="Öffentliche Buchungsangebote anzeigen"
          hint="Wenn deaktiviert, sehen Besucher beim Aufruf der Portal-URL nur ihren persönlichen Bereich (Profil und Buchungen)."
          persistent-hint
          @change="emitUpdate"
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

    <!-- The appearance by area of the page (map #510). Each section is its own
         component: it reads the branding and sends the fields it changes as a
         `patch`. A section with rules has `validate` and `resetValidation`;
         the tab calls them through its ref, listed in SECTION_REFS. -->
    <PortalColors
      ref="colors"
      :branding="local.branding"
      @patch="patchBranding"
    />
    <PortalHeader
      ref="header"
      :branding="local.branding"
      @patch="patchBranding"
    />
    <PortalFont ref="font" :branding="local.branding" @patch="patchBranding" />
    <PortalAuthPages
      ref="authPages"
      :branding="local.branding"
      @patch="patchBranding"
    />
    <PortalFooter
      ref="footer"
      :branding="local.branding"
      @patch="patchBranding"
    />

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
      :portal-url="instance.portalUrl || ''"
      :theme-colors="themeColors"
      @closed="$emit('refetch')"
    />
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import SubSection from "@/components/commons/SubSection.vue";
import HeroEditorDialog from "@/components/Instance/Edit/HeroEditorDialog.vue";
import PortalColors from "@/components/Instance/Edit/PortalColors.vue";
import PortalHeader from "@/components/Instance/Edit/PortalHeader.vue";
import PortalFont from "@/components/Instance/Edit/PortalFont.vue";
import PortalAuthPages from "@/components/Instance/Edit/PortalAuthPages.vue";
import PortalFooter from "@/components/Instance/Edit/PortalFooter.vue";
import { defaultBranding } from "@/utils/instanceBranding";

// The refs of the sections of the appearance, in the order of the page.
const SECTION_REFS = Object.freeze([
  "colors",
  "header",
  "font",
  "authPages",
  "footer",
]);

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
    BaseSection,
    HeroEditorDialog,
    PortalColors,
    PortalHeader,
    PortalFont,
    PortalAuthPages,
    PortalFooter,
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
    };
  },
  computed: {
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
      const defaults = defaultBranding();
      const branding = instance.branding || {};
      const theme = branding.theme || {};
      return {
        ...instance,
        branding: {
          ...defaults,
          ...branding,
          theme: {
            ...defaults.theme,
            ...theme,
            colors: { ...defaults.theme.colors, ...(theme.colors || {}) },
          },
        },
      };
    },
    /** Takes the top-level fields of the branding a section changed. */
    patchBranding(changes) {
      this.local.branding = { ...this.local.branding, ...changes };
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
    /**
     * The fields of this tab that carry rules, and the sections that check
     * their own. Refs, so not a computed.
     */
    validatedFields() {
      const sections = SECTION_REFS.map((name) => this.$refs[name]).filter(
        (section) => section && typeof section.validate === "function"
      );
      return [
        this.$refs.nameField,
        this.$refs.portalUrlField,
        ...sections,
      ].filter(Boolean);
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
