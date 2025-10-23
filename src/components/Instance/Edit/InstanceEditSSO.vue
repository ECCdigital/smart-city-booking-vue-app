<template>
  <BaseSection title="Single Sign-On (SSO) mit Keycloak" icon="mdi-lock">
    <v-row>
      <v-col>
        <v-switch
          v-model="localKeycloak.active"
          color="primary"
          hide-details
          label="Keycloak aktivieren"
          @change="emitUpdate"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Keycloak-URL"
          v-model="localKeycloak.serverUrl"
          @input="emitUpdate"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Realm"
          v-model="localKeycloak.realm"
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
          label="Client-ID für Web-Anwendung"
          v-model="localKeycloak.publicClient"
          @input="emitUpdate"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Client-ID für Api-Zugriff"
          v-model="localKeycloak.privateClient"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col class="col-12 col-md-8">
        <v-text-field
          background-color="accent"
          filled
          dense
          :type="showSecret ? 'text' : 'password'"
          :append-icon="showSecret ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showSecret = !showSecret"
          label="Client Secret"
          v-model="localKeycloak.privateClientSecret"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-switch
          v-model="localKeycloak.roleMapping.active"
          label="Rollenzuordnung aktivieren"
          @change="emitUpdate"
        />
      </v-col>

      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn
          color="primary"
          :disabled="!localKeycloak.roleMapping?.active"
          @click="addRole"
        >
          <v-icon left> mdi-plus</v-icon>
          Rollenzuweisung hinzufügen</v-btn
        >
      </v-col>
    </v-row>

    <v-row
      v-for="(role, idx) in localKeycloak.roleMapping.roles"
      :key="idx"
      align="center"
    >
      <v-col>
        <v-select
          background-color="accent"
          filled
          dense
          label="Mandant"
          :items="tenants"
          item-value="id"
          item-text="name"
          v-model="role.tenantId"
          @change="onRoleChange(idx)"
        />
      </v-col>

      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Keycloak-Rolle"
          v-model="role.keycloakRole"
          @input="emitUpdate"
        />
      </v-col>

      <v-col>
        <v-select
          v-model="role.tenantRoleId"
          background-color="accent"
          :items="filterRoles(role.tenantId)"
          item-text="name"
          item-value="id"
          filled
          dense
          label="Rollen-Mapping"
          @change="emitUpdate"
        />
      </v-col>

      <v-col cols="auto">
        <v-btn icon @click="removeRole(idx)">
          <v-icon color="error">mdi-delete</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "InstanceEditSSO",
  components: { BaseSection },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
  },
  data() {
    return {
      localKeycloak: {
        ...(this.instance.applications?.find((a) => a.id === "keycloak") || {}),
      },
      showSecret: false,
    };
  },
  watch: {
    instance: {
      handler(n) {
        this.localKeycloak = {
          ...(n.applications?.find((a) => a.id === "keycloak") || {}),
        };
      },
      deep: true,
    },
  },
  methods: {
    emitUpdate() {
      // merge keycloak back into a minimal update for the instance
      this.$emit("update:instance", {
        applications: [{ ...this.localKeycloak }],
      });
    },
    filterRoles(tenantId) {
      return (
        (this.availableRoles || []).filter((r) => r.tenantId === tenantId) || []
      );
    },
    addRole() {
      if (!this.localKeycloak.roleMapping)
        this.localKeycloak.roleMapping = { active: false, roles: [] };
      this.localKeycloak.roleMapping.roles.push({
        tenantId: null,
        keycloakRole: "",
        tenantRoleId: null,
      });
      this.emitUpdate();
    },
    removeRole(idx) {
      this.localKeycloak.roleMapping.roles.splice(idx, 1);
      this.emitUpdate();
    },
    onRoleChange(idx) {
      // clear tenantRoleId when tenant changes
      this.localKeycloak.roleMapping.roles[idx].tenantRoleId = null;
      this.emitUpdate();
    },
    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>

<style scoped></style>
