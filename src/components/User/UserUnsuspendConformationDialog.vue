<template>
  <AppDialog
    :open="open"
    icon="mdi-lock-open-variant-outline"
    color="success"
    max-width="480"
    :title="$t('user.suspension.unsuspend.title', { name })"
    :busy="inProgress"
    @close="$emit('cancel')"
  >
    <p class="text-body-2 mb-0">
      {{ $t("user.suspension.unsuspend.text", { name }) }}
    </p>
    <v-progress-linear
      v-if="entry === undefined && !error"
      indeterminate
      class="mt-3"
    />
    <v-checkbox
      v-else-if="isAddressEntry"
      v-model="removeEntry"
      :label="
        $t('user.suspension.unsuspend.remove-entry', { entry: entry.value })
      "
      hide-details
      class="mt-2"
    />
    <v-alert v-else-if="isDomainEntry" type="info" text dense class="mt-3 mb-0">
      {{ $t("user.suspension.unsuspend.domain-entry") }}
    </v-alert>
    <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
      {{ error }}
    </v-alert>

    <template #actions>
      <v-btn outlined :disabled="inProgress" @click="$emit('cancel')">
        {{ $t("user.suspension.unsuspend.cancel") }}
      </v-btn>
      <v-btn
        color="primary"
        depressed
        :disabled="entry === undefined"
        :loading="inProgress"
        @click="$emit('confirm', isAddressEntry && removeEntry)"
      >
        {{ $t("user.suspension.unsuspend.confirm") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
/**
 * „<Name> entsperren?“. An exact blacklist entry
 * of the address is offered for removal, checked from the start; a domain
 * entry stays and the dialog says the checkout keeps refusing the address.
 * Emits `confirm` with whether to remove the
 * entry, or `cancel`; the parent lifts the suspension.
 */
export default {
  name: "UserUnsuspendConformationDialog",
  components: { AppDialog },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    /**
     * The blacklist entry that hits the address, `null` without one,
     * `undefined` while it loads.
     */
    entry: {
      type: Object,
      default: undefined,
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
      removeEntry: true,
    };
  },
  computed: {
    isAddressEntry() {
      return this.entry?.kind === "address";
    },
    isDomainEntry() {
      return this.entry?.kind === "domain";
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.removeEntry = true;
    },
  },
};
</script>
