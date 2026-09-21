<template>
  <v-dialog :value="open" max-width="1100px" @click:outside="$emit('close')">
    <v-card data-test="supervision-history-dialog">
      <v-card-title class="mx-3">
        <span class="text-h5">{{ title }}</span>
      </v-card-title>
      <v-divider class="mx-9 mb-5" />
      <v-card-text>
        <!-- Rendered while open only: every opening reads the history anew. -->
        <SupervisionHistoryList
          v-if="open"
          :tenant-id="tenant ? tenant.id : null"
          :instance-wide="!tenant"
          :tenants="tenants"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text data-test="history-dialog-close" @click="$emit('close')">
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
      if (!this.tenant) return this.$t("supervision.history.open-instance");
      return `${this.$t("supervision.history.title")} · ${
        this.tenant.name || this.tenant.id
      }`;
    },
  },
};
</script>
