<template>
  <div
    :id="`proof-field-${field.fieldId}`"
    class="customer-proof-field"
    data-test="customer-proof-field"
  >
    <div class="font-weight-bold">{{ field.label }}</div>
    <div
      class="d-flex flex-wrap align-center customer-proof-field__badges mt-1"
    >
      <v-chip small label :outlined="!field.required">
        {{
          field.required
            ? $t("customer-proofs.required")
            : $t("customer-proofs.optional")
        }}
      </v-chip>
      <v-tooltip v-if="field.category === 'sensitive'" bottom max-width="320">
        <template #activator="{ on, attrs }">
          <v-chip
            small
            label
            outlined
            color="warning"
            tabindex="0"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon small left>mdi-shield-lock-outline</v-icon>
            {{ $t("customer-proofs.sensitive") }}
          </v-chip>
        </template>
        {{ $t("customer-proofs.sensitive-hint") }}
      </v-tooltip>
      <!-- A state to act on is filled; „Offen“ without a close deadline is
           outlined, in the text colour, so it reads on any background. -->
      <v-chip
        small
        label
        :outlined="neutral"
        :color="neutral ? undefined : view.color"
        :text-color="neutral ? undefined : 'white'"
        data-test="customer-proof-state"
      >
        {{ stateLabel }}
      </v-chip>
    </div>

    <p v-if="field.hint" class="text-body-2 mt-1 mb-0">{{ field.hint }}</p>
    <p v-if="view.reason" class="text-body-2 error--text mt-1 mb-0">
      {{ $t(view.reasonKey, { reason: view.reason }) }}
    </p>
    <p v-if="view.lateHint" class="text-body-2 error--text mt-1 mb-0">
      {{ $t("customer-proofs.late-hint", { tenant: tenantName }) }}
    </p>

    <template v-if="view.pendingUploads.length">
      <div
        v-for="upload in view.pendingUploads"
        :key="upload.mediaId"
        class="customer-proof-field__file d-flex flex-wrap align-center mt-2"
        data-test="customer-proof-file"
      >
        <v-icon small class="mr-1">mdi-file-check-outline</v-icon>
        <span
          class="customer-proof-field__name"
          :title="upload.originalFileName"
        >
          {{ upload.originalFileName }}
        </span>
        <span v-if="upload.size" class="text--secondary ml-1">
          · {{ sizeLabel(upload.size) }}
        </span>
        <v-spacer />
        <v-btn
          x-small
          text
          :disabled="busy"
          data-test="customer-proof-replace"
          @click="choose(upload.mediaId)"
        >
          <v-icon x-small left>mdi-file-replace-outline</v-icon>
          {{ $t("customer-proofs.replace") }}
        </v-btn>
        <v-btn
          x-small
          text
          color="error"
          :disabled="busy"
          data-test="customer-proof-delete"
          @click="remove(upload.mediaId)"
        >
          <v-icon x-small left>mdi-delete-outline</v-icon>
          {{ $t("customer-proofs.delete") }}
        </v-btn>
      </div>
      <p class="text-caption text--secondary mt-1 mb-0">
        {{
          $t(
            field.category === "sensitive"
              ? "customer-proofs.change-until-review-sensitive"
              : "customer-proofs.change-until-review"
          )
        }}
      </p>
    </template>

    <div v-if="view.canUpload" class="mt-3">
      <v-btn
        color="primary"
        small
        depressed
        :loading="busy"
        data-test="customer-proof-choose"
        @click="choose(null)"
      >
        <v-icon small left>mdi-upload</v-icon>
        {{ $t("customer-proofs.choose") }}
      </v-btn>
      <span class="text-caption text--secondary ml-2">
        {{
          $t("customer-proofs.limits", {
            formats: formatsLabel(field.formats),
            size: field.maxFileSizeMb,
          })
        }}
      </span>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="d-none"
      :accept="acceptOf(field.formats)"
      data-test="customer-proof-input"
      @change="onFileChosen"
    />

    <v-alert
      v-if="errorMessage"
      type="error"
      dense
      text
      class="mt-2 mb-0"
      data-test="customer-proof-error"
    >
      {{ errorMessage }}
    </v-alert>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import FormatService from "@/services/FormatService";
