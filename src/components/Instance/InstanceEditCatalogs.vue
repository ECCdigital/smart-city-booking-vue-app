<script>
import CatalogSettings from "@/components/Catalog/CatalogSettings.vue";
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditCatalogs",
  components: { BaseSection, CatalogSettings },
  props: {
    catalog: { type: Object, required: true },
  },
  data() {
    return {
      localCatalog: JSON.parse(JSON.stringify(this.catalog)),
    };
  },
  watch: {
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
    emitCatalog() {
      this.$emit("update:catalog", this.localCatalog);
    },
  },
  mounted() {
    this.localCatalog = JSON.parse(JSON.stringify(this.catalog));
  },
};
</script>

<template>
  <BaseSection title="Katalog Konfiguration" icon="mdi-book-open-page-variant">
    <CatalogSettings :catalog.sync="localCatalog" :allow-type-change="false" />
  </BaseSection>
</template>

<style scoped></style>
