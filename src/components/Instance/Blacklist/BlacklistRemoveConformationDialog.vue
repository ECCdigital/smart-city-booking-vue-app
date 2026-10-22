<template>
  <v-dialog :value="open" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break">
        {{
          $t("instance.blacklist.remove-dialog.title", { value: entry.value })
        }}
      </v-card-title>
      <v-card-text>
        <template v-if="suspendedUserIds.length">
          <p class="text-body-2 mb-1">
            {{
              $tc(
                "instance.blacklist.remove-dialog.suspended",
                suspendedUserIds.length,
                { count: suspendedUserIds.length }
              )
            }}
          </p>
          <ul class="text-body-2 mb-2">
            <li v-for="userId in suspendedUserIds" :key="userId">
              {{ userId }}
            </li>
          </ul>
          <v-checkbox
            v-model="unsuspend"
            :label="$t('instance.blacklist.remove-dialog.unsuspend')"
            :hint="$t('instance.blacklist.remove-dialog.unsuspend-hint')"
            persistent-hint
            dense
          />
        </template>
        <p v-else class="text-body-2">
          {{ $t("instance.blacklist.remove-dialog.none") }}
        </p>
        <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="inProgress" @click="$emit('cancel')">
          {{ $t("instance.blacklist.remove-dialog.cancel") }}
        </v-btn>
        <v-btn
          color="error"
          :loading="inProgress"
          @click="$emit('confirm', unsuspend && suspendedUserIds.length > 0)"
        >
          {{ $t("instance.blacklist.remove-dialog.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * Removing a blacklist entry (ECCdigital/tickets#625): names the accounts
 * the entry suspended and offers „Mit entsperren“, ticked. Emits `confirm`
 * with whether to lift those suspensions, or `cancel`; the parent removes.
 */
export default {
  name: "BlacklistRemoveConformationDialog",
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
      unsuspend: true,
    };
  },
  computed: {
    suspendedUserIds() {
      return this.entry.suspendedUserIds || [];
    },
  },
  watch: {
    // Immediate: the page creates the dialog with the entry, already open.
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.unsuspend = true;
      },
    },
  },
};
</script>
