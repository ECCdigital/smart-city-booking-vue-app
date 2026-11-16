<template>
  <div v-if="fields.length > 0">
    <h2 class="mb-2">{{ $t("checkout.customer-uploads.title") }}</h2>
    <p class="text-body-2 mb-6">
      {{
        $t(
          guest
            ? "checkout.customer-uploads.group.intro-guest"
            : "checkout.customer-uploads.group.intro"
        )
      }}
    </p>

    <v-card v-for="field in fields" :key="field.id" outlined class="mb-4 pa-4">
      <div class="d-flex flex-wrap align-center">
        <strong class="mr-2">{{ field.label }}</strong>
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
        v-for="upload in uploadsOf(field)"
        :key="upload.key"
        class="checkout-group-uploads__file mt-3"
      >
        <div class="d-flex align-center text-body-2">
          <v-icon small left>mdi-file-check-outline</v-icon>
          <span class="text-truncate">{{ upload.file.name }}</span>
          <span class="grey--text ml-1"
            >· {{ sizeLabel(upload.file.size) }}</span
          >
          <v-spacer></v-spacer>
          <v-btn text x-small color="error" @click="removeUpload(upload)">
            <v-icon x-small left>mdi-delete</v-icon>
            {{ $t("checkout.customer-uploads.remove") }}
          </v-btn>
        </div>
        <v-select
          :key="`${upload.key}-${resets}`"
          :value="guest ? upload.attempts[0] : upload.attempts"
          :items="memberItems(field, upload)"
          :multiple="!guest"
          :label="
            $t(
              guest
                ? 'checkout.customer-uploads.group.for-one'
                : 'checkout.customer-uploads.group.for'
            )
          "
          :small-chips="!guest"
          dense
          outlined
          hide-details
          class="checkout-group-uploads__members mt-2"
          @change="setAttempts(upload, $event)"
        ></v-select>
      </div>

      <div
        v-if="missingOf(field).length > 0"
        class="checkout-group-uploads__missing text-caption error--text mt-2"
      >
        {{
          $t("checkout.customer-uploads.group.missing", {
            members: missingOf(field).join(", "),
          })
        }}
      </div>

      <div v-if="hasRoom(field)" class="mt-3">
        <v-btn small outlined color="primary" @click="choose(field)">
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
              $t("checkout.customer-uploads.group.max-files", {
                count: field.maxFiles,
              })
            }}
          </template>
        </div>
      </div>

      <div v-if="field.consentText" class="text-caption mt-2">
        {{ field.consentText }}
      </div>

      <input
        :ref="`input-${field.id}`"
        type="file"
        class="d-none"
        :accept="acceptOf(field.formats)"
        @change="onFileChosen(field, $event)"
      />

      <v-alert
        v-if="errorOf(field)"
        dense
        outlined
        type="error"
        class="mt-3 mb-0"
      >
        {{ errorOf(field) }}
      </v-alert>
    </v-card>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";
import {
  acceptOf,
  checkoutUploadErrorKey,
  defaultGroupAttempts,
  formatsLabel,
  groupFilesAt,
  groupUploadKey,
  missingGroupCheckoutUploads,
  precheckGroupCheckoutUpload,
} from "@/utils/customerUploads";

/**
 * The upload fields "in the checkout" of a series
 * (in the UI „Nachweise“): the customer hands a file in once and chooses
 * the bookings of the series it counts for, each with the field the file
 * was chosen for. A guest has no choice: each file is for one booking.
 * Size, format and the number at each booking are checked before a file
 * is taken; the files go with the group checkout.
 */
export default {
  name: "CheckoutGroupCustomerUploads",

  props: {
    /** The fields of `checkoutUploadFieldsOf`, the same at every booking. */
    fields: {
      type: Array,
      default: () => [],
    },
    /** The booking attempts of the series, in their order. */
    members: {
      type: Array,
      default: () => [],
    },
    /** The files of the group, each `{ key, fieldId, file, attempts }`. */
    uploads: {
      type: Array,
      default: () => [],
    },
    /** Whether nobody is signed in: no choice of several bookings. */
    guest: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      errors: {},
      // Drawn anew where a choice of no booking is turned back.
      resets: 0,
    };
  },

  methods: {
    acceptOf,
    formatsLabel,

    uploadsOf(field) {
      return this.uploads.filter((upload) => upload.fieldId === field.id);
    },

    memberLabel(attempt) {
      const member = this.members[attempt];
      return member?.timeBegin
        ? this.$t("checkout.customer-uploads.group.member", {
            n: attempt + 1,
            date: FormatService.dateTime(member.timeBegin),
          })
        : this.$t("checkout.customer-uploads.group.member-undated", {
            n: attempt + 1,
          });
    },

    /** The bookings to choose for a file: those whose field is full, off. */
    memberItems(field, upload) {
      const others = this.uploads.filter((u) => u.key !== upload.key);
      return this.members.map((_, attempt) => ({
        text: this.memberLabel(attempt),
        value: attempt,
        disabled:
          !upload.attempts.includes(attempt) &&
          groupFilesAt(others, attempt, field.id).length >= field.maxFiles,
      }));
    },

    missingOf(field) {
      return missingGroupCheckoutUploads(
        [field],
        this.uploads,
        this.members.length
      ).map(({ attempt }) => this.memberLabel(attempt));
    },

    hasRoom(field) {
      return (
        defaultGroupAttempts(field, this.uploads, this.members.length, false)
          .length > 0
      );
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

    onFileChosen(field, event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const attempts = defaultGroupAttempts(
        field,
        this.uploads,
        this.members.length,
        this.guest
      );
      const refusal = precheckGroupCheckoutUpload(
        file,
        field,
        attempts,
        this.uploads
      );
      if (refusal) {
        this.setError(
          field,
          this.$t(checkoutUploadErrorKey(refusal.code), {
            formats: formatsLabel(refusal.params.formats ?? field.formats),
            size: refusal.params.maxFileSizeMb ?? field.maxFileSizeMb,
            count: refusal.params.maxFiles ?? field.maxFiles,
          })
        );
        return;
      }
      this.setError(field, "");
      this.$emit("update:uploads", [
        ...this.uploads,
        {
          key: groupUploadKey(this.uploads),
          fieldId: field.id,
          file,
          attempts,
        },
      ]);
    },

    /** The bookings of a file as chosen; a file is for one at least. */
    setAttempts(upload, value) {
      const attempts = [].concat(value ?? []).sort((a, b) => a - b);
      if (attempts.length === 0) {
        this.resets += 1;
        return;
      }
      this.$emit(
        "update:uploads",
        this.uploads.map((u) => (u.key === upload.key ? { ...u, attempts } : u))
      );
    },

    removeUpload(upload) {
      this.$emit(
        "update:uploads",
        this.uploads.filter((u) => u.key !== upload.key)
      );
    },
  },
};
</script>
