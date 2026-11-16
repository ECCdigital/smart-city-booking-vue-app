<template>
  <AppDialog
    :open="open"
    :title="title"
    :subtitle="fieldLabel"
    :icon="kind === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-file-image'"
    max-width="1000"
    :persistent="false"
    data-test="booking-proof-viewer"
    @close="$emit('close')"
  >
    <div class="booking-proof-viewer__frame">
      <div
        v-if="loading"
        class="booking-proof-viewer__state d-flex align-center justify-center"
      >
        <v-progress-circular indeterminate color="primary" />
      </div>
      <v-alert
        v-else-if="error"
        type="error"
        dense
        outlined
        class="booking-proof-viewer__error ma-6"
      >
        {{ error }}
      </v-alert>
      <iframe
        v-else-if="url && kind === 'pdf'"
        :src="url"
        :title="title"
        class="booking-proof-viewer__pdf"
      />
      <div
        v-else-if="url"
        class="booking-proof-viewer__state d-flex align-center justify-center"
      >
        <img :src="url" :alt="title" class="booking-proof-viewer__image" />
      </div>
    </div>
    <template #actions-start>
      <v-chip
        v-if="sensitive"
        small
        label
        outlined
        color="warning"
        class="booking-proof-viewer__sensitive"
      >
        <v-icon small left>mdi-shield-lock-outline</v-icon>
        {{ $t("booking.page.proofs.sensitive") }}
      </v-chip>
    </template>
    <template #actions>
      <v-btn outlined @click="$emit('close')">
        {{ $t("booking.page.proofs.viewer.close") }}
      </v-btn>
      <v-btn
        color="primary"
        class="booking-proof-viewer__download"
        @click="$emit('download', { field, upload })"
      >
        <v-icon left>mdi-download</v-icon>
        {{ $t("booking.page.proofs.download") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  getApiErrorMessage,
  unpackBlobErrorBody,
} from "@/services/api/apiErrorMessage";
import { checkDeletesFile, previewKindOf } from "@/utils/customerUploads";

/**
 * A customer upload in the page: a PDF in the browser's viewer, an image as
 * it is. The file comes over the API client like a download, as a Blob with
 * the caller's credentials, and is shown from an object URL that is freed
 * once the dialog closes. „Herunterladen“ emits `download` with
 * `{ field, upload }` - the page decides whether a notice goes first.
 */
export default {
  name: "BookingProofViewer",
  components: { AppDialog },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    /** An upload of `proofFieldsOf` with `viewable`. */
    upload: {
      type: Object,
      default: null,
    },
    field: {
      type: Object,
      default: null,
    },
  },
  data() {
    return { url: null, loading: false, error: null };
  },
  computed: {
    kind() {
      return previewKindOf(this.upload);
    },
    title() {
      return this.upload?.originalFileName || "";
    },
    fieldLabel() {
      return this.field?.label || "";
    },
    sensitive() {
      return checkDeletesFile(this.upload, this.field);
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) this.load();
        else this.release();
      },
    },
  },
  beforeDestroy() {
    this.release();
  },
  methods: {
    async load() {
      this.release();
      if (!this.upload?.mediaId) return;
      const mediaId = this.upload.mediaId;
      this.loading = true;
      try {
        const response = await ApiMediaService.getMediaFileBlob(
          MEDIA_SCOPE.TENANT,
          mediaId
        );
        // Closed or another file meanwhile: this one is not shown.
        if (!this.open || this.upload?.mediaId !== mediaId) return;
        const type =
          this.upload.mimeType ||
          (this.kind === "pdf" ? "application/pdf" : "image/*");
        this.url = window.URL.createObjectURL(
          new Blob([response.data], { type })
        );
      } catch (error) {
        const unpacked = await unpackBlobErrorBody(error);
        this.error = getApiErrorMessage(
          unpacked,
          this.$t("booking.page.proofs.viewer.error")
        );
      } finally {
        this.loading = false;
      }
    },
    release() {
      if (this.url) window.URL.revokeObjectURL(this.url);
      this.url = null;
      this.error = null;
    },
  },
};
</script>

<style>
/* The file reaches the hairlines of the dialog: no padding around it. The
   card carries the `data-test` (AppDialog hands it attributes, not this
   component's scope). */
[data-test="booking-proof-viewer"] .app-dialog__body {
  padding: 0 !important;
}
</style>

<style scoped>
/* The file fills what the dialog (at most 90% of the screen) leaves beside
   its header and buttons. */
.booking-proof-viewer__frame {
  height: max(300px, calc(90vh - 240px));
}

.booking-proof-viewer__state {
  height: 100%;
  overflow: auto;
}

.booking-proof-viewer__pdf {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.booking-proof-viewer__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
