<script>
import debounce from "lodash/debounce";
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditGeneral",
  components: { BaseSection },
  props: { tenant: { type: Object, required: true } },
  data() {
    return { valid: false };
  },
  computed: {
    model: {
      get() {
        return this.tenant;
      },
      set(val) {
        this._emitDebounced(val);
      },
    },
  },
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:tenant", { ...val });
    }, 200);
  },
  methods: {
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Allgemeine Informationen" icon="mdi-home">
      <v-row dense>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="ID"
            readonly
            disabled
            v-model="model.id"
          />
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Name"
            :rules="[(v) => !!v || 'Pflichtfeld']"
            v-model="model.name"
          />
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Kontakt Person"
            :rules="[(v) => !!v || 'Pflichtfeld']"
            v-model="model.contactName"
          />
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Adresse"
            :rules="[(v) => !!v || 'Pflichtfeld']"
            v-model="model.location"
          />
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="E-Mail Adresse"
            :rules="[
              (v) => !!v || 'Pflichtfeld',
              (v) =>
                /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v) || 'Muss gültig sein.',
            ]"
            type="email"
            v-model="model.mail"
          />
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Telefonnummer"
            :rules="[(v) => !!v || 'Pflichtfeld']"
            v-model="model.phone"
          />
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Website"
            :rules="[(v) => !!v || 'Pflichtfeld']"
            v-model="model.website"
          />
        </v-col>
      </v-row>
    </BaseSection>
  </v-form>
</template>
