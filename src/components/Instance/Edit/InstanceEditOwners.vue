<template>
  <BaseSection title="Instanz Admin" icon="mdi-shield-crown">
    <v-autocomplete
      hide-details
      placeholder="Admin Hinzufügen"
      clearable
      v-model="selectedOwner"
      :items="filtersUsers(local.ownerUserIds)"
      item-text="id"
      item-value="id"
    >
      <template v-slot:append-outer>
        <v-btn small color="primary" @click="addOwner">
          <v-icon left> mdi-plus</v-icon>
          Hinzufügen
        </v-btn>
      </template>
    </v-autocomplete>

    <v-divider class="my-4" />

    <v-list dense>
      <v-list-item-group v-model="selectedUser" color="primary">
        <v-list-item v-for="(item, i) in local.ownerUserIds" :key="i">
          <v-list-item-icon>
            <v-icon> mdi-account</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-icon>
            <v-btn icon @click="removeOwner(item)">
              <v-icon color="error"> mdi-delete</v-icon>
            </v-btn>
          </v-list-item-icon>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "InstanceEditOwners",
  components: { BaseSection },
  props: {
    instance: { type: Object, required: true },
    availableUsers: { type: Array, default: () => [] },
  },
  data() {
    return {
      local: { ...this.instance },
      selectedOwner: null,
      selectedUser: null,
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
    filtersUsers(usersToExclude) {
      // availableUsers prop may come in different shape; try to return IDs
      const list = this.availableUsers || [];
      return list.filter((u) => !usersToExclude.includes(u.id));
    },
    addOwner() {
      if (!this.local.ownerUserIds) this.local.ownerUserIds = [];
      if (
        this.selectedOwner &&
        !this.local.ownerUserIds.includes(this.selectedOwner)
      ) {
        this.local.ownerUserIds.push(this.selectedOwner);
        this.emitUpdate();
      }
      this.selectedOwner = null;
    },
    removeOwner(userId) {
      const idx = this.local.ownerUserIds.indexOf(userId);
      if (idx >= 0) {
        this.local.ownerUserIds.splice(idx, 1);
        this.emitUpdate();
      }
    },
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>

<style scoped></style>
