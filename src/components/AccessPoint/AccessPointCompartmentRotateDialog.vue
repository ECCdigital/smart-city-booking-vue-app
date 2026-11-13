<script>
import { mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import accessPointRequest from "@/mixins/accessPointRequest";
import {
  downloadCompartmentQrCode,
  QR_FORMATS,
} from "@/utilities/access-point-qr";
import { accessPointLabel } from "@/utilities/access-points";
import { compartmentTitle } from "@/utilities/locker-system-compartments";

/**
 * „Rotieren“ for one Fach of a Schließfachanlage that carries its own Fächer
 * (ECCdigital/tickets#1061), like the door's `AccessPointRotateDialog`: a
 * question with a warning, then the downloads of the new code. The server
 * rotates and renders - the scan code never reaches the client.
 */
export default {
  name: "AccessPointCompartmentRotateDialog",
  mixins: [accessPointRequest],
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
    // The Fach as the Anlage lists it: `{ id, number, lockerBank }`
    compartment: { type: Object, default: null },
  },
  data() {
    return {
      rotating: false,
      rotated: false,
      downloading: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    label() {
      return accessPointLabel(this.accessPoint);
    },
    compartmentLabel() {
      return compartmentTitle({
        number: this.compartment?.number,
        lockerBankName: this.compartment?.lockerBank?.name,
      });
    },
    qrFormats() {
      return QR_FORMATS;
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
          await ApiAccessPointService.rotateCompartmentScanCode(
            this.accessPoint.id,
            this.compartment.id,
            this.tenantId
          );
          this.rotated = true;
          this.$emit("rotated", this.accessPoint, this.compartment);
        }
      );
    },
    download(format) {
      return this.runRequest(
        "downloading",
        format,
        "accessPoint.management.qr.error",
        () =>
          downloadCompartmentQrCode(
            this.accessPoint,
            this.compartment,
            format,
            this.tenantId
          )
      );
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="560"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
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
        <template v-if="!rotated">
          <p>
            {{
              $t("accessPoint.management.rotate.compartmentQuestion", {
                compartment: compartmentLabel,
                label,
              })
            }}
          </p>
          <v-alert color="warning" text dense class="mb-0">
            <v-icon left>mdi-alert</v-icon>
            {{ $t("accessPoint.management.rotate.compartmentWarning") }}
          </v-alert>
        </template>

        <template v-else>
          <v-alert color="success" text dense>
            <v-icon left>mdi-check-circle</v-icon>
            {{ $t("accessPoint.management.rotate.compartmentDone") }}
          </v-alert>
          <p class="mb-2">{{ $t("accessPoint.management.rotate.reprint") }}</p>
          <div
            class="compartment-rotate-downloads d-flex align-center flex-wrap"
          >
            <!-- The PDF first and prominent, SVG and PNG as plain text. -->
            <v-btn
              v-for="format in qrFormats"
              :key="format"
              :color="format === 'pdf' ? 'primary' : undefined"
              :text="format !== 'pdf'"
              :small="format !== 'pdf'"
              :loading="downloading === format"
              :disabled="!!downloading"
              @click="download(format)"
            >
              <v-icon v-if="format === 'pdf'" left>mdi-file-pdf-box</v-icon>
              {{ $t(`accessPoint.management.qr.${format}`) }}
            </v-btn>
          </div>
        </template>

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
          {{ $t("accessPoint.management.rotate.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.compartment-rotate-downloads {
  gap: var(--scb-space-2);
}
</style>