import {
  acceptOf,
  customerProofErrorKey,
  customerProofFieldView,
  formatsLabel,
  precheckCustomerProof,
} from "@/utils/customerUploads";

// The day of a check, as „12.11.26“.
const DAY_FORMAT = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

/**
 * One upload field on the page „Nachweise einreichen“ of a signed link:
 * what is asked for, its state, the files handed in with replace and delete
 * until the check, and a new file. A chosen file goes at once; the new state
 * of the booking's uploads is emitted as `state`.
 */
export default {
  name: "CustomerProofField",
  props: {
    field: { type: Object, required: true },
    /** `{ tenantId, bookingId }` of the link. */
    target: { type: Object, required: true },
    link: { type: String, required: true },
    tenantName: { type: String, default: "" },
  },
  data() {
    return { replacing: null, busy: false, errorMessage: "" };
  },
  computed: {
    view() {
      return customerProofFieldView(this.field);
    },
    neutral() {
      return this.view.color === "grey";
    },
    stateLabel() {
      const { deadline, days, reviewedAt } = this.view.labelParams;
      const params = {
        deadline: FormatService.dateTime(deadline),
        days,
        reviewedAt: reviewedAt ? DAY_FORMAT.format(new Date(reviewedAt)) : "",
      };
      return days === null || days === undefined
        ? this.$t(this.view.labelKey, params)
        : this.$tc(this.view.labelKey, days, params);
    },
  },
  methods: {
    acceptOf,
    formatsLabel,
    sizeLabel: (bytes) => FormatService.bytes(bytes),
    choose(mediaId) {
      this.replacing = mediaId;
      this.errorMessage = "";
      this.$refs.fileInput?.click();
    },
    onFileChosen(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) this.send(file);
    },
    async send(file) {
      this.errorMessage = "";
      const refusal = precheckCustomerProof(file, this.field, {
        replacing: Boolean(this.replacing),
      });
      if (refusal) {
        this.showError(refusal.code, refusal.params);
        return;
      }
      const { fieldId } = this.field;
      await this.call(
        () =>
          this.replacing
            ? ApiBookingService.replaceCustomerUploadByLink(
                this.target,
                this.link,
                fieldId,
                this.replacing,
                file
              )
            : ApiBookingService.uploadCustomerUploadByLink(
                this.target,
                this.link,
                fieldId,
                file
              ),
        "customer-proofs.uploaded"
      );
    },
    async remove(mediaId) {
      this.errorMessage = "";
      await this.call(
        () =>
          ApiBookingService.removeCustomerUploadByLink(
            this.target,
            this.link,
            this.field.fieldId,
            mediaId
          ),
        "customer-proofs.deleted"
      );
    },
    async call(request, successKey) {
      this.busy = true;
      try {
        const response = await request();
        this.$emit("state", response.data?.customerUploadState ?? null);
        this.$store?.dispatch("toasts/add", {
          title: this.$t(successKey),
          message: "",
          type: "success",
          timeout: 5000,
        });
      } catch (error) {
        const body = error?.response?.data ?? {};
        const code =
          error?.response?.status === 429 && !body.code
            ? "customer_upload_rate_limited"
            : body.code;
        this.showError(code, body.params ?? {});
      } finally {
        this.busy = false;
        this.replacing = null;
      }
    },
    showError(code, params = {}) {
      this.errorMessage = this.$t(customerProofErrorKey(code), {
        formats: formatsLabel(params.formats ?? this.field.formats),
        size: params.maxFileSizeMb ?? this.field.maxFileSizeMb,
        count: params.maxFiles ?? this.field.maxFiles,
      });
    },
  },
};
</script>

<style scoped>
.customer-proof-field {
  padding: var(--scb-space-4);
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-control);
}

.customer-proof-field__badges {
  gap: var(--scb-space-2);
}

.customer-proof-field__file {
  padding: var(--scb-space-2) var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
  background-color: var(--scb-hover-tint);
  border-radius: var(--scb-radius-control);
}

.customer-proof-field__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
</style>
