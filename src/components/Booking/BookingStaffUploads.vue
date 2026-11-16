<template>
  <div class="booking-staff-uploads">
    <p class="text-body-2 mb-3">{{ $t("booking.staff-uploads.intro") }}</p>

    <div
      v-for="field in fields"
      :key="field.id"
      class="booking-staff-uploads__row"
      data-test="booking-staff-upload"
    >
      <div class="booking-staff-uploads__line">
        <div class="booking-staff-uploads__what">
          <span class="booking-staff-uploads__label" :title="field.hint">
            {{ field.label }}
          </span>
          <v-chip x-small label :outlined="!field.required" class="ml-2">
            {{
              field.required
                ? $t("checkout.customer-uploads.required")
                : $t("checkout.customer-uploads.optional")
            }}
          </v-chip>
          <span class="text-caption text--secondary ml-2">
            {{
              $t("checkout.customer-uploads.limits", {
                formats: formatsLabel(field.formats),
                size: field.maxFileSizeMb,
              })
            }}
          </span>
        </div>

        <div v-if="fileOf(field)" class="booking-staff-uploads__actions">
          <v-icon small class="mr-1">mdi-file-check-outline</v-icon>
          <span class="booking-staff-uploads__file text-body-2">
            {{ fileOf(field).name }}
          </span>
          <v-btn
            icon
            x-small
            :aria-label="$t('checkout.customer-uploads.remove')"
            data-test="booking-staff-upload-remove"
            @click="setFile(field, null)"
          >
            <v-icon x-small>mdi-close</v-icon>
          </v-btn>
        </div>
        <div v-else class="booking-staff-uploads__actions">
          <v-btn
            x-small
            outlined
            color="primary"
            data-test="booking-staff-upload-choose"
            @click="choose(field)"
          >
            <v-icon x-small left>mdi-upload</v-icon>
            {{ $t("booking.staff-uploads.choose") }}
          </v-btn>
        </div>
      </div>

      <div
        v-if="errors[field.id]"
        class="text-caption error--text mt-1"
        data-test="booking-staff-upload-error"
      >
        {{ errors[field.id] }}
      </div>

      <input
        :ref="`input-${field.id}`"
        type="file"
        class="d-none"
        :accept="acceptOf(field.formats)"
        :data-test="`booking-staff-upload-input-${field.id}`"
        @change="onFileChosen(field, $event)"
      />
    </div>
  </div>
</template>

<script>
import {
  acceptOf,
  checkoutUploadErrorKey,
  formatsLabel,
  precheckCheckoutUpload,
} from "@/utils/customerUploads";

/**
 * The proofs of a new manual booking, one compact row per upload field:
 * a file the staff has at hand, which goes with the booking and counts as
 * accepted.
 */
export default {
  name: "BookingStaffUploads",
  props: {
    /** The fields of `staffUploadFieldsOf`. */
    fields: { type: Array, required: true },
    /** The chosen files by field id, one each as `[File]`; `.sync`. */
    files: { type: Object, default: () => ({}) },
  },
  data() {
    return { errors: {} };
  },
  methods: {
    acceptOf,
    formatsLabel,
    fileOf(field) {
      return this.files?.[field.id]?.[0] ?? null;
    },
    choose(field) {
      this.errors = { ...this.errors, [field.id]: "" };
      const input = this.$refs[`input-${field.id}`];
      (Array.isArray(input) ? input[0] : input)?.click();
    },
    onFileChosen(field, event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const refusal = precheckCheckoutUpload(file, field, 0);
      if (refusal) {
        this.errors = {
          ...this.errors,
          [field.id]: this.$t(checkoutUploadErrorKey(refusal.code), {
            formats: formatsLabel(refusal.params.formats ?? field.formats),
            size: refusal.params.maxFileSizeMb ?? field.maxFileSizeMb,
            count: refusal.params.maxFiles ?? field.maxFiles,
          }),
        };
        return;
      }
      this.setFile(field, file);
    },
    setFile(field, file) {
      const files = { ...this.files };
      if (file) files[field.id] = [file];
      else delete files[field.id];
      this.$emit("update:files", files);
    },
  },
};
</script>

<style scoped>
.booking-staff-uploads__row {
  padding: var(--scb-space-2) 0;
}

.booking-staff-uploads__row + .booking-staff-uploads__row {
  border-top: 1px solid var(--scb-rule);
}

.booking-staff-uploads__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-2);
}

.booking-staff-uploads__what {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
}

.booking-staff-uploads__label {
  font-weight: var(--scb-font-weight-semibold);
}

.booking-staff-uploads__actions {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  min-width: 0;
}

.booking-staff-uploads__file {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
