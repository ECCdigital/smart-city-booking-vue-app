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
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-text>
        <v-list>
          <v-list-item-title>
            <span class="text-h6">Rollen</span>
          </v-list-item-title>

          <v-list-item v-for="role in roles" :key="role.id">
            <v-list-item-action>
              <v-checkbox
                v-model="selectedRoleIds"
                :value="role.id"
              />
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
    open: { type: Boolean, required: true },
    user: { type: Object, required: true },
    roles: { type: Array, required: true },
  },
  data() {
    return {
      userCopy: { roleStatuses: [] },
    };
  },
  watch: {
    user: {
      handler() {
        const safe = JSON.parse(JSON.stringify(this.user || {}));
        if (!Array.isArray(safe.roleStatuses)) safe.roleStatuses = [];
        this.userCopy = safe;
      },
      immediate: true,
      deep: false,
    },
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },

    selectedRoleIds: {
      get() {
        const rs = this.userCopy.roleStatuses || [];
        return rs
          .filter((r) => r && r.status !== "inactive")
          .map((r) => r.role);
      },
      set(newIds) {
        const current = Array.isArray(this.userCopy.roleStatuses)
          ? [...this.userCopy.roleStatuses]
          : [];

        const currentIds = new Set(
          current.filter(Boolean).map((r) => r.role)
        );
        const newIdSet = new Set(newIds);

        const kept = current.filter((r) => newIdSet.has(r.role));

        const toAdd = [...newIdSet]
          .filter((id) => !currentIds.has(id))
          .map((id) => ({
            role: id,
            status: "active",
            source: "manually",
          }));

        this.userCopy.roleStatuses = [...kept, ...toAdd];
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    saveUserRoles() {
      this.$emit("save", this.userCopy.userId, this.userCopy.roleStatuses);
    },
  },
};
</script>

<style scoped></style>
