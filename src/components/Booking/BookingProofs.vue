<template>
  <div class="booking-proofs">
    <div
      v-for="field in fields"
      :key="field.fieldId"
      class="booking-proofs__field"
    >
      <div class="d-flex align-center justify-space-between mb-1">
        <div class="booking-proofs__heading text-subtitle-2">
          {{ field.label }}
          <span class="booking-proofs__kind">
            ·
            {{
              $t(
                field.required
                  ? "booking.page.proofs.required"
                  : "booking.page.proofs.optional"
              )
            }}
          </span>
        </div>
        <v-chip
          v-if="field.state"
          x-small
          label
          class="booking-proofs__state"
          :class="`booking-proofs__state--${field.state}`"
          :color="stateColor(field.state)"
          :text-color="field.state === 'open' ? undefined : 'white'"
        >
          {{ $t(stateKey(field)) }}
        </v-chip>
      </div>
      <div
        v-if="field.deadline || field.category === 'sensitive'"
        class="booking-proofs__meta d-flex flex-wrap align-center"
      >
        <span
          v-if="field.deadline"
          class="booking-proofs__deadline text-caption"
          :class="{ 'error--text': field.state === 'overdue' }"
        >
          {{
            $t("booking.page.proofs.deadline", {
              date: formatDateTime(field.deadline),
            })
          }}
        </span>
        <v-tooltip v-if="field.category === 'sensitive'" bottom max-width="320">
          <template #activator="{ on, attrs }">
            <v-chip
              x-small
              label
              outlined
              color="warning"
              class="booking-proofs__sensitive-chip"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon x-small left>mdi-shield-lock-outline</v-icon>
              {{ $t("booking.page.proofs.sensitive") }}
            </v-chip>
          </template>
          <span class="booking-proofs__sensitive-hint">
            {{ $t("booking.page.proofs.sensitive-hint") }}
          </span>
        </v-tooltip>
      </div>
      <div
        v-if="field.uploads.length === 0"
        class="booking-proofs__empty text-body-2 grey--text"
      >
        {{ $t("booking.page.proofs.none") }}
      </div>
      <v-list v-else dense class="pa-0">
        <v-list-item
          v-for="upload in field.uploads"
          :key="upload.mediaId || upload.uploadedAt"
          class="booking-proofs__row px-0"
          dense
        >
          <v-list-item-icon class="mr-2 my-auto">
            <v-icon small>
              {{ iconOf(upload) }}
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content class="py-1">
            <v-list-item-title class="text-body-2">
              {{ titleOf(upload) }}
            </v-list-item-title>
            <v-list-item-subtitle class="booking-proofs__note">
              {{ subtitle(upload) }}
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action
            v-if="upload.downloadable"
            class="booking-proofs__actions my-0 d-flex flex-row align-center"
          >
            <v-btn
              v-if="upload.downloadable"
              icon
              small
              class="booking-proofs__download"
              :title="$t('booking.page.proofs.download')"
              @click="$emit('download', upload)"
            >
              <v-icon small>mdi-download</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </div>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";

/** The colour of a field's state chip; „offen“ stays neutral. */
const STATE_COLORS = {
  open: undefined,
  submitted: "info",
  rejected: "error",
  overdue: "error",
  fulfilled: "success",
};

/**
 * The section „Nachweise“ of a Buchungsseite and of a member on the
 * Serienbuchungsseite: per upload field of
 * the booked offers its label, Pflicht or optional, the derived state and
 * the deadline, and the customer uploads handed in for it. A field of the
 * category „besonders schutzwürdig“ carries a marker with its hint. A file that
 * waits for its check has a download icon. The block only lists and emits
 * `download` with the upload. The fields come from `proofFieldsOf`.
 */
export default {
  name: "BookingProofs",
  props: {
    fields: {
      type: Array,
      required: true,
    },
  },
  methods: {
    stateColor(state) {
      return STATE_COLORS[state];
    },
    stateKey(field) {
      return `booking.page.proofs.state.${field.state}`;
    },
    iconOf(upload) {
      return upload.mimeType === "application/pdf"
        ? "mdi-file-pdf-box"
        : "mdi-file-image";
    },
    formatDateTime(value) {
      return FormatService.dateTime(value);
    },
    titleOf(upload) {
      return upload.originalFileName;
    },
    subtitle(upload) {
      return this.$t("booking.page.proofs.submitted-at", {
        date: this.formatDateTime(upload.uploadedAt),
      });
    },
  },
};
</script>

<style scoped>
/* A hairline between the upload fields. */
.booking-proofs__field + .booking-proofs__field {
  margin-top: var(--scb-space-3);
  padding-top: var(--scb-space-3);
  border-top: 1px solid var(--scb-rule);
}

/* The label wraps, the state chip keeps its whole text. */
.booking-proofs__heading {
  min-width: 0;
  margin-right: var(--scb-space-2);
  word-break: normal;
  overflow-wrap: break-word;
}

.booking-proofs__state {
  flex-shrink: 0;
}

.booking-proofs__kind {
  color: var(--scb-text-muted);
  font-weight: normal;
}

/* The deadline, and behind it the marker „Besonders schutzwürdig“. */
.booking-proofs__meta {
  gap: var(--scb-space-2);
}

.booking-proofs__sensitive-chip {
  flex-shrink: 0;
}

.booking-proofs__deadline,
.booking-proofs__request {
  color: var(--scb-text-muted);
}

.booking-proofs__note,
.booking-proofs__reason {
  white-space: normal;
}

.booking-proofs__request-again {
  font: inherit;
  white-space: nowrap;
}

.booking-proofs__request-again:hover,
.booking-proofs__request-again:focus-visible {
  text-decoration: underline;
}
</style>
