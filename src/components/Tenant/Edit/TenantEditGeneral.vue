<template>
  <v-form ref="form" v-model="valid">
    <h3>Allgemeine Informationen</h3>
    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="ID"
          readonly
          disabled
          v-model="localTenant.id"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Name"
          :rules="[v => !!v || 'Pflichtfeld']"
          v-model="localTenant.name"
          @change="emitTenant"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Kontakt Person"
          :rules="[v => !!v || 'Pflichtfeld']"
          v-model="localTenant.contactName"
          @change="emitTenant"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Adresse"
          :rules="[v => !!v || 'Pflichtfeld']"
          v-model="localTenant.location"
          @change="emitTenant"
        />
      </v-col>
    </v-row>
  </v-form>
</template>

<script>
export default {
  name: "TenantEditGeneral",
  props: {
    tenant: { type: Object, required: true },
  },
  data() {
    return {
      localTenant: { ...this.tenant },
      valid: false,
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
  },
};
</script>
