<template>
  <BaseSection
    title="Allgemeine Informationen"
    icon="mdi-home"
    hint="Kontaktangaben zu Ihrer Instanz"
  >
    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Kontaktadresse"
          placeholder="Muster Amt, Musterstraße 1, 12345 Musterstadt"
          v-model="local.contactAddress"
          @input="emitUpdate"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          placeholder="example.com"
          label="Webseite"
          v-model="local.contactUrl"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Link zum Datenschutz"
          v-model="local.dataProtectionUrl"
          @input="emitUpdate"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Link zum Impressum"
          v-model="local.legalNoticeUrl"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "InstanceEditGeneral",
  components: { BaseSection },
  props: {
    instance: { type: Object, required: true },
  },
  data() {
    return {
      local: { ...this.instance },
    };
  },
  watch: {
    instance: {
      handler(n) {
        this.local = { ...n };
      },
      deep: true,
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    validate() {
      // minimal validation, could be extended
      return true;
    },
    resetValidation() {
      // placeholder for child validation reset
    },
  },
};
</script>

<style scoped></style>
