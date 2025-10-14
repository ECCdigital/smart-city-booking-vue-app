<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditWeb",
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
            /https?:\/\/([a-z\.A-Z\-]+)\/.*/g.test(v) ||
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
  <BaseSection title="Web-Schnittstelle" icon="mdi-web">
    <v-form ref="form" v-model="valid">
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Link zur Detailseite (Buchungsobjekt)"
            placeholder="https://..."
            v-model="localTenant.bookableDetailLink"
            suffix="?bkid=[ID]"
            @input="emitTenant()"
          >
          </v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Link zur Detailseite (Event)"
            placeholder="https://..."
            v-model="localTenant.eventDetailLink"
            suffix="?bkid=[ID]"
            @input="emitTenant()"
          >
          </v-text-field>
        </v-col>
      </v-row>
    </v-form>

  </BaseSection>
</template>

<style scoped></style>
