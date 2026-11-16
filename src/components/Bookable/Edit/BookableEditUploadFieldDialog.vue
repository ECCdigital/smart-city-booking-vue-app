<script>
import AppDialog from "@/components/commons/AppDialog.vue";
import {
  UPLOAD_FIELD_CATEGORIES,
  UPLOAD_FIELD_TIMINGS,
  newUploadField,
  orderedFormats,
  uploadFieldIssues,
} from "@/utils/customerUploads";

const COPY = "bookable.uploadFields";

/**
 * Creates or edits one upload field of a bookable, as „Feld hinzufügen“
 * does for the custom fields. It works on a copy and hands the field on
 * only with „Anlegen“ or „Speichern“; an edited field keeps its id. Without `field` it starts a new one with every format of the
 * tenant.
 */
export default {
  name: "BookableEditUploadFieldDialog",
  components: { AppDialog },
  props: {
    open: { type: Boolean, required: true },
    /** The field to edit, or null for a new one. */
    field: { type: Object, default: null },
    tenantFormats: { type: Array, required: true },
    /** Whether the bookable releases its bookings by itself. */
    autoCommit: { type: Boolean, default: false },
  },
  data() {
    return {
      local: newUploadField(this.tenantFormats),
      sensitiveHint: false,
    };
  },
  computed: {
    isEdit() {
      return !!this.field;
    },
    issues() {
      return uploadFieldIssues(this.local, {
        tenantFormats: this.tenantFormats,
      });
    },
    canSave() {
      return Object.keys(this.issues).length === 0;
    },
    formatOptions() {
      return this.tenantFormats.map((format) => ({
        value: format,
        text: this.$t(`tenant.customerUploads.formats.${format}`),
      }));
    },
    categoryOptions() {
      return UPLOAD_FIELD_CATEGORIES.map((value) => ({
        value,
        text: this.$t(`${COPY}.categories.${value}`),
      }));
    },
    timingOptions() {
      return UPLOAD_FIELD_TIMINGS.map((value) => ({
        value,
        text: this.$t(`${COPY}.timings.${value}`),
        hint: this.$t(`${COPY}.timing-hints.${value}`),
      }));
    },
    sensitiveHintShown() {
      return this.sensitiveHint || this.local.category === "sensitive";
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        if (!open) return;
        this.local = this.field
          ? JSON.parse(JSON.stringify(this.field))
          : newUploadField(this.tenantFormats);
        this.sensitiveHint = false;
      },
    },
  },
  methods: {
    rule(name) {
      return [
        () => {
          const key = this.issues[name];
          return key ? this.$t(key) : true;
        },
      ];
    },
    setNumber(name, value) {
      const empty = value === "" || value === null || value === undefined;
      this.local = { ...this.local, [name]: empty ? null : Number(value) };
    },
    setTiming(timing) {
      this.local = {
        ...this.local,
        timing,
        // Only a field after the release has a deadline of its own.
        ...(timing !== "afterConfirmation" && {
          deadlineDaysBeforeStart: null,
        }),
      };
    },
    setFormats(formats) {
      this.local = { ...this.local, formats: orderedFormats(formats) };
    },
    save() {
      if (!this.canSave) return;
      this.$emit("save", JSON.parse(JSON.stringify(this.local)));
    },
  },
};
</script>

