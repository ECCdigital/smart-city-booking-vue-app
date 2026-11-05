<script>
import { mapGetters } from "vuex";
import bookableEditing from "@/mixins/bookableEditing";
import AppDialog from "@/components/commons/AppDialog.vue";
import BookableEditUploadFieldDialog from "@/components/Bookable/Edit/BookableEditUploadFieldDialog.vue";
import {
  customerUploadLimitsOf,
  customerUploadSettingsOf,
} from "@/utils/customerUploads";

/**
 * Upload-Felder: what bookers hand in as a customer upload (in the UI
 * „Nachweis“) at a booking of this bookable, a list of its own next to the
 * custom fields. A field is created and edited in its own dialog, as the
 * custom fields are; it keeps the id it got when it was added, so renaming
 * or deleting it keeps notes on bookings readable.
 * The editing page shows the card only while the tenant has customer
 * uploads enabled.
 */
export default {
  name: "BookableEditUploadFields",
  components: { AppDialog, BookableEditUploadFieldDialog },
  mixins: [bookableEditing],
  data() {
    return {
      dialogOpen: false,
      editingIndex: null,
      deletingIndex: null,
    };
  },
  computed: {
    ...mapGetters({
      currentTenant: "tenants/currentTenant",
      instance: "instance/instance",
    }),
    fields() {
      return this.bookable.uploadFieldDefinitions || [];
    },
    tenantFormats() {
      return customerUploadSettingsOf(this.currentTenant).formats;
    },
    limits() {
      return customerUploadLimitsOf(this.instance);
    },
    editingField() {
      return this.editingIndex === null ? null : this.fields[this.editingIndex];
    },
    deletingLabel() {
      const field = this.fields[this.deletingIndex];
      return field ? this.fieldTitle(field) : "";
    },
  },
  methods: {
    replaceFields(fields) {
      this.patch({ uploadFieldDefinitions: fields });
    },
    openCreate() {
      this.editingIndex = null;
      this.dialogOpen = true;
    },
    openEdit(index) {
      this.editingIndex = index;
      this.dialogOpen = true;
    },
    closeDialog() {
      this.dialogOpen = false;
    },
    onSave(field) {
      this.replaceFields(
        this.editingIndex === null
          ? [...this.fields, field]
          : this.fields.map((entry, i) =>
              i === this.editingIndex ? field : entry
            )
      );
      this.dialogOpen = false;
    },
    askRemove(index) {
      this.deletingIndex = index;
    },
    remove() {
      this.replaceFields(
        this.fields.filter((_, i) => i !== this.deletingIndex)
      );
      this.deletingIndex = null;
    },
    fieldTitle(field) {
      return (
        String(field.label || "").trim() ||
        this.$t("bookable.uploadFields.untitled")
      );
    },
    formatsText(field) {
      return (field.formats || [])
        .map((format) => this.$t(`tenant.customerUploads.formats.${format}`))
        .join(", ");
    },
  },
};
</script>

<template>
  <div>
    <v-row class="mb-1">
      <v-col cols="12" md="8">
        <p class="text-body-2 text--secondary mb-0">
          {{ $t("bookable.uploadFields.intro") }}
        </p>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-end align-center">
        <v-btn color="primary" data-test="upload-field-add" @click="openCreate">
          <v-icon left>mdi-plus</v-icon>
          {{ $t("bookable.uploadFields.add") }}
        </v-btn>
      </v-col>
    </v-row>

    <v-alert
      type="info"
      dense
      text
      class="mb-4"
      data-test="upload-fields-limits"
    >
      {{
        $t("bookable.uploadFields.limits", {
          fileSize: limits.maxFileSizeMb,
          files: limits.maxFilesPerBooking,
          totalSize: limits.maxTotalSizeMbPerBooking,
        })
      }}
    </v-alert>

    <v-card
      v-if="fields.length === 0"
      outlined
      class="section-card pa-6 text-center"
      data-test="upload-fields-empty"
    >
      <v-icon size="48" color="grey lighten-1" class="mb-3">
        mdi-file-upload-outline
      </v-icon>
      <div class="text-subtitle-1 grey--text">
        {{ $t("bookable.uploadFields.empty") }}
      </div>
    </v-card>

    <v-card v-else outlined class="section-card">
      <template v-for="(field, index) in fields">
        <v-divider v-if="index > 0" :key="`divider-${field.id}`" />
        <div
          :key="field.id"
          class="upload-field-row d-flex align-center px-4 py-2"
          :data-test="`upload-field-${index}`"
        >
          <v-icon small class="mr-3">mdi-file-document-outline</v-icon>
          <div class="flex-grow-1">
            <div class="d-flex align-center flex-wrap">
              <span class="body-2 font-weight-medium mr-2">
                {{ fieldTitle(field) }}
              </span>
              <v-chip v-if="field.required" x-small label class="mr-1">
                {{ $t("bookable.uploadFields.required") }}
              </v-chip>
              <v-chip
                v-if="field.category === 'sensitive'"
                x-small
                label
                color="warning"
                text-color="white"
                class="mr-1"
              >
                {{ $t("bookable.uploadFields.categories.sensitive") }}
              </v-chip>
              <v-chip x-small label outlined>
                {{ $t(`bookable.uploadFields.timings.${field.timing}`) }}
              </v-chip>
            </div>
            <div class="text-caption text--secondary">
              {{ formatsText(field) }} ·
              {{
                $tc("bookable.uploadFields.files", field.maxFiles, {
                  count: field.maxFiles,
                })
              }}
            </div>
          </div>
          <v-tooltip bottom>
            <template #activator="{ on, attrs }">
              <v-btn
                icon
                small
                v-bind="attrs"
                data-test="upload-field-edit"
                :aria-label="$t('bookable.uploadFields.edit')"
                v-on="on"
                @click="openEdit(index)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>{{ $t("bookable.uploadFields.edit") }}</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template #activator="{ on, attrs }">
              <v-btn
                icon
                small
                color="error"
                v-bind="attrs"
                data-test="upload-field-remove"
                :aria-label="$t('bookable.uploadFields.remove')"
                v-on="on"
                @click="askRemove(index)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
            <span>{{ $t("bookable.uploadFields.remove") }}</span>
          </v-tooltip>
        </div>
      </template>
    </v-card>

    <BookableEditUploadFieldDialog
      :open="dialogOpen"
      :field="editingField"
      :tenant-formats="tenantFormats"
      :limits="limits"
      @save="onSave"
      @close="closeDialog"
    />

    <AppDialog
      :open="deletingIndex !== null"
      :title="$t('bookable.uploadFields.remove-title')"
      icon="mdi-delete-outline"
      color="error"
      max-width="420"
      data-test="upload-field-remove-dialog"
      @close="deletingIndex = null"
    >
      {{ $t("bookable.uploadFields.remove-text", { label: deletingLabel }) }}
      <template #actions>
        <v-btn outlined @click="deletingIndex = null">
          {{ $t("bookable.uploadFields.cancel") }}
        </v-btn>
        <v-btn
          color="error"
          depressed
          data-test="upload-field-remove-confirm"
          @click="remove"
        >
          {{ $t("bookable.uploadFields.remove") }}
        </v-btn>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.section-card {
  border-radius: var(--scb-radius-surface) !important;
}

.upload-field-row {
  min-height: var(--scb-row-height);
}
</style>
