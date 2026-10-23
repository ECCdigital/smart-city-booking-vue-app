<template>
  <AdminLayout>
    <v-card outlined class="mb-16">
      <v-card-title class="d-flex flex-wrap">
        <v-icon class="mr-2">mdi-email-off-outline</v-icon>
        {{ $t("instance.blacklist.title") }}
        <v-spacer />
        <v-btn
          icon
          small
          class="mr-2"
          :title="$t('instance.blacklist.reload')"
          :aria-label="$t('instance.blacklist.reload')"
          :disabled="loading"
          @click="load"
        >
          <v-icon small>mdi-refresh</v-icon>
        </v-btn>
        <v-btn color="error" @click="openCreate">
          <v-icon left small>mdi-plus</v-icon>
          {{ $t("instance.blacklist.add") }}
        </v-btn>
      </v-card-title>
      <v-card-text>
        <AppList
          :columns="columns"
          :items="entries"
          :loading="loading"
          :error-message="loadError || ''"
          :empty-text="$t('instance.blacklist.empty')"
          :lead="$t('instance.blacklist.lead')"
          @retry="load"
        >
          <template #cell.value="{ item }">
            <code>{{ item.value }}</code>
          </template>
          <template #cell.createdAt="{ item }">
            {{ dateText(item.createdAt) }}
          </template>
          <template #cell.origin="{ item }">
            {{ $t(`instance.blacklist.origin.${item.origin}`) }}
          </template>
          <template #cell.suspended="{ item }">
            {{ (item.suspendedUserIds || []).length }}
          </template>
          <template #cell.actions="{ item }">
            <v-btn
              icon
              small
              :title="$t('instance.blacklist.edit-reason')"
              :aria-label="$t('instance.blacklist.edit-reason')"
              @click="openDialog('reason', item)"
            >
              <v-icon small>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              small
              :title="$t('instance.blacklist.remove')"
              :aria-label="$t('instance.blacklist.remove')"
              @click="openDialog('remove', item)"
            >
              <v-icon small>mdi-delete</v-icon>
            </v-btn>
          </template>
        </AppList>
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
import AppList from "@/components/commons/AppList.vue";
import FormatService from "@/services/FormatService";
import ApiBlacklistService from "@/services/api/ApiBlacklistService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import BlacklistCreateDialog from "@/components/Instance/Blacklist/BlacklistCreateDialog.vue";
import BlacklistReasonDialog from "@/components/Instance/Blacklist/BlacklistReasonDialog.vue";
import BlacklistRemoveConformationDialog from "@/components/Instance/Blacklist/BlacklistRemoveConformationDialog.vue";

/**
 * The blacklist of the instance (glossary „Blacklist“):
 * the entries with time, person, origin and the
 * number of accounts they suspended; add with a preview, change the
 * reason, remove with „Mit entsperren“.
 */
export default {
  name: "InstanceBlacklist",
  components: {
    AdminLayout,
    AppList,
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
  computed: {
    columns() {
      const column = (key, width, align) => ({
        key,
        label: this.$t(`instance.blacklist.headers.${key}`),
        width,
        align,
      });
      return [
        column("value", "minmax(160px, 1.5fr)"),
        column("reason", "minmax(140px, 2fr)"),
        column("createdAt", "100px"),
        column("createdBy", "minmax(120px, 1fr)"),
        column("origin", "90px"),
        column("suspended", "90px", "end"),
        column("actions", "88px", "end"),
      ];
    },
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
