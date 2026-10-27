<template>
  <AppDialog
    :open="open"
    icon="mdi-pencil-outline"
    :title="
      $t('instance.blacklist.reason-dialog.title', { value: entry.value })
    "
    :busy="inProgress"
    @close="$emit('cancel')"
  >
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

    <template #actions>
      <v-btn outlined :disabled="inProgress" @click="$emit('cancel')">
        {{ $t("instance.blacklist.reason-dialog.cancel") }}
      </v-btn>
      <v-btn
        color="primary"
        depressed
        :disabled="!reason.trim()"
        :loading="inProgress"
        @click="$emit('confirm', reason.trim())"
      >
        {{ $t("instance.blacklist.reason-dialog.confirm") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
/**
 * „Grund ändern“ of a blacklist entry: the reason
 * alone, value and kind stay. Emits `confirm` with the trimmed reason or
 * `cancel`; the parent saves.
 */
export default {
  name: "BlacklistReasonDialog",
  components: { AppDialog },
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