<template>
  <AppDialog
    :open="open"
    :title="
      isEdit
        ? $t('bookable.uploadFields.edit')
        : $t('bookable.uploadFields.new')
    "
    icon="mdi-file-upload-outline"
    max-width="750"
    data-test="upload-field-dialog"
    @close="$emit('close')"
  >
    <v-text-field
      data-test="upload-field-label"
      :value="local.label"
      :label="$t('bookable.uploadFields.label')"
      :rules="rule('label')"
      background-color="accent"
      filled
      dense
      @input="local = { ...local, label: $event }"
    />
    <v-textarea
      data-test="upload-field-hint"
      :value="local.hint"
      :label="$t('bookable.uploadFields.hint')"
      :hint="$t('bookable.uploadFields.hint-hint')"
      persistent-hint
      background-color="accent"
      filled
      dense
      rows="2"
      auto-grow
      @input="local = { ...local, hint: $event }"
    />

    <v-switch
      data-test="upload-field-required"
      :input-value="local.required"
      color="primary"
      hide-details
      class="mt-3 upload-field-required"
      @change="local = { ...local, required: !!$event }"
    >
      <template #label>
        <div>
          <div>{{ $t("bookable.uploadFields.required-label") }}</div>
          <div
            class="text-caption text--secondary"
            data-test="upload-field-required-hint"
          >
            {{ $t("bookable.uploadFields.required-hint") }}
          </div>
        </div>
      </template>
    </v-switch>

    <div class="text-subtitle-2 mt-4 mb-1">
      {{ $t("bookable.uploadFields.formats") }}
    </div>
    <div class="d-flex flex-wrap">
      <v-checkbox
        v-for="option in formatOptions"
        :key="option.value"
        :data-test="`upload-field-format-${option.value}`"
        :input-value="local.formats"
        :value="option.value"
        :label="option.text"
        :rules="rule('formats')"
        :hide-details="!issues.formats"
        dense
        class="mr-6 mt-0"
        @change="setFormats"
      />
    </div>

    <div class="text-subtitle-2 mt-4 mb-1">
      {{ $t("bookable.uploadFields.category") }}
    </div>
    <v-radio-group
      :value="local.category"
      row
      dense
      hide-details
      class="mt-0"
      @change="local = { ...local, category: $event }"
    >
      <v-radio
        v-for="option in categoryOptions"
        :key="option.value"
        :data-test="`upload-field-category-${option.value}`"
        :value="option.value"
      >
        <template #label>
          {{ option.text }}
          <v-btn
            v-if="option.value === 'sensitive'"
            icon
            x-small
            class="ml-1"
            data-test="upload-field-sensitive-info"
            :aria-label="$t('bookable.uploadFields.sensitive-info')"
            :title="$t('bookable.uploadFields.sensitive-info')"
            @click.stop.prevent="sensitiveHint = !sensitiveHint"
          >
            <v-icon small>mdi-information-outline</v-icon>
          </v-btn>
        </template>
      </v-radio>
    </v-radio-group>
    <v-alert
      v-if="sensitiveHintShown"
      type="warning"
      dense
      text
      class="mt-2 mb-0 text-caption"
      data-test="upload-field-sensitive-warning"
    >
      {{ $t("bookable.uploadFields.sensitive-warning") }}
    </v-alert>

    <div class="text-subtitle-2 mt-4 mb-1">
      {{ $t("bookable.uploadFields.timing") }}
    </div>
    <v-radio-group
      :value="local.timing"
      dense
      hide-details
      class="mt-0 upload-field-timings"
      @change="setTiming"
    >
      <v-radio
        v-for="option in timingOptions"
        :key="option.value"
        :data-test="`upload-field-timing-${option.value}`"
        :value="option.value"
        class="align-start"
      >
        <template #label>
          <div class="upload-field-timing">
            <div class="text-body-2">{{ option.text }}</div>
            <div
              class="text-caption text--secondary"
              :data-test="`upload-field-timing-hint-${option.value}`"
            >
              {{ option.hint }}
            </div>
          </div>
        </template>
      </v-radio>
    </v-radio-group>
    <v-alert
      v-if="local.timing === 'beforeRelease' && autoCommit"
      type="warning"
      dense
      text
      class="mt-3 mb-0 text-caption"
      data-test="upload-field-timing-auto-commit"
    >
      {{ $t("bookable.uploadFields.timing-auto-commit") }}
    </v-alert>
    <v-text-field
      v-if="local.timing === 'afterConfirmation'"
      data-test="upload-field-deadline"
      :value="local.deadlineDaysBeforeStart"
      :label="$t('bookable.uploadFields.deadline')"
      :hint="$t('bookable.uploadFields.deadline-hint')"
      persistent-hint
      :suffix="$t('tenant.customerUploads.days')"
      type="number"
      min="0"
      :rules="rule('deadlineDaysBeforeStart')"
      background-color="accent"
      filled
      dense
      class="mt-3"
      @input="setNumber('deadlineDaysBeforeStart', $event)"
    />

    <template #actions>
      <v-btn outlined @click="$emit('close')">
        {{ $t("bookable.uploadFields.cancel") }}
      </v-btn>
      <v-btn
        color="primary"
        depressed
        :disabled="!canSave"
        data-test="upload-field-save"
        @click="save"
      >
        <v-icon left small>
          {{ isEdit ? "mdi-content-save" : "mdi-plus" }}
        </v-icon>
        {{
          isEdit
            ? $t("bookable.uploadFields.save")
            : $t("bookable.uploadFields.create")
        }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<style scoped>
/* The switch sits on the first line of its label, the hint below it. */
.upload-field-required >>> .v-input__slot {
  align-items: flex-start;
}

/* Each timing below the other, its hint under its title. */
.upload-field-timings >>> .v-radio {
  align-items: flex-start;
  margin-bottom: var(--scb-space-2);
}

.upload-field-timings >>> .v-radio .v-input--selection-controls__input {
  margin-top: 0;
}
</style>
