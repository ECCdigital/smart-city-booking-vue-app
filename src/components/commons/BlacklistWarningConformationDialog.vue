<template>
  <v-dialog :value="open" max-width="520" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break">
        {{ $t("blacklist-warning.title") }}
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-1">
          {{ $tc("blacklist-warning.text", addresses.length) }}
        </p>
        <ul class="text-body-2 mb-2">
          <li v-for="address in addresses" :key="address">{{ address }}</li>
        </ul>
        <p class="text-body-2 mb-0">
          {{ $t("blacklist-warning.hint") }}
        </p>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text @click="$emit('cancel')">
          {{ $t("blacklist-warning.cancel") }}
        </v-btn>
        <v-btn color="warning" @click="$emit('confirm')">
          {{ $t(`blacklist-warning.confirm.${action}`) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * The warning of the administration's ways before an address on the
 * blacklist is saved: names the addresses, never
 * the entry or its reason. Emits `confirm` to save anyway, or `cancel`;
 * the parent saves.
 */
export default {
  name: "BlacklistWarningConformationDialog",
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
