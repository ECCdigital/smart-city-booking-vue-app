<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditEvents",
  components: { BaseSection },
  props: {
    tenant: { type: Object, required: true },
  },
  data() {
    return {
      valid: false,
      localTenant: { ...this.tenant },
      validationRules: {
        required: [(v) => !!v || "Pflichtfeld"],
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) => /.+@.+\..+/.test(v) || "Muss gültige Email-Adresse sein.",
        ],
        paymentPurposeSuffix: [
          (v) => !v || v.length <= 12 || "Maximal 12 Zeichen erlaubt.",
        ],
        weblink: [
          (v) =>
            !v ||
            /https?\:\/\/([a-z\.A-Z\-]+)\/.*/g.test(v) ||
            "Ungültige URL.",
        ],
      },
    };
  },
  watch: {
    tenant: {
      deep: true,
      handler(v) {
        this.localTenant = { ...v };
      },
    },
  },
  methods: {
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
  <BaseSection
    title="Event Konfiguration"
    icon="mdi-calendar-multiselect"
    hint="Mit dieser Option können Sie das Erstellen einer Veranstaltung standardmäßig auf den einfachen Modus umstellen. Dieser Modus ist für die meisten Anwendungsfälle ausreichend. Das Erstellen einer detaillierte Veranstaltung lässt sich weiterhin über den Veranstaltung Erstellen Knopf auswählen."
  >
    <v-row>
      <v-col class="col-12 col-md-6">
        <v-switch
          v-model="localTenant.defaultEventCreationMode"
          color="primary"
          true-value="simple"
          false-value="detailed"
          hide-details
          label="Einfacher Event-Modus"
          class="mt-2"
          @change="emitTenant()"
        >
        </v-switch>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
