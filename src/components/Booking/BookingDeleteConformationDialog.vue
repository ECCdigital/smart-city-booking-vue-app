<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="error">mdi-alert</v-icon>
        <span class="text-h5">Buchung löschen</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Sind Sie sicher, dass Sie die Buchung
          <strong>{{ toDelete.id }}</strong> löschen wollen?
        </span>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-col class="shrink">
          <v-tooltip :disabled="!isPayedAndHasPrice" top>
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn
                  color="primary"
                  :disabled="isPayedAndHasPrice"
                  :loading="inProgress"
                  @click="onDelete"
                  >Ja</v-btn
                >
              </div>
            </template>
            <span>Die Buchung wurde bereits bezahlt.</span>
          </v-tooltip>
        </v-col>
        <v-col class="shrink">
          <v-btn outlined @click="closeDialog">Nein</v-btn>
        </v-col>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "BookingDeleteConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toDelete: {
      type: Object,
      required: true,
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
    },
    isPayedAndHasPrice() {
      return !!(
        this.toDelete.isPayed && this.toDelete?._populated?.bookable?.priceEur
      );
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    async onDelete() {
      this.$emit("delete-booking", this.toDelete.id);
    },
  },
};
</script>

<style scoped></style>
