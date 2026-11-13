<script>
import { mapGetters } from "vuex";
import AppList from "@/components/commons/AppList.vue";
import AccessPointCompartmentRotateDialog from "@/components/AccessPoint/AccessPointCompartmentRotateDialog.vue";
import AccessPointCompartmentRotateAllDialog from "@/components/AccessPoint/AccessPointCompartmentRotateAllDialog.vue";
import {
  downloadCompartmentQrCode,
  downloadCompartmentQrSheet,
  QR_FORMATS,
} from "@/utilities/access-point-qr";
import accessPointRequest from "@/mixins/accessPointRequest";
import { accessPointLabel } from "@/utilities/access-points";
import { compartmentsByLockerBank } from "@/utilities/locker-system-compartments";

/**
 * „QR-Codes der Fächer“ of a Schließfachanlage that carries its own Fächer
 * (ECCdigital/tickets#1056): the Fächer by Schrank, each with its QR code
 * as PDF, SVG and PNG. The server renders every file - the scan code of a
 * Fach never reaches the client.
 *
 * One Fach or all of them, never a subset: no selection here (spec #1046).
 * Over the list the actions for all Fächer (`.compartment-qr-actions`:
 * „Alle drucken (Sammel-PDF)“, „Alle rotieren …“), in each row those of
 * one Fach (`.compartment-qr-row-actions`: the downloads, then „Rotieren“).
 */
