<template>
  <v-dialog :value="open" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break">
        <v-icon color="error" class="mr-2">mdi-cancel</v-icon>
        {{ $t("user.suspension.suspend.title", { name }) }}
      </v-card-title>
      <v-card-text>
        <v-alert type="error" text dense class="mb-3">
          {{ $t("user.suspension.suspend.warning", { name }) }}
        </v-alert>
        <v-progress-linear v-if="!consequences && !error" indeterminate />
        <v-simple-table v-if="consequences" dense class="consequences mb-3">
          <tbody>
            <tr v-for="row in consequences" :key="row.label">
              <td>{{ row.label }}</td>
              <td :class="row.ends ? 'error--text' : 'success--text'">
                <v-icon small :color="row.ends ? 'error' : 'success'">
                  {{ row.ends ? "mdi-close-circle" : "mdi-check-circle" }}
                </v-icon>
                {{
                  row.ends ? $t("user.suspension.consequences.ends") : row.stays
                }}
              </td>
            </tr>
          </tbody>
        </v-simple-table>
        <v-textarea
          v-model="reason"
          :label="$t('user.suspension.suspend.reason')"
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
          {{ $t("user.suspension.suspend.cancel") }}
        </v-btn>
        <v-btn
          color="error"
          :disabled="!reason.trim()"
          :loading="inProgress"
          @click="$emit('confirm', reason.trim())"
        >
          {{ $t("user.suspension.suspend.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * „<Name> für die ganze Instanz sperren?“ (ECCdigital/tickets#624, variant B
 * of ECCdigital/tickets#620): the consequences and a required reason.
 * Emits `confirm` with the trimmed reason or `cancel`; the parent suspends.
 */
export default {
  name: "UserSuspendConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    /** The rows of `suspensionConsequences`, `null` while they load. */
    consequences: {
      type: Array,
      default: null,
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
    open(isOpen) {
      if (isOpen) this.reason = "";
    },
  },
};
</script>

<style scoped>
/* The table of consequences wraps in the dialog's width. */
.consequences td {
  white-space: normal;
}
</style>
