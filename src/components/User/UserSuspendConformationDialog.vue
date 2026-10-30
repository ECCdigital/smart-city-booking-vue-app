<template>
  <AppDialog
    :open="open"
    icon="mdi-cancel"
    color="error"
    max-width="720"
    :title="$t('user.suspension.suspend.title', { name })"
    :subtitle="address"
    :busy="inProgress"
    @close="$emit('cancel')"
  >
    <v-alert type="error" text dense class="mb-4">
      {{ $t("user.suspension.suspend.warning", { name }) }}
    </v-alert>
    <v-progress-linear v-if="!preview && !error" indeterminate class="mb-4" />
    <AppDialogSection
      v-if="consequences"
      :title="$t('user.suspension.consequences.title')"
    >
      <v-simple-table dense class="consequences">
        <colgroup>
          <col class="consequences__what" />
          <col class="consequences__effect" />
        </colgroup>
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
    </AppDialogSection>
    <v-alert
      v-for="note in reportNotes"
      :key="note.tenantId"
      type="info"
      text
      dense
      class="mb-4"
      data-test="suspend-report-note"
    >
      {{ note.text }} {{ note.owners }}
    </v-alert>
    <v-textarea
      v-model="reason"
      :label="$t('user.suspension.suspend.reason')"
      outlined
      rows="2"
      auto-grow
      hide-details="auto"
    />
    <template v-if="preview">
      <div v-if="preview.blacklistEntry" class="text-body-2 mt-3">
        {{
          $t("user.suspension.suspend.on-blacklist", {
            address,
            entry: preview.blacklistEntry.value,
          })
        }}
      </div>
      <template v-else>
        <v-checkbox
          v-model="blacklist"
          :label="$t('user.suspension.suspend.blacklist', { address })"
          hide-details
          class="mt-2"
        />
        <div class="text-caption grey--text ml-8">
          {{ $t("user.suspension.suspend.blacklist-hint") }}
        </div>
      </template>
    </template>
    <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
      {{ error }}
    </v-alert>

    <template #actions>
      <v-btn outlined :disabled="inProgress" @click="$emit('cancel')">
        {{ $t("user.suspension.suspend.cancel") }}
      </v-btn>
      <v-btn
        color="error"
        depressed
        :disabled="!reason.trim()"
        :loading="inProgress"
        @click="confirm"
      >
        {{ $t("user.suspension.suspend.confirm") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
import AppDialogSection from "@/components/commons/AppDialogSection.vue";
import {
  suspensionConsequences,
  suspensionReportNotes,
} from "@/utils/userSuspension";

/**
 * „<Name> für die ganze Instanz sperren?“: the consequences and a required
 * reason. The
 * checkbox „auch auf die Blacklist“, checked from the start, switches the
 * rows of guest and registration; an entry that
 * already hits the address replaces it. The open reports the suspension
 * settles are named with the tenant owners who get a mail.
 * Emits `confirm` with
 * `{ reason, blacklist }` or `cancel`; the parent suspends.
 */
export default {
  name: "UserSuspendConformationDialog",
  components: { AppDialog, AppDialogSection },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    /** The user's address, as the checkbox names it. */
    address: {
      type: String,
      required: true,
    },
    /** The answer of the suspension preview, `null` while it loads. */
    preview: {
      type: Object,
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
      blacklist: true,
    };
  },
  computed: {
    /** On the blacklist after the suspension, by the checkbox or already. */
    blacklisted() {
      return !!this.preview?.blacklistEntry || this.blacklist;
    },
    consequences() {
      return this.preview
        ? suspensionConsequences(this.preview, {
            blacklisted: this.blacklisted,
          })
        : null;
    },
    reportNotes() {
      return suspensionReportNotes(this.preview?.openReports);
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.reason = "";
        this.blacklist = true;
      }
    },
  },
  methods: {
    confirm() {
      this.$emit("confirm", {
        reason: this.reason.trim(),
        // Only a checkbox shown counts; an entry that already hits the
        // address needs no second one.
        blacklist:
          !!this.preview && !this.preview.blacklistEntry && this.blacklist,
      });
    },
  },
};
</script>

<style scoped>
/*
 * The table of consequences wraps in the dialog's width, with fixed
 * columns: the checkbox swaps the texts, not the layout.
 */
.consequences ::v-deep table {
  table-layout: fixed;
}
.consequences__what {
  width: 55%;
}
.consequences__effect {
  width: 45%;
}
.consequences td {
  white-space: normal;
}
</style>
