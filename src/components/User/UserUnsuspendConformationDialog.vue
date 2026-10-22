<template>
  <v-dialog :value="open" max-width="480" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break">
        {{ $t("user.suspension.unsuspend.title", { name }) }}
      </v-card-title>
      <v-card-text>
        {{ $t("user.suspension.unsuspend.text", { name }) }}
        <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="inProgress" @click="$emit('cancel')">
          {{ $t("user.suspension.unsuspend.cancel") }}
        </v-btn>
        <v-btn color="primary" :loading="inProgress" @click="$emit('confirm')">
          {{ $t("user.suspension.unsuspend.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * „<Name> entsperren?“ (ECCdigital/tickets#624). Emits `confirm` or
 * `cancel`; the parent lifts the suspension.
 */
export default {
  name: "UserUnsuspendConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    name: {
      type: String,
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
};
</script>
