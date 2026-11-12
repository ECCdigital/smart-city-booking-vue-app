<script>
/**
 * PROTOTYPE (tickets#1049) — the edit dialog of a Schließfachanlage
 * (`AccessPointEditDialog.vue`), cut down to the parts the question touches:
 * the Fächer and the Validierungsregeln. Slots let a variant hang actions at
 * each Fach and at the head of the Fächer.
 */
import { groupByBank, stub } from "@/prototype/qr-je-fach/data";

export default {
  name: "EditDialogStub",
  props: {
    open: { type: Boolean, default: false },
    anlage: { type: Object, default: null },
    // Whether the switch „QR-Scan erforderlich“ stands in this dialog.
    showRule: { type: Boolean, default: true },
  },
  data() {
    return { qrScanRequired: false };
  },
  computed: {
    groups() {
      return this.anlage ? groupByBank(this.anlage.compartments) : [];
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen && this.anlage)
        this.qrScanRequired = this.anlage.qrScanRequired;
    },
  },
  methods: {
    save() {
      if (this.showRule) this.anlage.qrScanRequired = this.qrScanRequired;
      stub("Würde die Anlage speichern.");
      this.$emit("close");
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="860"
    scrollable
    persistent
    @input="!$event && $emit('close')"
  >
    <v-card v-if="anlage">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-locker-multiple</v-icon>
        <span class="text-h5">Schließfachanlage bearbeiten</span>
        <v-spacer />
        <v-btn icon @click="$emit('close')"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <v-row dense>
          <v-col cols="12" md="8">
            <v-text-field
              :value="anlage.label"
              label="Bezeichnung"
              filled
              dense
              background-color="accent"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              :value="anlage.providerTitle"
              label="Anbieter"
              filled
              dense
              disabled
              hide-details
            />
          </v-col>
        </v-row>

        <div class="section-title mt-6 mb-2">
          <v-icon small left>mdi-locker-multiple</v-icon>
          <span class="font-weight-medium">Fächer der Anlage</span>
          <v-spacer />
          <slot name="compartments-actions" />
        </div>
        <div class="text-caption text--secondary mb-3">
          Wählen Sie die Fächer der Anlage aus der Liste des Anbieters, auch aus
          mehreren Schließfachschränken.
        </div>

        <div v-for="group in groups" :key="group.lockerBank.id" class="mb-3">
          <div class="font-weight-medium mb-1">
            Schrank {{ group.lockerBank.name }}
          </div>
          <div
            v-for="compartment in group.compartments"
            :key="compartment.id"
            class="compartment-row d-flex align-center"
          >
            <v-checkbox
              :input-value="true"
              :label="`Fach ${compartment.number}`"
              dense
              hide-details
              class="mt-0 mr-6"
              style="min-width: 90px"
            />
            <v-switch
              v-model="compartment.outOfService"
              label="außer Betrieb"
              color="warning"
              dense
              hide-details
              class="mt-0"
            />
            <v-spacer />
            <slot name="compartment-actions" :compartment="compartment" />
          </div>
        </div>

        <template v-if="showRule">
          <div class="section-title mt-6 mb-2">
            <v-icon small left>mdi-shield-check</v-icon>
            <span class="font-weight-medium">Validierungsregeln</span>
          </div>
          <v-switch
            v-model="qrScanRequired"
            color="primary"
            hide-details
            class="mt-0"
          >
            <template v-slot:label>
              <div>
                <div class="font-weight-medium">QR-Scan erforderlich</div>
                <div class="text-caption text--secondary">
                  Gilt für alle Fächer der Anlage: Ein Fach öffnet sich nur,
                  wenn sein eigener QR-Code vor Ort gescannt wurde.
                </div>
              </div>
            </template>
          </v-switch>
        </template>

        <div class="section-title mt-6 mb-3">
          <v-icon small left>mdi-map-marker</v-icon>
          <span class="font-weight-medium">Standort</span>
        </div>
        <div class="text-body-2 text--secondary">
          (unverändert, im Prototyp ausgelassen)
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('close')">Abbrechen</v-btn>
        <v-btn color="primary" @click="save">
          <v-icon left small>mdi-content-save</v-icon>
          Speichern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 4px;
}
.compartment-row:hover {
  background: rgba(0, 0, 0, 0.03);
}
</style>
