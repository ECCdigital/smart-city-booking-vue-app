<script>
import { mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import AccessPointQrPreview from "@/components/AccessPoint/AccessPointQrPreview.vue";
import accessPointRequest from "@/mixins/accessPointRequest";
import { downloadQrCode } from "@/utilities/access-point-qr";
import { rotationWarning } from "@/utilities/scan-code-rotation";

/**
 * „Scan-Code rotieren“ of a door or a fixed Fach (ECCdigital/tickets#1111):
 * the question with what the rotation means for bookers, then the new code
 * with „Neuen QR-Code drucken“ as the main button, SVG and PNG beside it.
 * The scan code never reaches the client; the server renders every file.
 */
export default {
  name: "AccessPointRotateDialog",
  mixins: [accessPointRequest],
  components: { AccessPointQrPreview },
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      rotating: false,
      rotated: false,
      // The format of the file that loads, "" while none does
      downloading: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    warning() {
      return this.accessPoint ? rotationWarning(this.accessPoint) : null;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.rotating = false;
        this.rotated = false;
        this.downloading = "";
        this.error = "";
      }
    },
  },
  methods: {
    rotate() {
      return this.runRequest(
        "rotating",
        true,
        "accessPoint.management.rotate.error",
        async () => {
          await ApiAccessPointService.rotateScanCode(
            this.accessPoint.id,
            this.tenantId
          );
          this.rotated = true;
          this.$emit("rotated", this.accessPoint);
        }
      );
    },
    download(format) {
      return this.runRequest(
        "downloading",
        format,
        "accessPoint.management.qr.error",
        () => downloadQrCode(this.accessPoint, format, this.tenantId)
      );
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="480"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card v-if="accessPoint">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left :color="rotated ? undefined : 'error'">
          {{ rotated ? "mdi-qrcode" : "mdi-alert" }}
        </v-icon>
        <span class="text-h5">
          {{ $t("accessPoint.management.rotate.title") }}
        </span>
        <v-spacer />
        <v-btn icon :disabled="rotating" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <div v-if="!rotated" data-test="rotate-question">
          <p data-test="rotate-text">{{ warning.replaced }}</p>
          <v-alert v-if="warning.locks" color="warning" text dense class="mb-0">
            <v-icon left>mdi-lock-alert-outline</v-icon>
            <span data-test="rotate-text">{{ warning.consequence }}</span>
          </v-alert>
          <p v-else class="text--secondary mb-0" data-test="rotate-text">
            {{ warning.consequence }}
          </p>
        </div>

        <div v-else class="rotated">
          <AccessPointQrPreview :access-point="accessPoint" />
          <div>
            <div class="rotated__title">
              <v-icon small color="success" class="mr-1">mdi-check</v-icon>
              {{ $t("accessPoint.management.rotate.done") }}
            </div>
            <div class="rotated__formats">
              {{ $t("accessPoint.management.compartmentQr.formats") }}
              <a href="#" @click.prevent="download('svg')">SVG</a>
              ·
              <a href="#" @click.prevent="download('png')">PNG</a>
            </div>
          </div>
        </div>

        <v-alert v-if="error" color="error" text dense class="mt-4 mb-0">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined :disabled="rotating" @click="$emit('close')">
          {{
            rotated
              ? $t("accessPoint.management.close")
              : $t("accessPoint.management.cancel")
          }}
        </v-btn>
        <v-btn
          v-if="!rotated"
          color="error"
          :loading="rotating"
          @click="rotate"
        >
          <v-icon left small>mdi-autorenew</v-icon>
          {{ warning.confirm }}
        </v-btn>
        <v-btn
          v-else
          color="primary"
          :loading="downloading === 'pdf'"
          :disabled="!!downloading"
          @click="download('pdf')"
        >
          <v-icon left small>mdi-printer-outline</v-icon>
          {{ $t("accessPoint.management.rotate.reprint") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.rotated {
  display: flex;
  align-items: center;
  gap: var(--scb-space-4);
}

.rotated__title {
  font-weight: var(--scb-font-weight-medium);
  margin-bottom: var(--scb-space-1);
}

.rotated__formats {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>
