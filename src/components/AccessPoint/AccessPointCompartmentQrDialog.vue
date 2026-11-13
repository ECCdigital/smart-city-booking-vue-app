<script>
import { mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import accessPointRequest from "@/mixins/accessPointRequest";
import AccessPointQrPreview from "@/components/AccessPoint/AccessPointQrPreview.vue";
import {
  downloadCompartmentQrCode,
  downloadCompartmentQrSheet,
} from "@/utilities/access-point-qr";
import { accessPointLabel } from "@/utilities/access-points";
import { compartmentsByLockerBank } from "@/utilities/locker-system-compartments";
import { rotationWarning } from "@/utilities/scan-code-rotation";

const ALL = "all";

/**
 * „QR-Codes der Fächer“ of a Schließfachanlage that carries its own Fächer
 * (ECCdigital/tickets#1111): the Fächer by Schrank on the left, „Alle Fächer“
 * on top and chosen on opening; on the right the preview of the chosen Fach
 * or of the Etikettenbogen, with its print as the big button. Rotating asks
 * on the right of the same dialog, never in a second one over it.
 *
 * One Fach or all of them, never a subset (spec #1046). The server renders
 * every file - the scan code of a Fach never reaches the client.
 */
export default {
  name: "AccessPointCompartmentQrDialog",
  mixins: [accessPointRequest],
  components: { AccessPointQrPreview },
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
    // Opens with the question to rotate all Fächer, as „Alle Scan-Codes
    // rotieren …“ in the menu of the row asks.
    rotateAll: { type: Boolean, default: false },
  },
  data() {
    return {
      // The id of the chosen Fach, `ALL` for „Alle Fächer“
      selected: ALL,
      // The format of the file that loads, "" while none does
      downloading: "",
      // Rotating asks on the right, in place of the print.
      confirming: false,
      acknowledged: false,
      rotating: false,
      // The ids of the Fächer rotated while the dialog is open: „neu“
      rotated: {},
      // Counts up with each rotation, so the preview loads the new code.
      previewVersion: 0,
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
    all() {
      return this.selected === ALL;
    },
    compartment() {
      if (this.all) return null;
      return this.compartments.find(({ id }) => id === this.selected) || null;
    },
    warning() {
      if (!this.accessPoint) return null;
      return rotationWarning(this.accessPoint, {
        compartment: this.compartment,
        all: this.all,
      });
    },
    // The big button: the Sammel-PDF, the Fach's PDF, or its new code.
    printLabel() {
      if (!this.compartment)
        return this.$t("accessPoint.management.compartmentQr.printSheet");
      if (this.rotated[this.compartment.id])
        return this.$t("accessPoint.management.rotate.reprint");
      return this.$t("accessPoint.management.compartmentQr.print");
    },
    // The first page of the Etikettenbogen: 2×4 labels, the first Schrank.
    sheetPreview() {
      return (this.groups[0]?.compartments || []).slice(0, 8);
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.selected = ALL;
        this.rotated = {};
        this.ask(this.rotateAll);
      }
    },
  },
  methods: {
    select(id) {
      this.selected = id;
      this.ask(false);
    },
    ask(confirming) {
      this.confirming = confirming;
      this.acknowledged = false;
      this.error = "";
    },
    /** Rotates the chosen Fach, or on „Alle Fächer“ all of them. */
    rotate() {
      const compartment = this.compartment;
      return this.runRequest(
        "rotating",
        true,
        compartment
          ? "accessPoint.management.rotate.error"
          : "accessPoint.management.rotate.allError",
        async () => {
          if (compartment) {
            await ApiAccessPointService.rotateCompartmentScanCode(
              this.accessPoint.id,
              compartment.id,
              this.tenantId
            );
          } else {
            await ApiAccessPointService.rotateAllCompartmentScanCodes(
              this.accessPoint.id,
              this.tenantId
            );
          }
          const rotated = { ...this.rotated };
          (compartment ? [compartment] : this.compartments).forEach(
            ({ id }) => (rotated[id] = true)
          );
          this.rotated = rotated;
          this.previewVersion += 1;
          this.confirming = false;
          this.$emit("rotated", this.accessPoint);
        }
      );
    },
    /** The Sammel-PDF on „Alle Fächer“, else the chosen Fach as `format`. */
    print(format = "pdf") {
      return this.runRequest(
        "downloading",
        format,
        "accessPoint.management.qr.error",
        () =>
          this.compartment
            ? downloadCompartmentQrCode(
                this.accessPoint,
                this.compartment,
                format,
                this.tenantId
              )
            : downloadCompartmentQrSheet(this.accessPoint, this.tenantId)
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
        <v-btn icon :disabled="rotating" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-0">
        <div class="compartment-qr">
          <nav class="compartment-qr__list" data-test="compartment-qr-list">
            <button
              type="button"
              class="compartment-qr__item compartment-qr__item--all"
              :aria-current="all ? 'true' : 'false'"
              data-test="compartment-qr-all"
              @click="select('all')"
            >
              {{
                $t("accessPoint.management.compartmentQr.all", {
                  count: compartments.length,
                })
              }}
            </button>
            <template v-for="group in groups">
              <div
                :key="`head-${group.lockerBank.id}`"
                class="compartment-qr__head"
              >
                {{
                  $t("accessPoint.management.compartments.lockerBank", {
                    name: group.lockerBank.name,
                  })
                }}
              </div>
              <button
                v-for="compartment in group.compartments"
                :key="compartment.id"
                type="button"
                class="compartment-qr__item"
                :aria-current="selected === compartment.id ? 'true' : 'false'"
                :data-compartment-id="compartment.id"
                @click="select(compartment.id)"
              >
                {{
                  $t("accessPoint.management.compartments.compartment", {
                    number: compartment.number,
                  })
                }}
                <span
                  v-if="compartment.outOfService"
                  class="compartment-qr__out"
                >
                  {{ $t("accessPoint.management.compartments.outOfService") }}
                </span>
                <span
                  v-if="rotated[compartment.id]"
                  class="compartment-qr__new"
                >
                  {{ $t("accessPoint.management.compartmentQr.new") }}
                </span>
              </button>
            </template>
          </nav>

          <div class="compartment-qr__detail">
            <div class="compartment-qr__title">
              <template v-if="compartment">
                {{
                  $t("accessPoint.management.compartmentQr.compartmentTitle", {
                    name: compartment.lockerBank && compartment.lockerBank.name,
                    number: compartment.number,
                  })
                }}
              </template>
              <template v-else>
                {{ $t("accessPoint.management.compartmentQr.allTitle") }}
              </template>
            </div>
            <div class="compartment-qr__preview">
              <AccessPointQrPreview
                v-if="compartment"
                :access-point="accessPoint"
                :compartment="compartment"
                :version="previewVersion"
              />
              <p v-else-if="!compartments.length" class="text--secondary mb-0">
                {{ $t("accessPoint.management.compartmentQr.empty") }}
              </p>
              <div v-else class="compartment-qr__sheet" data-test="qr-sheet">
                <div
                  v-for="compartment in sheetPreview"
                  :key="compartment.id"
                  class="compartment-qr__label"
                >
                  <v-icon small>mdi-qrcode</v-icon>
                  {{
                    $t("accessPoint.management.compartments.compartment", {
                      number: compartment.number,
                    })
                  }}
                </div>
              </div>
            </div>

            <v-alert v-if="error" color="error" text dense class="mb-0">
              <v-icon left>mdi-alert-circle</v-icon>
              {{ error }}
            </v-alert>

            <div
              v-if="confirming"
              class="compartment-qr__question"
              data-test="rotate-question"
            >
              <div class="compartment-qr__title" data-test="rotate-text">
                {{ warning.question }}
              </div>
              <p class="mb-2" data-test="rotate-text">{{ warning.replaced }}</p>
              <v-alert
                v-if="warning.locks"
                color="warning"
                text
                dense
                class="mb-0"
              >
                <v-icon left>mdi-lock-alert-outline</v-icon>
                <span data-test="rotate-text">{{ warning.consequence }}</span>
              </v-alert>
              <p v-else class="text--secondary mb-0" data-test="rotate-text">
                {{ warning.consequence }}
              </p>
              <v-checkbox
                v-if="warning.needsAcknowledge"
                v-model="acknowledged"
                class="mt-2"
                hide-details
                dense
                :disabled="rotating"
                :label="$t('accessPoint.management.rotate.acknowledge')"
              />
              <div class="d-flex mt-3 compartment-qr__question-actions">
                <v-btn
                  color="error"
                  depressed
                  small
                  :loading="rotating"
                  :disabled="warning.needsAcknowledge && !acknowledged"
                  @click="rotate"
                >
                  {{ warning.confirm }}
                </v-btn>
                <v-btn text small :disabled="rotating" @click="ask(false)">
                  {{ $t("accessPoint.management.cancel") }}
                </v-btn>
              </div>
            </div>

            <template v-else>
              <v-btn
                color="primary"
                depressed
                block
                :loading="downloading === 'pdf'"
                :disabled="!compartments.length || !!downloading"
                data-test="compartment-qr-print"
                @click="print('pdf')"
              >
                <v-icon left>mdi-printer-outline</v-icon>
                {{ printLabel }}
              </v-btn>
              <div class="compartment-qr__formats">
                <template v-if="compartment">
                  {{ $t("accessPoint.management.compartmentQr.formats") }}
                  <a href="#" @click.prevent="print('svg')">SVG</a>
                  ·
                  <a href="#" @click.prevent="print('png')">PNG</a>
                </template>
                <template v-else>
                  {{ $t("accessPoint.management.compartmentQr.sheetHint") }}
                </template>
              </div>
            </template>
          </div>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="px-6 py-4">
        <v-btn
          v-if="!confirming"
          text
          small
          color="error"
          :disabled="!compartments.length || !!downloading"
          data-test="compartment-qr-rotate"
          @click="ask(true)"
        >
          <v-icon left small>mdi-autorenew</v-icon>
          {{
            all
              ? $t("accessPoint.management.rotate.allAction")
              : $t("accessPoint.management.rotate.action")
          }}
        </v-btn>
        <v-spacer />
        <v-btn outlined :disabled="rotating" @click="$emit('close')">
          {{ $t("accessPoint.management.close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.compartment-qr {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: 360px;
}

.compartment-qr__list {
  border-right: 1px solid var(--scb-rule);
  padding: var(--scb-space-2) 0;
  overflow-y: auto;
}

.compartment-qr__head {
  padding: var(--scb-space-3) var(--scb-space-4) 2px;
  font-size: var(--scb-font-size-caption);
  color: var(--scb-text-muted);
}

.compartment-qr__item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px var(--scb-space-4);
  text-align: left;
  font-size: var(--scb-font-size-sm);
  color: inherit;
}

.compartment-qr__item:hover {
  background: var(--scb-surface-tint-faint);
}

.compartment-qr__item[aria-current="true"] {
  background: var(--scb-surface-tint);
  box-shadow: inset 3px 0 0 var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
}

.compartment-qr__item--all {
  font-weight: var(--scb-font-weight-medium);
}

.compartment-qr__out {
  font-size: var(--scb-font-size-caption);
  color: var(--v-warning-darken2);
}

.compartment-qr__new {
  margin-left: auto;
  font-size: var(--scb-font-size-caption);
  color: var(--v-success-darken1);
}

.compartment-qr__question {
  padding: var(--scb-space-3);
  border-left: 3px solid var(--v-error-base);
  background: var(--scb-surface-tint-faint);
}

.compartment-qr__question-actions {
  gap: var(--scb-space-2);
}

.compartment-qr__detail {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-3);
  padding: var(--scb-space-5) var(--scb-space-6);
}

.compartment-qr__title {
  font-weight: var(--scb-font-weight-medium);
}

.compartment-qr__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--scb-space-3);
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-surface);
}

.compartment-qr__sheet {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--scb-space-1);
  width: 100%;
  max-width: 280px;
}

.compartment-qr__label {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  padding: var(--scb-space-1) var(--scb-space-2);
  border: 1px dashed var(--scb-surface-border);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
}

.compartment-qr__formats {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  text-align: center;
}

@media (max-width: 600px) {
  .compartment-qr {
    grid-template-columns: 1fr;
  }

  .compartment-qr__list {
    border-right: 0;
    border-bottom: 1px solid var(--scb-rule);
    max-height: 200px;
  }
}
</style>
