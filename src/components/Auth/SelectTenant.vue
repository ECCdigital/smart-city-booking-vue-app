<script>
import {mapActions} from "vuex";

export default {
  name: "SelectTenant",

  props: {
    tenants: {
      type: Array,
      required: true,
    },
  },

  data() {
    return {
      tenant: null,
      rules: {
        required: (value) => !!value || "Erforderlich.",
      },
    };
  },

  methods: {
    ...mapActions({
      updateTenant: "authStore/update",
    }),
    next() {
      if (!this.$refs.tenantForm.validate()) {
        return;
      }
      this.$emit("next");
    },
  },

  watch: {
    tenant: {
      handler: function (tenant) {
        this.updateTenant(tenant);
        this.$emit("input", tenant);
      },
      immediate: true,
    },
    tenants: {
      handler: function (tenants) {
        if (tenants.length === 1) {
          this.tenant = tenants[0];
        }
      },
      immediate: true,
    },
  },

  mounted() {},
};
</script>

<template>
  <v-card flat>
    <v-card-text class="text-center">
      <p class="subtitle-2 mb-10">Bitte wählen Sie einen Mandanten aus</p>
      <v-form ref="tenantForm">
        <v-select
          outlined
          hide-details
          label="Mandant"
          v-model="tenant"
          :items="tenants"
          item-text="name"
          return-object
          no-data-text="Keine Mandanten vorhanden"
          class="mt-5"
          :rules="[rules.required]"
        ></v-select>
      </v-form>
    </v-card-text>
    <v-card-actions class="px-4">
      <v-spacer></v-spacer>
      <v-btn color="primary" elevation="0" @click="next">Weiter</v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped></style>