export default {
  name: "AccessPointCompartmentQrDialog",
  mixins: [accessPointRequest],
  components: {
    AppList,
    AccessPointCompartmentRotateDialog,
    AccessPointCompartmentRotateAllDialog,
  },
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      // `<compartmentId>-<format>` of the download running, `sheet` for the
      // Sammel-PDF
      downloading: "",
      // The Fach whose „Rotieren“ asks (tickets#1061), null while none does
      rotateCompartment: null,
      rotateDialog: false,
      // „Alle rotieren …“ asking (tickets#1063)
      rotateAllDialog: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    label() {
      return accessPointLabel(this.accessPoint);
    },
    compartments() {
      return this.accessPoint?.config?.compartments || [];
    },
    groups() {
      return compartmentsByLockerBank(this.compartments);
    },
    columns() {
      return [
        {
          key: "number",
          label: this.$t(
            "accessPoint.management.compartmentQr.columns.compartment"
          ),
          width: "minmax(96px, 1fr)",
        },
        {
          key: "state",
          label: this.$t("accessPoint.management.compartmentQr.columns.state"),
          width: "minmax(120px, 1fr)",
        },
        {
          key: "actions",
          label: this.$t("accessPoint.management.compartmentQr.columns.qr"),
          width: "minmax(180px, auto)",
          align: "end",
        },
      ];
    },
    qrFormats() {
      return QR_FORMATS;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.downloading = "";
        this.error = "";
        this.rotateDialog = false;
        this.rotateAllDialog = false;
      }
    },
  },
  methods: {
    openRotate(compartment) {
      this.rotateCompartment = compartment;
      this.rotateDialog = true;
    },
    downloadKey(compartment, format) {
      return `${compartment.id}-${format}`;
    },
    download(compartment, format) {
      return this.runDownload(this.downloadKey(compartment, format), () =>
        downloadCompartmentQrCode(
          this.accessPoint,
          compartment,
          format,
          this.tenantId
        )
      );
    },
    /** „Alle drucken (Sammel-PDF)“: all Fächer on an Etikettenbogen. */
    downloadSheet() {
      return this.runDownload("sheet", () =>
        downloadCompartmentQrSheet(this.accessPoint, this.tenantId)
      );
    },
    runDownload(key, request) {
      return this.runRequest(
        "downloading",
        key,
        "accessPoint.management.qr.error",
        request
      );
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="760"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center flex-nowrap py-4 px-6">
        <v-icon left>mdi-qrcode</v-icon>
        <div>
          <div class="text-h5">
            {{ $t("accessPoint.management.compartmentQr.title") }}
          </div>
          <div class="text-caption text--secondary">
            {{
              $tc(
                "accessPoint.management.compartmentQr.subtitle",
                compartments.length,
                { label, count: compartments.length }
              )
            }}
          </div>
        </div>
        <v-spacer />
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <!-- The actions for all Fächer: „Alle drucken (Sammel-PDF)“
             (tickets#1062), „Alle rotieren …“ (tickets#1063). -->
        <div class="compartment-qr-actions d-flex align-center flex-wrap">
          <v-btn
            class="download-compartment-qr-sheet"
            color="primary"
            depressed
            :title="$t('accessPoint.management.compartmentQr.printAllTitle')"
            :loading="downloading === 'sheet'"
            :disabled="!compartments.length || !!downloading"
            @click="downloadSheet"
          >
            <v-icon left>mdi-file-pdf-box</v-icon>
            {{ $t("accessPoint.management.compartmentQr.printAll") }}
          </v-btn>
          <v-btn
            class="rotate-all-compartment-qr"
            color="error"
            outlined
            :disabled="!compartments.length || !!downloading"
            @click="rotateAllDialog = true"
          >
            <v-icon left>mdi-autorenew</v-icon>
            {{ $t("accessPoint.management.rotate.allAction") }}
          </v-btn>
        </div>

        <v-alert v-if="error" color="error" text dense class="mb-4">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>

        <p v-if="!groups.length" class="text--secondary mb-0">
          {{ $t("accessPoint.management.compartmentQr.empty") }}
        </p>

        <section
          v-for="group in groups"
          :key="group.lockerBank.id"
          class="compartment-qr-group"
          data-test="compartment-qr-group"
        >
          <h3
            class="compartment-qr-group__title"
            data-test="compartment-qr-group-title"
          >
            {{
              $t("accessPoint.management.compartments.lockerBank", {
                name: group.lockerBank.name,
              })
            }}
          </h3>
          <AppList :columns="columns" :items="group.compartments">
            <template v-slot:cell.number="{ item }">
              {{
                $t("accessPoint.management.compartments.compartment", {
                  number: item.number,
                })
              }}
            </template>
            <template v-slot:cell.state="{ item }">
              <v-chip
                v-if="item.outOfService"
                x-small
                label
                color="warning"
                dark
              >
                {{ $t("accessPoint.management.compartments.outOfService") }}
              </v-chip>
              <span v-else class="text-caption text--secondary">
                {{ $t("accessPoint.management.compartmentQr.inService") }}
              </span>
            </template>
            <template v-slot:cell.actions="{ item }">
              <!-- The actions of one Fach: its downloads, then „Rotieren“
                   (tickets#1061). -->
              <div
                class="compartment-qr-row-actions d-flex align-center justify-end"
                :data-compartment-id="item.id"
              >
                <v-btn
                  v-for="format in qrFormats"
                  :key="format"
                  :class="`download-compartment-qr-${format}`"
                  x-small
                  text
                  :title="
                    format === 'pdf'
                      ? $t('accessPoint.management.compartmentQr.pdfTitle')
                      : undefined
                  "
                  :loading="downloading === downloadKey(item, format)"
                  :disabled="!!downloading"
                  @click="download(item, format)"
                >
                  {{ format.toUpperCase() }}
                </v-btn>
                <v-btn
                  class="rotate-compartment-qr"
                  x-small
                  text
                  color="error"
                  :disabled="!!downloading"
                  @click="openRotate(item)"
                >
                  <v-icon left x-small>mdi-autorenew</v-icon>
                  {{ $t("accessPoint.management.rotate.confirm") }}
                </v-btn>
              </div>
            </template>
          </AppList>
        </section>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('close')">
          {{ $t("accessPoint.management.close") }}
        </v-btn>
      </v-card-actions>

      <AccessPointCompartmentRotateDialog
        :open="rotateDialog"
        :access-point="accessPoint"
        :compartment="rotateCompartment"
        @rotated="(...args) => $emit('rotated', ...args)"
        @close="rotateDialog = false"
      />
      <AccessPointCompartmentRotateAllDialog
        :open="rotateAllDialog"
        :access-point="accessPoint"
        @rotated="(...args) => $emit('rotated', ...args)"
        @close="rotateAllDialog = false"
      />
    </v-card>
  </v-dialog>
</template>

<style scoped>
.compartment-qr-actions {
  gap: var(--scb-space-2);
}
.compartment-qr-actions:not(:empty) {
  margin-bottom: var(--scb-space-4);
}
.compartment-qr-group + .compartment-qr-group {
  margin-top: var(--scb-space-5);
}
.compartment-qr-group__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  margin: 0 0 var(--scb-space-2);
}
</style>
