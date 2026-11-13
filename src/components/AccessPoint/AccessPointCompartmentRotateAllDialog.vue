<script>
import { mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import accessPointRequest from "@/mixins/accessPointRequest";
import { downloadCompartmentQrSheet } from "@/utilities/access-point-qr";
import { accessPointLabel, requiresQrScan } from "@/utilities/access-points";

/**
 * „Alle rotieren …“ for a Schließfachanlage that carries its own Fächer
 * (ECCdigital/tickets#1063), after an incident that voids every sticker: the
 * question names the number of Fächer and warns that all stickers are void
 * at once, a second hint follows the Anlage's scan duty, and rotating waits
 * for the tick that all stickers get printed and attached anew. Afterwards
 * the dialog leads straight to the Sammel-PDF. All Fächer or one, never a
 * subset (spec #1046). The scan codes never reach the client.
 */
export default {
  name: "AccessPointCompartmentRotateAllDialog",
  mixins: [accessPointRequest],
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      acknowledged: false,
      rotating: false,
      rotated: false,
      downloading: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    label() {
      return accessPointLabel(this.accessPoint);
    },
    count() {
      return this.accessPoint?.config?.compartments?.length || 0;
    },
    qrScanRequired() {
      return requiresQrScan(this.accessPoint);
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.acknowledged = false;
        this.rotating = false;
        this.rotated = false;
        this.downloading = false;
        this.error = "";
      }
    },
  },
  methods: {
    rotate() {
      return this.runRequest(
        "rotating",
        true,
        "accessPoint.management.rotate.allError",
        async () => {
          await ApiAccessPointService.rotateAllCompartmentScanCodes(
            this.accessPoint.id,
            this.tenantId
          );
          this.rotated = true;
          this.$emit("rotated", this.accessPoint);
        }
      );
    },
    downloadSheet() {
      return this.runRequest(
        "downloading",
        true,
        "accessPoint.management.qr.error",
        () => downloadCompartmentQrSheet(this.accessPoint, this.tenantId)
      );
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="580"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">
          {{ $t("accessPoint.management.rotate.allTitle") }}
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
              $tc("accessPoint.management.rotate.allQuestion", count, {
                label,
                count,
              })
            }}
          </p>
          <v-alert color="warning" text dense>
            <v-icon left>mdi-alert</v-icon>
            {{
              $tc("accessPoint.management.rotate.allWarning", count, { count })
            }}
          </v-alert>
          <v-alert
            v-if="qrScanRequired"
            class="rotate-all-scan-hint mb-0"
            color="error"
            text
            dense
          >
            <v-icon left>mdi-lock-alert</v-icon>
            {{ $t("accessPoint.management.rotate.allQrScanRequired") }}
          </v-alert>
          <v-alert
            v-else
            class="rotate-all-scan-hint mb-0"
            color="info"
            text
            dense
          >
            <v-icon left>mdi-information-outline</v-icon>
            {{ $t("accessPoint.management.rotate.allQrScanOptional") }}
          </v-alert>
          <v-checkbox
            v-model="acknowledged"
            class="rotate-all-acknowledge mt-4"
            hide-details
            :disabled="rotating"
            :label="$t('accessPoint.management.rotate.allAcknowledge')"
          />
        </template>

        <template v-else>
          <v-alert color="success" text dense>
            <v-icon left>mdi-check-circle</v-icon>
            {{ $tc("accessPoint.management.rotate.allDone", count, { count }) }}
          </v-alert>
          <p class="mb-2">
            {{ $t("accessPoint.management.rotate.allReprint") }}
          </p>
          <v-btn
            class="rotate-all-download-sheet"
            color="primary"
            depressed
            :title="$t('accessPoint.management.compartmentQr.printAllTitle')"
            :loading="downloading"
            :disabled="downloading"
            @click="downloadSheet"
          >
            <v-icon left>mdi-file-pdf-box</v-icon>
            {{ $t("accessPoint.management.compartmentQr.printAll") }}
          </v-btn>
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
          class="rotate-all-confirm"
          color="error"
          :loading="rotating"
          :disabled="!acknowledged"
          @click="rotate"
        >
          <v-icon left small>mdi-autorenew</v-icon>
          {{ $t("accessPoint.management.rotate.allConfirm", { count }) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
