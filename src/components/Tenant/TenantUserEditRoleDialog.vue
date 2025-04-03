<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card>
      <v-card-title class="mx-3">
        <span class="text-h5">Benutzer Rollen bearbeiten</span>
      </v-card-title>
      <v-divider class="mx-9 mb-5" />
      <v-card-text>
        <v-row>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              hide-details
              label="ID"
              readonly
              disabled
              v-model="userCopy.userId"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-text>
        <v-list>
          <v-list-item-title>  <span class="text-h6">Rollen</span></v-list-item-title>
          <v-list-item v-for="(role, i) in roles" :key="i">
            <v-list-item-action>
              <v-checkbox
                v-model="userCopy.roles"
                :value="role.id"
              ></v-checkbox>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ role.name }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn color="primary" @click="saveUserRoles">Speichern</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "TenantUserEditRoleDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      required: true,
    },
    roles: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      userCopy: {},
    };
  },
  watch: {
    user: {
      handler() {
        this.userCopy = JSON.parse(JSON.stringify(this.user));
      },
      immediate: true,
    },
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    saveUserRoles() {
      this.$emit("save", this.userCopy.userId, this.userCopy.roles);
    },
  },
};
</script>

<style scoped></style>
