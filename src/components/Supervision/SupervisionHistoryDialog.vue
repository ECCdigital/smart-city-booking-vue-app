<template>
  <v-dialog
    :value="open"
    max-width="1100"
    scrollable
    @click:outside="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <v-card
      class="section-card history-dialog"
      data-test="supervision-history-dialog"
    >
      <v-card-title class="section-header">
        <v-icon>mdi-history</v-icon>
        <div class="section-header__text">
          <div class="section-header__title">{{ title }}</div>
          <div v-if="tenant" class="section-header__subtitle">
            {{ tenant.name || tenant.id }}
          </div>
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text class="history-dialog__body">
        <!-- Rendered while open only: every opening reads the history anew. -->
        <SupervisionHistoryList
          v-if="open"
          :tenant-id="tenant ? tenant.id : null"
          :instance-wide="!tenant"
          :tenants="tenants"
        />
      </v-card-text>
      <v-divider />
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
 * Drawn as the "Aufsichtsmitteilungen" dialog is: a section card with the
 * header strip, the list as its body, "Schließen" under a hairline. A
 * tenant's history names the tenant under the title.
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

<style scoped>
.history-dialog__body {
  padding: var(--scb-section-body-padding);
}
</style>
