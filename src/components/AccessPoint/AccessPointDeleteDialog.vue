<script>
export default {
  name: "AccessPointDeleteDialog",
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
    // Bookables that reference this access point, named so the admin sees
    // what loses its door before confirming.
    affectedBookables: { type: Array, default: () => [] },
    deleting: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  computed: {
    label() {
      return (
        this.accessPoint?.label ||
        this.accessPoint?.externalId ||
        this.accessPoint?.id ||
        ""
      );
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="560"
    persistent
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left color="error">mdi-delete</v-icon>
        {{ $t("accessPoint.management.delete.title") }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <p>{{ $t("accessPoint.management.delete.question", { label }) }}</p>

        <v-alert
          v-if="affectedBookables.length > 0"
          color="warning"
          text
          dense
          class="mb-0"
        >
          <div class="font-weight-medium mb-1">
            {{ $t("accessPoint.management.delete.affectedTitle") }}
          </div>
          <ul class="affected-list">
            <li v-for="bookable in affectedBookables" :key="bookable.id">
              {{ bookable.title || bookable.id }}
            </li>
          </ul>
          <div class="text-caption mt-2">
            {{ $t("accessPoint.management.delete.affectedHint") }}
          </div>
        </v-alert>
        <div v-else class="text-caption text--secondary">
          {{ $t("accessPoint.management.delete.noneAffected") }}
        </div>

        <v-alert v-if="error" color="error" text dense class="mt-4 mb-0">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn text :disabled="deleting" @click="$emit('close')">
          {{ $t("accessPoint.management.cancel") }}
        </v-btn>
        <v-btn color="error" :loading="deleting" @click="$emit('confirm')">
          {{ $t("accessPoint.management.delete.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.affected-list {
  margin: 0;
  padding-left: 18px;
}
</style>
