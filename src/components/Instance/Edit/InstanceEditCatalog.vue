<template>
  <BaseSection title="Katalog Konfiguration" icon="mdi-book-open-page-variant">
    <v-row>
      <v-col cols="12" md="2">
        <v-switch
          v-model="local.enableCatalog"
          color="primary"
          hide-details
          label="Katalog aktivieren"
          @change="emitUpdate"
        />
      </v-col>
      <v-col cols="12" md="4">
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
        <v-text-field
          v-model="local.catalogUrl"
          background-color="accent"
          filled
          dense
          label="Katalog-URL"
          hint="Die URL zu Ihrem Katalog"
          @input="emitUpdate"
        />
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

    <v-row>
      <v-col cols="12">
        <h4>Theme</h4>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-switch
          v-model="localCatalog.theme.active"
          color="primary"
          label="Benutzerdefiniertes Theme"
          class="mt-2"
        ></v-switch>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="localCatalog.theme.colors.primary"
          label="Primärfarbe"
          background-color="accent"
          filled
          dense
          @input="emitCatalog"
        >
          <template v-slot:append>
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  small
                  v-bind="attrs"
                  v-on="on"
                  :color="localCatalog.theme.colors.primary"
                  :style="{
                    backgroundColor: localCatalog.theme.colors.primary,
                  }"
                >
                  <v-icon small>mdi-palette</v-icon>
                </v-btn>
              </template>
              <v-color-picker
                v-model="localCatalog.theme.colors.primary"
                mode="hexa"
                show-swatches
                swatches-max-height="200px"
              ></v-color-picker>
            </v-menu>
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="localCatalog.theme.colors.secondary"
          label="Sekundärfarbe"
          background-color="accent"
          filled
          dense
          @input="emitCatalog"
        >
          <template v-slot:append>
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  small
                  v-bind="attrs"
                  v-on="on"
                  :color="localCatalog.theme.colors.secondary"
                  :style="{
                    backgroundColor: localCatalog.theme.colors.secondary,
                  }"
                >
                  <v-icon small>mdi-palette</v-icon>
                </v-btn>
              </template>
              <v-color-picker
                v-model="localCatalog.theme.colors.secondary"
                mode="hexa"
                show-swatches
                swatches-max-height="200px"
              ></v-color-picker>
            </v-menu>
          </template>
        </v-text-field>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "InstanceEditCatalog",
  components: { BaseSection },
  props: {
    instance: { type: Object, required: true },
    catalog: { type: Object, required: true },
    tenants: { type: Array, required: false, default: () => [] },
  },
  data() {
    return {
      local: { ...this.instance },
      localCatalog: JSON.parse(JSON.stringify(this.catalog)),
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
  },
  watch: {
    instance: {
      handler(n) {
        this.local = { ...n };
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
