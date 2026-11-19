<template>
  <v-dialog v-model="openDialog" persistent scrollable max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">Rolle löschen</span>
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        Sind Sie sicher, dass Sie die Rolle
        <strong>{{ toDelete.name || toDelete.id }}</strong
        ><template v-if="toDelete.name"> ({{ toDelete.id }})</template>
        löschen wollen?
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn color="error" :loading="inProgress" @click="onDelete">
          <v-icon left small>mdi-delete</v-icon>
          Löschen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiRolesService from "@/services/api/ApiRolesService";

export default {
  name: "roleDeleteConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toDelete: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      inProgress: false,
    };
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
    async onDelete() {
      this.inProgress = true;
      // TODO: darf nicht gelöscht werden, wenn Benutzer noch diese Rolle haben.
      await ApiRolesService.deleteRole(this.toDelete);
      this.inProgress = false;
      this.closeDialog();
    },
  },
};
</script>

<style scoped></style>
