<template>
  <AppDialog
    :open="open"
    icon="mdi-delete-outline"
    color="error"
    :title="
      $t('instance.blacklist.remove-dialog.title', { value: entry.value })
    "
    :busy="inProgress"
    @close="$emit('cancel')"
  >
    <template v-if="suspendedUserIds.length">
      <AppDialogSection
        :title="$t('instance.blacklist.remove-dialog.affected')"
      >
        <p class="mb-1">
          {{
            $tc(
              "instance.blacklist.remove-dialog.suspended",
              suspendedUserIds.length,
              { count: suspendedUserIds.length }
            )
          }}
        </p>
        <ul>
          <li v-for="userId in suspendedUserIds" :key="userId">
            {{ userId }}
          </li>
        </ul>
      </AppDialogSection>
      <v-checkbox
        v-model="unsuspend"
        :label="$t('instance.blacklist.remove-dialog.unsuspend')"
        :hint="$t('instance.blacklist.remove-dialog.unsuspend-hint')"
        persistent-hint
        dense
        class="mt-0"
      />
    </template>
    <p v-else class="text-body-2 mb-0">
      {{ $t("instance.blacklist.remove-dialog.none") }}
    </p>
    <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
      {{ error }}
    </v-alert>

    <template #actions>
      <v-btn outlined :disabled="inProgress" @click="$emit('cancel')">
        {{ $t("instance.blacklist.remove-dialog.cancel") }}
      </v-btn>
      <v-btn
        color="error"
        depressed
        :loading="inProgress"
        @click="$emit('confirm', unsuspend && suspendedUserIds.length > 0)"
      >
        {{ $t("instance.blacklist.remove-dialog.confirm") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
import AppDialogSection from "@/components/commons/AppDialogSection.vue";
/**
 * Removing a blacklist entry: names the accounts
 * the entry suspended and offers „Mit entsperren“, ticked. Emits `confirm`
 * with whether to lift those suspensions, or `cancel`; the parent removes.
 */
export default {
  name: "BlacklistRemoveConformationDialog",
  components: { AppDialog, AppDialogSection },
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
