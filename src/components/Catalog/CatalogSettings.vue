<template>
  <div>
    <v-row>
      <v-col cols="6" md="3">
        <v-switch
          v-model="isActive"
          color="primary"
          label="Katalog aktivieren"
          class="mt-2"
        ></v-switch>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="6" md="3">
        <v-select
          v-model="catalogVisibility"
          :items="visibilityOptions"
          label="Sichtbarkeit"
          background-color="accent"
          filled
          dense
        ></v-select>
      </v-col>
      <v-col cols="6" md="3">
        <v-text-field
          v-model="catalogSlug"
          label="Katalog-URL"
          background-color="accent"
          filled
          dense
          required
          :rules="isActive? slugRules : []"
          hint="3-50 Zeichen, Kleinbuchstaben"
          prefix="example.com/catalog/"
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
      <v-col cols="6" md="3">
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
      <v-col cols="6" md="3" v-if="catalogType === 'aggregate'">
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

    <v-row>
      <v-col cols="12">
        <h4>Theme</h4>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="6" md="3">
        <v-switch
          v-model="useCustomTheme"
          color="primary"
          label="Benutzerdefiniertes Theme"
          class="mt-2"
        ></v-switch>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="6" md="3">
        <v-text-field
          v-model="primaryColor"
          label="Primärfarbe"
          background-color="accent"
          filled
          dense
        >
          <template v-slot:append>
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  small
                  v-bind="attrs"
                  v-on="on"
                  :color="primaryColor"
                  :style="{ backgroundColor: primaryColor }"
                >
                  <v-icon small>mdi-palette</v-icon>
                </v-btn>
              </template>
              <v-color-picker
                v-model="primaryColor"
                mode="hexa"
                show-swatches
                swatches-max-height="200px"
              ></v-color-picker>
            </v-menu>
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="6" md="3">
        <v-text-field
          v-model="secondaryColor"
          label="Sekundärfarbe"
          background-color="accent"
          filled
          dense
        >
          <template v-slot:append>
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  small
                  v-bind="attrs"
                  v-on="on"
                  :color="secondaryColor"
                  :style="{ backgroundColor: secondaryColor }"
                >
                  <v-icon small>mdi-palette</v-icon>
                </v-btn>
              </template>
              <v-color-picker
                v-model="secondaryColor"
                mode="hexa"
                show-swatches
                swatches-max-height="200px"
              ></v-color-picker>
            </v-menu>
          </template>
        </v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import ApiCatalogService from "@/services/api/ApiCatalogService";

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
    catalogType: {
      get() {
        return this.catalog.type || "single";
      },
      set(value) {
        this.$emit("update:catalog", { ...this.catalog, type: value });
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

    useCustomTheme: {
      get() {
        return this.catalog.theme?.active || false;
      },
      set(value) {
        const updatedCatalog = { ...this.catalog };
        if (!updatedCatalog.theme) updatedCatalog.theme = {};
        updatedCatalog.theme.active = value;
        this.$emit("update:catalog", updatedCatalog);
      },
    },

    primaryColor: {
      get() {
        return this.catalog.theme?.colors?.primary || "";
      },
      set(value) {
        const updatedCatalog = { ...this.catalog };
        if (!updatedCatalog.theme) updatedCatalog.theme = {};
        if (!updatedCatalog.theme.colors) updatedCatalog.theme.colors = {};
        updatedCatalog.theme.colors.primary = value;
        this.$emit("update:catalog", updatedCatalog);
      },
    },

    secondaryColor: {
      get() {
        return this.catalog.theme?.colors?.secondary || "";
      },
      set(value) {
        const updatedCatalog = { ...this.catalog };
        if (!updatedCatalog.theme) updatedCatalog.theme = {};
        if (!updatedCatalog.theme.colors) updatedCatalog.theme.colors = {};
        updatedCatalog.theme.colors.secondary = value;
        this.$emit("update:catalog", updatedCatalog);
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

<style scoped></style>
