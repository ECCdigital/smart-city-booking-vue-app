<template>
  <section v-if="fields.length > 0" class="customer-uploads mt-5">
    <p>{{ $t("checkout.customer-uploads.intro") }}</p>

    <div
      v-for="field in fields"
      :key="field.id"
      class="customer-uploads__field mb-3 pa-3"
    >
      <div class="d-flex flex-wrap align-center">
        <span class="mr-2">
          {{ field.label }}<span v-if="field.required">*</span>
        </span>
        <v-chip x-small :outlined="!field.required">
          {{
            field.required
              ? $t("checkout.customer-uploads.required")
              : $t("checkout.customer-uploads.optional")
          }}
        </v-chip>
      </div>
      <div v-if="field.hint" class="text-body-2 mt-1">{{ field.hint }}</div>

      <div
        v-for="(file, index) in chosenOf(field)"
        :key="`${field.id}-${index}-${file.name}`"
        class="d-flex align-center mt-2 text-body-2"
      >
        <v-icon small left>mdi-file-check-outline</v-icon>
        <span class="text-truncate">{{ file.name }}</span>
        <span class="grey--text ml-1">· {{ sizeLabel(file.size) }}</span>
        <v-spacer></v-spacer>
        <v-btn text x-small color="error" @click="removeFile(field, index)">
          <v-icon x-small left>mdi-delete</v-icon>
          {{ $t("checkout.customer-uploads.remove") }}
        </v-btn>
      </div>

      <div
        v-if="chosenOf(field).length < field.maxFiles"
        class="customer-uploads__drop mt-2 pa-3 text-center"
        :class="{ 'customer-uploads__drop--over': dragOver === field.id }"
        @dragenter.prevent="dragOver = field.id"
        @dragover.prevent="dragOver = field.id"
        @dragleave="onDragLeave(field, $event)"
        @drop.prevent="onDrop(field, $event)"
      >
        <div class="text-body-2">
          {{ $t("checkout.customer-uploads.drop-hint") }}
        </div>
        <v-btn
          small
          outlined
          color="primary"
          class="mt-1"
          @click="choose(field)"
        >
          <v-icon small left>mdi-upload</v-icon>
          {{ $t("checkout.customer-uploads.choose") }}
        </v-btn>
        <div class="text-caption grey--text mt-1">
          {{
            $t("checkout.customer-uploads.limits", {
              formats: formatsLabel(field.formats),
              size: field.maxFileSizeMb,
            })
          }}
          <template v-if="field.maxFiles > 1">
            ·
            {{
              $t("checkout.customer-uploads.max-files", {
                count: field.maxFiles,
              })
            }}
          </template>
        </div>
      </div>

      <div v-if="field.consentText" class="text-body-2 mt-2">
        {{ field.consentText }}
      </div>

      <input
        :ref="`input-${field.id}`"
        type="file"
        class="d-none"
        :accept="acceptOf(field.formats)"
        :multiple="field.maxFiles > 1"
        @change="onFileChosen(field, $event)"
      />

      <div v-if="errorOf(field)" class="text-body-2 error--text mt-2">
        {{ errorOf(field) }}
      </div>
    </div>
  </section>
</template>

<script>
import {
  acceptOf,
  checkoutUploadErrorKey,
  formatsLabel,
  precheckCheckoutUpload,
} from "@/utils/customerUploads";

/**
 * The upload fields "in the checkout" of the legacy checkout
 * (in the UI „Nachweise“), directly above the
 * agreements and in their type: what each field asks for - label, hint,
 * consent text, required or optional, formats, size and number - and the
 * files chosen for it, picked or dropped. Size, format and number are
 * checked before a file is taken; the files go with the checkout request.
 */
export default {
  name: "CheckoutCustomerUploads",

  props: {
    /** The fields of `checkoutUploadFieldsOf`. */
    fields: {
      type: Array,
      default: () => [],
    },
    /** The chosen files by field id; `.sync`. */
    files: {
      type: Object,
      default: () => ({}),
    },
  },

  data() {
    return {
      errors: {},
      // The field a file is dragged over, for the highlight of its zone.
      dragOver: null,
    };
  },

  methods: {
    acceptOf,
    formatsLabel,

    chosenOf(field) {
      return this.files?.[field.id] ?? [];
    },

    sizeLabel(bytes) {
      if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      }
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    },

    errorOf(field) {
      return this.errors[field.id] || "";
    },

    setError(field, message) {
      this.errors = { ...this.errors, [field.id]: message };
    },

    choose(field) {
      this.setError(field, "");
      const input = this.$refs[`input-${field.id}`];
      (Array.isArray(input) ? input[0] : input)?.click();
    },

    /**
     * Takes the files one by one, each checked against what the field holds
     * by then; the first refusal stops and is shown.
     */
    addFiles(field, list) {
      const chosen = [...this.chosenOf(field)];
      let message = "";
      for (const file of list) {
        const refusal = precheckCheckoutUpload(file, field, chosen.length);
        if (refusal) {
          message = this.$t(checkoutUploadErrorKey(refusal.code), {
            formats: formatsLabel(refusal.params.formats ?? field.formats),
            size: refusal.params.maxFileSizeMb ?? field.maxFileSizeMb,
            count: refusal.params.maxFiles ?? field.maxFiles,
          });
          break;
        }
        chosen.push(file);
      }
      this.setError(field, message);
      if (chosen.length !== this.chosenOf(field).length) {
        this.$emit("update:files", { ...this.files, [field.id]: chosen });
      }
    },

    onFileChosen(field, event) {
      const list = [...(event.target.files ?? [])];
      event.target.value = "";
      if (list.length > 0) this.addFiles(field, list);
    },

    onDrop(field, event) {
      this.dragOver = null;
      const list = [...(event.dataTransfer?.files ?? [])];
      if (list.length > 0) this.addFiles(field, list);
    },

    onDragLeave(field, event) {
      // Only when the pointer leaves the zone, not when it moves onto a child.
      if (
        !event.currentTarget.contains(event.relatedTarget) &&
        this.dragOver === field.id
      ) {
        this.dragOver = null;
      }
    },

    removeFile(field, index) {
      this.setError(field, "");
      this.$emit("update:files", {
        ...this.files,
        [field.id]: this.chosenOf(field).filter((_, i) => i !== index),
      });
    },
  },
};
</script>

<style scoped lang="scss">
.customer-uploads__field {
  border: thin solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
}

.customer-uploads__drop {
  border: thin dashed var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  transition: background-color var(--scb-motion-fast),
    border-color var(--scb-motion-fast);

  &--over {
    border-color: var(--v-primary-base);
    background-color: var(--scb-selected-tint);
  }
}
</style>
