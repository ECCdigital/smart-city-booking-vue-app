<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="warning">
      <v-card-title>
        <v-icon class="mr-2">mdi-alert</v-icon>
        <span class="text-h5">Mandanten löschen</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Sind Sie sicher, dass Sie den Mandanten
          <strong>{{ toDelete.name }}</strong> mit der ID
          <strong>{{ toDelete.id }}</strong> löschen wollen?
        </span>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-col class="shrink">
          <v-btn color="primary" :loading="inProgress" @click="onDelete"
            >Ja</v-btn
          >
        </v-col>
        <v-col class="shrink">
          <v-btn outlined @click="closeDialog">Nein</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "deleteConformationDialog",
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
      try {
        await ApiTenantService.deleteTenant(this.toDelete);
        this.closeDialog();
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>

<style scoped></style>
