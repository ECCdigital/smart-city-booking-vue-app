<template>
  <AdminLayout scroll-body class="blacklist">
    <v-card outlined class="section-card blacklist__card">
      <v-card-title class="section-header">
        <v-icon>mdi-email-off-outline</v-icon>
        <span>{{ $t("instance.blacklist.title") }}</span>
        <span
          v-if="!loading && !loadError"
          class="blacklist__count"
          data-test="blacklist-count"
        >
          {{ entries.length }}
        </span>
        <v-btn
          small
          depressed
          color="error"
          class="blacklist__add"
          data-test="blacklist-add"
          @click="openCreate"
        >
          <v-icon left small>mdi-plus</v-icon>
          {{ $t("instance.blacklist.add") }}
        </v-btn>
        <v-btn
          icon
          small
          class="blacklist__reload"
          :title="$t('instance.blacklist.reload')"
          :aria-label="$t('instance.blacklist.reload')"
          :disabled="loading"
          data-test="blacklist-reload"
          @click="load"
        >
          <v-icon small>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="blacklist__lead">{{ $t("instance.blacklist.lead") }}</p>
        <v-alert
          v-if="loadError"
          type="warning"
          text
          dense
          class="mb-0"
          data-test="blacklist-error"
        >
          {{ loadError }}
        </v-alert>
        <v-progress-linear v-else-if="loading" indeterminate />
        <p
          v-else-if="entries.length === 0"
          class="blacklist__empty"
          data-test="blacklist-empty"
        >
          {{ $t("instance.blacklist.empty") }}
        </p>
        <div v-else class="booking-rows">
          <div
            v-for="item in entries"
            :key="item.id"
            class="booking-row blacklist__row"
            data-test="blacklist-row"
          >
            <div class="booking-row__main">
              <div class="booking-row__title">
                <code>{{ item.value }}</code>
                <v-chip x-small outlined class="ml-1">
                  {{ $t(`instance.blacklist.origin.${item.origin}`) }}
                </v-chip>
              </div>
              <div v-if="item.reason" class="blacklist__reason">
                {{ item.reason }}
              </div>
              <div class="booking-row__subtitle">
                {{
                  $tc(
                    "instance.blacklist.suspended",
                    (item.suspendedUserIds || []).length
                  )
                }}
              </div>
            </div>
            <div class="blacklist__aside">
              <div class="blacklist__created">
                <div class="blacklist__created-at">
                  {{ dateText(item.createdAt) }}
                </div>
                <div v-if="item.createdBy" class="blacklist__created-by">
                  {{ item.createdBy }}
                </div>
              </div>
              <div class="blacklist__actions">
                <v-btn
                  small
                  outlined
                  class="blacklist__action"
                  data-test="blacklist-edit-reason"
                  @click="openDialog('reason', item)"
                >
                  <v-icon left small>mdi-pencil</v-icon>
                  {{ $t("instance.blacklist.edit-reason") }}
                </v-btn>
                <v-btn
                  small
                  outlined
                  color="error"
                  class="blacklist__action"
                  data-test="blacklist-remove"
                  @click="openDialog('remove', item)"
                >
                  <v-icon left small>mdi-delete</v-icon>
                  {{ $t("instance.blacklist.remove") }}
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <BlacklistCreateDialog
      :open="dialog === 'create'"
      :in-progress="inProgress"
      :save-error="error"
      @confirm="create"
      @cancel="closeDialog"
    />
    <BlacklistReasonDialog
      v-if="selected"
      :open="dialog === 'reason'"
      :entry="selected"
      :in-progress="inProgress"
      :error="error"
      @confirm="updateReason"
      @cancel="closeDialog"
    />
    <BlacklistRemoveConformationDialog
      v-if="selected"
      :open="dialog === 'remove'"
      :entry="selected"
      :in-progress="inProgress"
      :error="error"
      @confirm="remove"
      @cancel="closeDialog"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import FormatService from "@/services/FormatService";
import ApiBlacklistService from "@/services/api/ApiBlacklistService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import BlacklistCreateDialog from "@/components/Instance/Blacklist/BlacklistCreateDialog.vue";
import BlacklistReasonDialog from "@/components/Instance/Blacklist/BlacklistReasonDialog.vue";
import BlacklistRemoveConformationDialog from "@/components/Instance/Blacklist/BlacklistRemoveConformationDialog.vue";

