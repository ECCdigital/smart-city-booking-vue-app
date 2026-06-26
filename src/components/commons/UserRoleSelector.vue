<template>
  <div>
    <div v-if="showUsers">
      <div class="info-label mb-2">
        <v-icon small class="mr-2">mdi-account-multiple</v-icon>
        {{ usersLabel }}
      </div>
      <p v-if="usersHint" class="mb-3 text-caption">
        <span v-html="usersHint" />
      </p>
      <v-combobox
        :value="users"
        @input="$emit('update:users', $event)"
        :items="availableUsers"
        :label="usersLabel"
        hide-selected
        no-data-text="Keine Benutzer verfügbar"
        multiple
        background-color="accent"
        clearable
        chips
        filled
        dense
      >
        <template v-slot:selection="{ attrs, item, select, selected }">
          <v-chip
            v-bind="attrs"
            :input-value="selected"
            close
            small
            color="secondary"
            @click="select"
            @click:close="removeUser(item)"
          >
            <strong>{{ item }}</strong>
          </v-chip>
        </template>
      </v-combobox>
    </div>

    <div v-if="showRoles" :class="{ 'mt-5': showUsers }">
      <div class="info-label mb-2">
        <v-icon small class="mr-2">mdi-account-group</v-icon>
        {{ rolesLabel }}
      </div>
      <p v-if="rolesHint" class="mb-3 text-caption">
        <span v-html="rolesHint" />
      </p>
      <v-combobox
        :value="roles"
        @input="$emit('update:roles', $event)"
        :items="availableRoles"
        :label="rolesLabel"
        item-text="name"
        item-value="id"
        hide-selected
        no-data-text="Keine Rollen verfügbar"
        multiple
        background-color="accent"
        clearable
        chips
        filled
        dense
        :return-object="false"
      >
        <template v-slot:selection="{ attrs, item, select, selected }">
          <v-chip
            v-bind="attrs"
            :input-value="selected"
            close
            small
            color="secondary"
            @click="select"
            @click:close="removeRole(item)"
          >
            <strong>{{
              availableRoles.find((r) => r.id === item)?.name || item
            }}</strong>
          </v-chip>
        </template>
      </v-combobox>
    </div>
  </div>
</template>

<script>
import ApiRolesService from "@/services/api/ApiRolesService";

export default {
  name: "UserRoleSelector",
  props: {
    users: { type: Array, default: () => [] },
    roles: { type: Array, default: () => [] },
    usersLabel: { type: String, default: "Benutzer" },
    rolesLabel: { type: String, default: "Rollen" },
    usersHint: { type: String, default: "" },
    rolesHint: { type: String, default: "" },
    showUsers: { type: Boolean, default: true },
    showRoles: { type: Boolean, default: true },
    availableUsers: { type: Array, default: () => [] },
    fetchRolesOnMount: { type: Boolean, default: true },
    availableRolesProp: { type: Array, default: null },
  },
  data() {
    return {
      availableRoles: [],
    };
  },
  methods: {
    removeUser(item) {
      const next = [...this.users];
      next.splice(next.indexOf(item), 1);
      this.$emit("update:users", next);
    },
    removeRole(item) {
      const next = [...this.roles];
      next.splice(next.indexOf(item), 1);
      this.$emit("update:roles", next);
    },
    async fetchRoles() {
      const result = await ApiRolesService.getTenantRoles(true);
      this.availableRoles = result?.data || [];
    },
  },
  watch: {
    availableRolesProp: {
      immediate: true,
      handler(v) {
        if (v) this.availableRoles = v;
      },
    },
  },
  mounted() {
    if (this.fetchRolesOnMount && !this.availableRolesProp) {
      this.fetchRoles();
    }
  },
};
</script>

<style scoped>
.info-label {
  font-weight: 500;
  display: flex;
  align-items: center;
}
</style>
