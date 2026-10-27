<template>
  <AppDialog
    :open="open"
    icon="mdi-alert-outline"
    color="warning"
    max-width="520"
    :title="$t('blacklist-warning.title')"
    @close="$emit('cancel')"
  >
    <AppDialogSection :title="$t('blacklist-warning.affected')">
      <p class="mb-1">
        {{ $tc("blacklist-warning.text", addresses.length) }}
      </p>
      <ul>
        <li v-for="address in addresses" :key="address">{{ address }}</li>
      </ul>
    </AppDialogSection>
    <p class="text-body-2 mb-0">
      {{ $t("blacklist-warning.hint") }}
    </p>
    <template #actions>
      <v-btn outlined @click="$emit('cancel')">
        {{ $t("blacklist-warning.cancel") }}
      </v-btn>
      <v-btn depressed color="warning" @click="$emit('confirm')">
        {{ $t(`blacklist-warning.confirm.${action}`) }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
import AppDialogSection from "@/components/commons/AppDialogSection.vue";
/**
 * The warning of the administration's ways before an address on the
 * blacklist is saved: names the addresses, never
 * the entry or its reason. Emits `confirm` to save anyway, or `cancel`;
 * the parent saves.
 */
export default {
  name: "BlacklistWarningConformationDialog",
  components: { AppDialog, AppDialogSection },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    addresses: {
      type: Array,
      required: true,
    },
    /** What „anyway“ does: `save`, `invite` or `add`. */
    action: {
      type: String,
      default: "save",
    },
  },
};
</script>
