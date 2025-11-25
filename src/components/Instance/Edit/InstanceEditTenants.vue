<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "InstanceEditTenants",
  components: { BaseSection },
  props: {
    instance: { type: Object, required: true },
    availableUsers: { type: Array, default: () => [] },
  },
  data() {
    return {
      local: { ...this.instance },
      selectedUserToCreateTenant: null,
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
    addUser() {
      this.local.allowedUsersToCreateTenant.push(
        this.selectedUserToCreateTenant
      );
      this.selectedUserToCreateTenant = null;
    },
    removeUser(userId) {
      this.local.allowedUsersToCreateTenant.splice(
        this.local.allowedUsersToCreateTenant.indexOf(userId),
        1
      );
    },
    filtersUsers(usersToExclude) {
      return this.availableUsers?.filter(
        (user) => !usersToExclude.includes(user.id)
      );
    },
  },
};
</script>

<template>
  <BaseSection
    title="Mandanten"
    icon="mdi-domain"
    hint="Spezifizieren Sie hier wer Mandanten erstellen darf."
  >
    <v-switch
      v-model="local.allowAllUsersToCreateTenant"
      color="primary"
      hide-details
      label="Erlauben Sie allen Benutzern Mandanten zu erstellen"
      @change="emitUpdate"
    ></v-switch>

    <v-alert
      v-if="local.allowAllUsersToCreateTenant"
      type="warning"
      border="left"
      colored-border
      elevation="1"
      class="mt-3"
    >
      Jeder Benutzer der Plattform ist berechtigt, Mandanten zu erstellen.
    </v-alert>

    <v-divider class="my-6" />

    <h3 class="mb-2">Benutzer berechtigen</h3>

    <div class="text-body-2 mb-2">
      Berechtigen Sie hier spezifische Benutzer Mandanten zu erstellen, auch
      wenn die Option "Erlauben Sie allen Benutzern Mandanten zu erstellen"
      deaktiviert ist.
    </div>
    <v-row>
      <v-col class="col-12">
        <v-autocomplete
          hide-details
          placeholder="Benutzer Hinzufügen"
          clearable
          v-model="selectedUserToCreateTenant"
          :items="filtersUsers(local.allowedUsersToCreateTenant)"
          item-text="id"
          item-value="id"
          class="ma-5"
          @input="emitUpdate"
        >
          <template v-slot:append-outer>
            <v-btn small color="primary" @click="addUser">
              <v-icon left> mdi-plus</v-icon>
              Hinzufügen
            </v-btn>
          </template>
        </v-autocomplete>
        <v-list v-if="local.allowedUsersToCreateTenant?.length" dense>
          <v-list-item-group
            v-model="selectedUserToCreateTenant"
            color="primary"
          >
            <v-list-item
              v-for="(item, i) in local.allowedUsersToCreateTenant"
              :key="i"
            >
              <v-list-item-icon>
                <v-icon> mdi-account</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ item }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-icon>
                <v-icon @click="removeUser(item)"> mdi-delete</v-icon>
              </v-list-item-icon>
            </v-list-item>
          </v-list-item-group>
        </v-list>
        <div class="font-italic text-center grey--text pa-5" v-else>
          <v-icon color="grey">mdi-account-off-outline</v-icon> Es sind keine
          Benutzer berechtigt.
        </div>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