/**
 * The blacklist of the instance (glossary „Blacklist“, in the UI
 * „Sperrliste“): the entries with time, person, origin and the
 * number of accounts they suspended; add with a preview, change the
 * reason, remove with „Mit entsperren“.
 *
 * Drawn as the review queue is: a section card of hairline rows, each entry's
 * date and author against the right edge over its actions.
 */
export default {
  name: "InstanceBlacklist",
  components: {
    AdminLayout,
    BlacklistCreateDialog,
    BlacklistReasonDialog,
    BlacklistRemoveConformationDialog,
  },
  data() {
    return {
      entries: [],
      loading: false,
      loadError: null,
      /** The open dialog: `create`, `reason`, `remove` or `null`. */
      dialog: null,
      selected: null,
      inProgress: false,
      error: null,
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    dateText(time) {
      return FormatService.date(time, "medium");
    },
    async load() {
      this.loading = true;
      this.loadError = null;
      try {
        const response = await ApiBlacklistService.getEntries();
        this.entries = response.data;
      } catch (error) {
        console.error(error);
        this.loadError = getApiErrorMessage(
          error,
          this.$t("instance.blacklist.load-error")
        );
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      this.openDialog("create", null);
    },
    openDialog(dialog, entry) {
      this.error = null;
      this.selected = entry;
      this.dialog = dialog;
    },
    closeDialog() {
      this.dialog = null;
    },
    /** Runs a change from a dialog, closes it and reads the list again. */
    async run(change, fallbackKey) {
      this.inProgress = true;
      this.error = null;
      try {
        await change();
        this.closeDialog();
        await this.load();
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(error, this.$t(fallbackKey));
      } finally {
        this.inProgress = false;
      }
    },
    create({ value, reason }) {
      return this.run(
        () => ApiBlacklistService.createEntry(value, reason),
        "instance.blacklist.create.error"
      );
    },
    updateReason(reason) {
      return this.run(
        () => ApiBlacklistService.updateReason(this.selected.id, reason),
        "instance.blacklist.reason-dialog.error"
      );
    },
    remove(unsuspend) {
      return this.run(
        () => ApiBlacklistService.removeEntry(this.selected.id, unsuspend),
        "instance.blacklist.remove-dialog.error"
      );
    },
  },
};
</script>

<style scoped>
.blacklist__card {
  margin-bottom: var(--scb-gap-cards);
}

/* The add button and the reload sit in the header strip without adding to
   its height. */
.blacklist__add {
  margin: -6px 0 -6px auto;
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

.blacklist__reload {
  margin: -6px -4px;
}

/* The number of entries: a quiet number beside the title, as the review
   queue counts its registers. */
.blacklist__count {
  min-width: 20px;
  padding: 0 var(--scb-space-2);
  border-radius: var(--scb-radius-pill);
  background: var(--scb-hover-tint-strong);
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  line-height: 18px;
  text-align: center;
  color: var(--scb-text);
}

.blacklist__lead,
.blacklist__empty {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.blacklist__row {
  align-items: flex-start;
  padding: var(--scb-space-4) 0;
}

/* Address, reason and suspended accounts, each with room above it. */
.blacklist__row .booking-row__main > * + * {
  margin-top: var(--scb-space-2);
}

.blacklist__reason {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
  line-height: var(--scb-line-height-base);
  overflow-wrap: anywhere;
}

/* Beside the entry: when and by whom over its actions, against the right
   edge. */
.blacklist__aside {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--scb-space-1);
}

.blacklist__created {
  text-align: right;
}

.blacklist__created-at {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  line-height: var(--scb-line-height-base);
}

.blacklist__created-by {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-base);
}

.blacklist__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-1);
}

.blacklist__action {
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

/* $scb-bp-xs of tokens.scss. */
@media (max-width: 599px) {
  .blacklist__row {
    flex-direction: column;
    align-items: stretch;
  }
  .blacklist__aside {
    align-items: flex-start;
  }
  .blacklist__created {
    text-align: left;
  }
  .blacklist__actions {
    justify-content: flex-start;
  }
}
</style>

<style>
/* The section body padding of the guided setup; the selector is the page's
   own, so the sheet is plain (not scoped). */
.blacklist .section-card > .v-card__text {
  padding: var(--scb-section-body-padding);
}
</style>
