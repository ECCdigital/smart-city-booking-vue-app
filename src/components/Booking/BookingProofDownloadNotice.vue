<template>
  <AppDialog
    :open="open"
    :title="$t('booking.page.proofs.download-notice.title')"
    :subtitle="fileName"
    icon="mdi-shield-lock-outline"
    color="warning"
    data-test="booking-proof-download-notice"
    @close="$emit('close')"
  >
    <p class="mb-2">
      {{ $t("booking.page.proofs.download-notice.text") }}
    </p>
    <p class="mb-0 booking-proof-download-notice__deletion">
      {{ deletionText }}
    </p>
    <template #actions>
      <v-btn outlined @click="$emit('close')">
        {{ $t("booking.page.proofs.dialog.cancel") }}
      </v-btn>
      <v-btn
        color="primary"
        class="booking-proof-download-notice__confirm"
        @click="$emit('confirm')"
      >
        <v-icon left>mdi-download</v-icon>
        {{ $t("booking.page.proofs.download-notice.confirm") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";

/**
 * The notice before a sensitive customer upload is saved to the computer:
 * the file holds sensitive data and is to be deleted once checked, at the
 * latest when the tenant's deletion deadline ends. `retentionDays` null
 * leaves the number out. Emits `confirm` to download and `close`.
 */
export default {
  name: "BookingProofDownloadNotice",
  components: { AppDialog },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    fileName: {
      type: String,
      default: "",
    },
    /** The tenant's deletion deadline in days, null where unknown. */
    retentionDays: {
      type: Number,
      default: null,
    },
  },
  computed: {
    deletionText() {
      if (this.retentionDays === null) {
        return this.$t("booking.page.proofs.download-notice.deletion");
      }
      return this.$tc(
        "booking.page.proofs.download-notice.deletion-days",
        this.retentionDays,
        { days: this.retentionDays }
      );
    },
  },
};
</script>
