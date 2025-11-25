<template>
  <v-dialog v-model="openDialog" persistent max-width="700px">
    <v-card elevation="10" class="rounded-xl">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left class="mr-3">mdi-account-cog</v-icon>
        <span class="text-h5 font-weight-medium"
          >Benutzerrollen bearbeiten</span
        >
        <v-spacer></v-spacer>
      </v-card-title>

      <v-divider class=""></v-divider>

      <v-card-text class="pt-2 pb-0 px-8">
        <div class="text-caption text-grey--text">
          Benutzer-ID:
          <span class="text-body-2 font-weight-medium text--primary">
            {{ userCopy.userId }}
          </span>
        </div>
      </v-card-text>

      <v-card-text class="pt-0 px-8 pb-4">
        <v-subheader class="pl-0 text-h6">Rollen</v-subheader>
        <v-divider class="mb-4"></v-divider>

        <v-row>
          <v-col v-for="(role, i) in roles" :key="i" cols="12" sm="6" md="4">
            <v-card outlined rounded="lg" class="hoverable pa-2">
              <v-list-item dense>
                <v-list-item-action>
                  <v-checkbox
                    v-model="userCopy.roles"
                    :value="role.id"
                    color="primary"
                    hide-details
                  />
                </v-list-item-action>
                <v-list-item-content>
                  <v-list-item-title class="font-weight-medium">
                    {{ role.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="role.description">
                    {{ role.description }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="justify-end pr-6 pb-4 pt-2">
        <v-btn outlined color="" @click="closeDialog"> Abbrechen </v-btn>
        <v-btn color="primary" dark @click="saveUserRoles"> Speichern </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "TenantUserEditRoleDialog",
  props: {
    open: Boolean,
    user: Object,
    roles: Array,
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
