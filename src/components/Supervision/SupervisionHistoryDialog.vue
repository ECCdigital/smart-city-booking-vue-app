<template>
  <v-dialog
    :value="open"
    max-width="1100"
    scrollable
    @click:outside="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <v-card class="history-dialog" data-test="supervision-history-dialog">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-history</v-icon>
        <div class="flex-grow-1">
          <div class="text-h5">{{ title }}</div>
          <div v-if="tenant" class="text-caption text--secondary">
            {{ tenant.name || tenant.id }}
          </div>
        </div>
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <!-- Rendered while open only: every opening reads the history anew. -->
        <SupervisionHistoryList
          v-if="open"
          :tenant-id="tenant ? tenant.id : null"
          :instance-wide="!tenant"
          :tenants="tenants"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn
          outlined
          data-test="history-dialog-close"
          @click="$emit('close')"
        >
          {{ $t("supervision.history.close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import SupervisionHistoryList from "@/components/Supervision/SupervisionHistoryList.vue";

/**
 * The supervision history as the instance owner opens it from the instance's
 * tenant list: of one tenant, or - without a tenant - of the whole instance.
 * Drawn in the dialog layout of docs/agents/components.md: the list as its
 * body, "Schließen" under a hairline. A tenant's history names the tenant
 * under the title.
 */
export default {
  name: "SupervisionHistoryDialog",
  components: { SupervisionHistoryList },
  props: {
    open: { type: Boolean, default: false },
    tenant: { type: Object, default: null },
    tenants: { type: Array, default: () => [] },
  },
  computed: {
    title() {
      return this.$t(
        this.tenant
          ? "supervision.history.title"
          : "supervision.history.open-instance"
      );
    },
  },
};
</script>
