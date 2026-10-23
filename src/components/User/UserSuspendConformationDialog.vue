<template>
  <v-dialog :value="open" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break flex-nowrap align-start">
        <v-icon color="error" class="mr-2">mdi-cancel</v-icon>
        <span>{{ $t("user.suspension.suspend.title", { name }) }}</span>
      </v-card-title>
      <v-card-text>
        <v-alert type="error" text dense class="mb-3">
          {{ $t("user.suspension.suspend.warning", { name }) }}
        </v-alert>
        <v-progress-linear v-if="!preview && !error" indeterminate />
        <v-simple-table v-if="consequences" dense class="consequences mb-3">
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
        <v-alert
          v-for="note in reportNotes"
          :key="note.tenantId"
          type="info"
          text
          dense
          class="mb-3"
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
            <div class="text-caption grey--text ml-8">{{ blacklistHint }}</div>
          </template>
        </template>
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
          @click="confirm"
        >
          {{ $t("user.suspension.suspend.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  suspensionBlacklistHint,
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
    blacklistHint() {
      return suspensionBlacklistHint(this.blacklist);
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
