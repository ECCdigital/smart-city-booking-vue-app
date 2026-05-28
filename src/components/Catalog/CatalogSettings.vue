<template>
  <div>
    <v-alert
      v-if="!instance.publicOffersEnabled"
      type="warning"
      border="left"
      colored-border
      elevation="2"
      dense
      class="mb-6"
    >
      <div>
        <div>
          In dieser Instanz sind öffentliche Buchungsangebote derzeit
          deaktiviert. Besucher sehen beim Aufruf der Portal-URL nur ihren
          persönlichen Bereich (Profil und Buchungen).
        </div>
        <div class="mt-4">
          Wenn Sie Kataloge für Ihre Anwendung benötigen, wenden Sie sich bitte
          an den zuständigen <strong>Instanz-Administrator</strong>. Dieser kann
          die erforderlichen Einstellungen vornehmen oder Ihnen weitere
          Informationen zum Vorgehen geben.
        </div>
      </div>
    </v-alert>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-switch
          v-model="isActive"
          color="primary"
          label="Katalog aktivieren"
          class="mt-2"
        ></v-switch>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="catalogVisibility"
          :items="visibilityOptions"
          label="Sichtbarkeit"
          background-color="accent"
          filled
          dense
        ></v-select>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="catalogTitle"
          label="Katalog-Titel"
          background-color="accent"
          filled
          dense
          required
          :rules="isActive ? titleRules : []"
          counter="100"
          persistent-hint
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="catalogSlug"
          label="Katalog-URL"
          background-color="accent"
          filled
          dense
          required
          :rules="isActive ? slugRules : []"
          hint="3-50 Zeichen, Kleinbuchstaben"
          :prefix="(instance.portalUrl || '') + '/catalog/'"
          persistent-hint
          :loading="slugChecking"
          :error="slugAvailable === false"
          :error-messages="
            slugAvailable === false ? 'Dieser Slug ist bereits vergeben' : ''
          "
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row v-if="allowTypeChange">
      <v-col cols="12" md="6">
        <v-select
          v-model="catalogType"
          :items="typeOptions"
          :readonly="!allowTypeChange"
          label="Katalog-Typ"
          background-color="accent"
          filled
          dense
          required
        ></v-select>
      </v-col>
      <v-col cols="12" md="6" v-if="catalogType === 'aggregate'">
        <v-combobox
          v-model="tenantIds"
          label="Tenant IDs"
          background-color="accent"
          :readonly="!allowTypeChange"
          filled
          dense
          multiple
          chips
          small-chips
          deletable-chips
          required
        ></v-combobox>
      </v-col>
    </v-row>

    <v-alert
      type="info"
      border="left"
      colored-border
      elevation="1"
      dense
      class="mt-6"
    >
      Theme und Logo werden zentral in den Instanz-Einstellungen unter "Portal"
      konfiguriert und gelten für alle Kataloge dieser Instanz.
    </v-alert>
  </div>
</template>

<script>
import ApiCatalogService from "@/services/api/ApiCatalogService";
import { mapGetters } from "vuex";

export default {
  name: "CatalogSettings",

  props: {
    catalog: {
      type: Object,
      required: true,
    },
    allowTypeChange: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      typeOptions: [
        { text: "Einzeln", value: "single" },
        { text: "Aggregiert", value: "aggregate" },
      ],
      visibilityOptions: [
        { text: "Öffentlich", value: "public" },
        { text: "Privat", value: "private" },
        { text: "Nicht gelistet", value: "unlisted" },
      ],
      slugRules: [
        (v) => !!v || "Slug ist erforderlich",
        (v) => v.length >= 3 || "Slug muss mindestens 3 Zeichen lang sein",
        (v) => v.length <= 50 || "Slug darf maximal 50 Zeichen lang sein",
        (v) =>
          /^[a-z0-9-]+$/.test(v) ||
          "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten",
        this.validateSlugAvailability,
      ],
      titleRules: [
        (v) => !!v || "Titel ist erforderlich",
        (v) => v.length <= 100 || "Titel darf maximal 100 Zeichen lang sein",
      ],
      slugAvailable: null,
      slugChecking: false,
      slugCheckTimeout: null,
      tmpSlug: this.catalog.slug || "",
    };
  },

  methods: {
    async checkSlugAvailability(slug) {
      if (!slug || slug.length < 3) {
        this.slugAvailable = null;
        return;
      }

      if (this.tmpSlug === slug) {
        this.slugAvailable = true;
        return;
      }

      this.slugChecking = true;
      try {
        const response = await ApiCatalogService.slugAvailability(slug);
        this.slugAvailable = response.data.available;
      } catch (error) {
        this.slugAvailable = null;
      } finally {
        this.slugChecking = false;
      }
    },

    validateSlugAvailability(v) {
      if (!v || v.length < 3) return true;

      if (this.slugChecking) return "Überprüfe Verfügbarkeit...";
      if (this.slugAvailable === false)
        return "Dieser Slug ist bereits vergeben";
      if (this.slugAvailable === null) return true;

      return true;
    },
  },

  computed: {
    ...mapGetters({
      instance: "instance/instance",
    }),
    catalogType: {
      get() {
        return this.catalog.type || "single";
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, type: value });
      },
    },

    catalogTitle: {
      get() {
        return this.catalog.name || "";
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, name: value });
      },
    },

    catalogSlug: {
      get() {
        return this.catalog.slug || "";
      },
      set(value) {
        if (this.slugCheckTimeout) {
          clearTimeout(this.slugCheckTimeout);
        }

        this.slugCheckTimeout = setTimeout(() => {
          this.checkSlugAvailability(value);
        }, 500);

        this.slugAvailable = null;

        this.$emit("update:catalog", { ...this.catalog, slug: value });
      },
    },

    tenantId: {
      get() {
        return this.catalog.tenantId || "";
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, tenantId: value });
      },
    },

    tenantIds: {
      get() {
        return this.catalog.tenantIds || [];
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, tenantIds: value });
      },
    },

    isActive: {
      get() {
        return this.catalog.active || false;
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, active: value });
      },
    },

    catalogVisibility: {
      get() {
        return this.catalog.visibility || "public";
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, visibility: value });
      },
    },
  },

  watch: {
    catalog: {
      handler(newVal) {
        if (!this.tmpSlug) {
          this.tmpSlug = newVal.slug;
        }
      },
      deep: true,
    },
  },
};
</script>

<style scoped>

.catalog-settings {
  max-width: 1000px;
  margin: 0 auto;
}

/* Flacher Look für Inputs (outlined, ohne Schatten, etwas Radius) */
::v-deep .flat-input .v-input__control {
  box-shadow: none !important;
}

::v-deep .flat-input.v-text-field--outlined .v-input__slot,
::v-deep .flat-input.v-select--outlined .v-input__slot {
  border-radius: 8px;
}

/* Headline-Style */
.section-title {
  font-weight: 600;
  font-size: 1.1rem;
}

</style>
