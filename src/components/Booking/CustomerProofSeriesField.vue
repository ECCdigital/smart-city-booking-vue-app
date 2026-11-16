<template>
  <div class="customer-proof-series" data-test="customer-proof-series">
    <div class="font-weight-bold">{{ field.label }}</div>
    <div
      class="d-flex flex-wrap align-center customer-proof-series__badges mt-1"
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
    </div>
    <p v-if="field.hint" class="text-body-2 mt-1 mb-0">{{ field.hint }}</p>

    <div class="customer-proof-series__members mt-3">
      <CustomerProofField
        v-for="entry in entries"
        :key="entry.booking.id"
        :field="entry.field"
        :target="{ tenantId, bookingId: entry.booking.id }"
        :link="link"
        :tenant-name="tenantName"
        :member="entry.member"
        @state="$emit('changed')"
      />
    </div>

    <div v-if="openEntries.length" class="mt-4">
      <div class="d-flex flex-wrap align-center">
        <v-btn
          color="primary"
          small
          depressed
          :disabled="busy"
          data-test="customer-proof-series-choose"
          @click="$refs.fileInput.click()"
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

      <div
        v-if="pendingFile"
        class="customer-proof-series__pending mt-3"
        data-test="customer-proof-series-pending"
      >
        <div class="d-flex align-center text-body-2">
          <v-icon small class="mr-1">mdi-file-outline</v-icon>
          <span class="text-truncate">{{ pendingFile.name }}</span>
          <span class="text--secondary text-no-wrap ml-1">
            · {{ sizeLabel(pendingFile.size) }}
          </span>
          <v-spacer />
          <v-btn
            x-small
            text
            color="error"
            :disabled="busy"
            data-test="customer-proof-series-discard"
            @click="discard"
          >
            <v-icon x-small left>mdi-close</v-icon>
            {{ $t("customer-proofs.discard") }}
          </v-btn>
        </div>
        <v-select
          v-model="chosen"
          :items="memberItems"
          :label="$t('customer-proofs.for')"
          multiple
          small-chips
          dense
          outlined
          hide-details
          class="mt-2"
          data-test="customer-proof-series-members"
        />
        <v-btn
          color="primary"
          small
          depressed
          class="mt-2"
          :loading="busy"
          :disabled="!chosen.length"
          data-test="customer-proof-series-send"
          @click="send"
        >
          <v-icon small left>mdi-send</v-icon>
          {{ $t("customer-proofs.send") }}
        </v-btn>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="d-none"
      :accept="acceptOf(field.formats)"
      data-test="customer-proof-series-input"
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
import CustomerProofField from "@/components/Booking/CustomerProofField.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import FormatService from "@/services/FormatService";
import {
  acceptOf,
  customerProofErrorKey,
  customerProofFieldView,
  formatsLabel,
  precheckCustomerProof,
} from "@/utils/customerUploads";

/**
 * One upload field of a series on the page „Nachweise einreichen“, as in
 * the checkout of a series: the dates with the state and the files of
 * each, which are replaced and deleted at their date, and one file for
 * several dates: once a file is chosen, „Gilt für die Termine“ offers the
 * dates that still take one, all of them chosen at first, and „Einreichen“
 * sends it. After each change `changed` asks the page to read the series
 * anew.
 */
export default {
  name: "CustomerProofSeriesField",
  components: { CustomerProofField },
  props: {
    /** The dates with this field: `{ booking, field, member }` each. */
    entries: { type: Array, required: true },
    tenantId: { type: String, required: true },
    link: { type: String, required: true },
    tenantName: { type: String, default: "" },
  },
  data() {
    return { pendingFile: null, chosen: [], busy: false, errorMessage: "" };
  },
  computed: {
    field() {
      return this.entries[0].field;
    },
    openEntries() {
      return this.entries.filter(
        (entry) => customerProofFieldView(entry.field).canUpload
      );
    },
    memberItems() {
      return this.openEntries.map((entry) => ({
        value: entry.booking.id,
        text: entry.member,
      }));
    },
  },
  watch: {
    // A date that no longer takes a file drops out of the choice.
    openEntries(entries) {
      const open = new Set(entries.map((entry) => entry.booking.id));
      this.chosen = this.chosen.filter((id) => open.has(id));
    },
  },
  methods: {
    acceptOf,
    formatsLabel,
    sizeLabel: (bytes) => FormatService.bytes(bytes),
    /** A chosen file waits for its dates: at first every open one. */
    onFileChosen(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      this.errorMessage = "";
      this.pendingFile = file;
      this.chosen = this.openEntries.map((entry) => entry.booking.id);
    },
    discard() {
      this.pendingFile = null;
      this.chosen = [];
      this.errorMessage = "";
    },
    async send() {
      const file = this.pendingFile;
      if (!file) return;
      this.errorMessage = "";
      const targets = this.openEntries.filter((entry) =>
        this.chosen.includes(entry.booking.id)
      );
      if (!targets.length) return;
      for (const { field } of targets) {
        const refusal = precheckCustomerProof(file, field);
        if (refusal) {
          this.showError(refusal.code, refusal.params);
          return;
        }
      }
      const [first, ...others] = targets;
      this.busy = true;
      try {
        await ApiBookingService.uploadCustomerUploadByLink(
          { tenantId: this.tenantId, bookingId: first.booking.id },
          this.link,
          first.field.fieldId,
          file,
          others.map(({ booking, field }) => ({
            bookingId: booking.id,
            fieldId: field.fieldId,
          }))
        );
        this.$store?.dispatch("toasts/add", {
          title: this.$t("customer-proofs.uploaded"),
          message: "",
          type: "success",
          timeout: 5000,
        });
        this.pendingFile = null;
        this.chosen = [];
        this.$emit("changed");
      } catch (error) {
        const body = error?.response?.data ?? {};
        const code =
          error?.response?.status === 429 && !body.code
            ? "customer_upload_rate_limited"
            : body.code;
        this.showError(code, body.params ?? {});
      } finally {
        this.busy = false;
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
.customer-proof-series {
  padding: var(--scb-space-4);
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-control);
}

.customer-proof-series__badges {
  gap: var(--scb-space-2);
}

.customer-proof-series__pending {
  padding: var(--scb-space-3);
  background-color: var(--scb-hover-tint);
  border-radius: var(--scb-radius-control);
}

.customer-proof-series__members {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-2);
}
</style>
