<template>
  <v-dialog v-model="openDialog" persistent max-width="600px">
    <v-card color="warning">
      <v-card-title>
        <v-icon class="mr-2">mdi-alert</v-icon>
        <span class="text-h5">Regel löschen</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Sind Sie sicher, dass Sie die Regel
          <strong>{{ toDelete.name }}</strong> löschen wollen? Diese Aktion kann
          nicht rückgängig gemacht werden.
        </span>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-col class="shrink">
          <v-btn
            color="primary"
            :loading="inProgress"
            @click="$emit('confirm')"
          >
            Ja
          </v-btn>
        </v-col>
        <v-col class="shrink">
          <v-btn outlined @click="$emit('close')">Nein</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "RuleDeleteDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toDelete: {
      type: Object,
      default: () => ({}),
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
      set(value) {
        if (!value) this.$emit("close");
      },
    },
  },
};
</script>
