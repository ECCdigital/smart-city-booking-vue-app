<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-card-title>
        <v-icon class="mr-2" color="error">mdi-alert</v-icon>
        <span class="text-h5">Gutschein löschen</span>
      </v-card-title>
      <v-card-text>
        <span class="text-h6">
          Sind Sie sicher, dass Sie den Gutschein
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
import ApiCouponService from "@/services/api/ApiCouponService";

export default {
  name: "CouponDeleteConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toDelete: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      inProgress: false
    }
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
      this.$emit("close")
    },
    async onDelete() {
      this.inProgress = true;
      await ApiCouponService.deleteCoupon(this.toDelete.tenant, this.toDelete.id);
      this.inProgress = false;
      this.closeDialog();
    }
  }
};
</script>

<style scoped></style>
