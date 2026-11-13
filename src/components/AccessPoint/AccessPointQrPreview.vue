<script>
import { mapGetters } from "vuex";
import { qrPreviewUrl } from "@/utilities/access-point-qr";

/**
 * The QR code of a door, a fixed Fach or one Fach of a Schließfachanlage, as
 * the server renders it (ECCdigital/tickets#1111). A new `version` loads it
 * anew, after a rotation say. Where the image cannot be had, a QR icon stands
 * in; printing says why.
 */
export default {
  name: "AccessPointQrPreview",
  props: {
    accessPoint: { type: Object, required: true },
    compartment: { type: Object, default: null },
    version: { type: Number, default: 0 },
  },
  data() {
    return { url: "", loading: false };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    source() {
      return [
        this.accessPoint.id,
        this.compartment?.id || "",
        this.version,
      ].join("/");
    },
  },
  watch: {
    source: {
      immediate: true,
      handler() {
        this.load();
      },
    },
  },
  beforeDestroy() {
    this.release();
  },
  methods: {
    async load() {
      const source = this.source;
      this.release();
      this.loading = true;
      try {
        const url = await qrPreviewUrl(
          this.accessPoint,
          this.compartment,
          this.tenantId
        );
        // A later choice wins over a slower answer.
        if (source !== this.source) {
          window.URL.revokeObjectURL(url);
          return;
        }
        this.url = url;
      } catch (error) {
        this.url = "";
      } finally {
        if (source === this.source) this.loading = false;
      }
    },
    release() {
      if (this.url) window.URL.revokeObjectURL(this.url);
      this.url = "";
    },
  },
};
</script>

<template>
  <div class="qr-preview" data-test="qr-preview">
    <img
      v-if="url"
      :src="url"
      :alt="$t('accessPoint.management.qrPreview.alt')"
      class="qr-preview__image"
    />
    <v-progress-circular v-else-if="loading" indeterminate size="32" />
    <v-icon v-else size="96" class="qr-preview__placeholder">
      mdi-qrcode
    </v-icon>
  </div>
</template>

<style scoped>
.qr-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
}

.qr-preview__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.qr-preview__placeholder {
  opacity: 0.3;
}
</style>
