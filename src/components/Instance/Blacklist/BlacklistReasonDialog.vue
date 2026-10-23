<template>
  <v-dialog :value="open" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break">
        {{
          $t("instance.blacklist.reason-dialog.title", { value: entry.value })
        }}
      </v-card-title>
      <v-card-text>
        <p class="text-body-2">
          {{ $t("instance.blacklist.reason-dialog.text") }}
        </p>
        <v-textarea
          v-model="reason"
          :label="$t('instance.blacklist.reason-dialog.reason')"
          outlined
          rows="2"
          auto-grow
          hide-details="auto"
        />
        <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="inProgress" @click="$emit('cancel')">
          {{ $t("instance.blacklist.reason-dialog.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!reason.trim()"
          :loading="inProgress"
          @click="$emit('confirm', reason.trim())"
        >
          {{ $t("instance.blacklist.reason-dialog.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * „Grund ändern“ of a blacklist entry: the reason
 * alone, value and kind stay. Emits `confirm` with the trimmed reason or
 * `cancel`; the parent saves.
 */
export default {
  name: "BlacklistReasonDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    entry: {
      type: Object,
      required: true,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      reason: "",
    };
  },
  watch: {
    // Immediate: the page creates the dialog with the entry, already open.
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.reason = this.entry.reason;
      },
    },
  },
};
</script>
