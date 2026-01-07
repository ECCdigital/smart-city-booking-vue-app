<script>
import BaseSection from "@/components/commons/BaseSection.vue";

const DEFAULT_CATALOG_PARTICIPATION = {
  visible: false,
  restricted: false,
};

export default {
  name: "TenantEditCatalog",
  components: { BaseSection },
  props: {
    tenant: { type: Object, required: true },
  },
  data() {
    return {
      valid: false,
      localTenant: { },
    };
  },
  watch: {
    tenant: {
      deep: true,
      handler(v) {
        this.localTenant = { ...v };
        this.ensureCatalogParticipation();
      },
    },
  },
  methods: {
    ensureCatalogParticipation() {
      if (!this.localTenant.catalogParticipation) {
        this.$set(
          this.localTenant,
          "catalogParticipation",
          DEFAULT_CATALOG_PARTICIPATION
        );
      }
    },
    emitTenant() {
      this.$emit("update:tenant", this.localTenant);
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
  },
};
</script>

<template>
  <BaseSection title="Katalog Konfiguration" icon="mdi-book-open-page-variant" hint="Dieser Service kann im instanzweiten Katalog angezeigt werden. Der Katalog ist öffentlich zugänglich         — zusätzlich können Sie die Anzeige auf registrierte Nutzer einschränken.">

    <v-alert type="info" dense border="left" elevation="1" colored-border max-width="750px">
      Der Katalog ist instanzweit. Sichtbarkeitseinstellungen hier beeinflussen lediglich,
      ob dieses Angebot im Katalog erscheint und ob es für alle oder nur für registrierte Nutzer sichtbar ist.
    </v-alert>

    <v-switch
      v-model="localTenant.catalogParticipation.visible"
      label="Angebot im Katalog anzeigen"
      @change="emitTenant"
    ></v-switch>
    <v-switch
      v-model="localTenant.catalogParticipation.restricted"
      label="Angebot nur für registrierte Nutzer im Katalog anzeigen"
      @change="emitTenant"
    ></v-switch>
  </BaseSection>
</template>

<style scoped>

</style>
