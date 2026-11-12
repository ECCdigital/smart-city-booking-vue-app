<script>
/**
 * PROTOTYPE (tickets#1049) — Variante C: ein eigener Dialog „QR-Codes der Fächer“.
 *
 * QR is its own concern, apart from editing the Anlage: one dialog per Anlage
 * holds the scan obligation, a table of the Fächer with checkboxes, and the
 * actions for one Fach, the selection or all. The edit dialog stays free of
 * QR. Rotating many asks for the number of Fächer to be typed in.
 */
import ProtoTable from "@/prototype/qr-je-fach/ProtoTable.vue";
import EditDialogStub from "@/prototype/qr-je-fach/EditDialogStub.vue";
import RotateDialog from "@/prototype/qr-je-fach/RotateDialog.vue";
import { fileName, stub } from "@/prototype/qr-je-fach/data";

export default {
  name: "VariantC",
  components: { ProtoTable, EditDialogStub, RotateDialog },
  props: { items: { type: Array, required: true } },
  data() {
    return {
      selected: null,
      edit: false,
      qr: false,
      rotate: false,
      rotateCompartment: null,
      chosen: [],
      search: "",
    };
  },
  computed: {
    rows() {
      if (!this.selected) return [];
      return this.selected.compartments.map((c) => ({
        ...c,
        bank: `Schrank ${c.lockerBank.name}`,
        original: c,
      }));
    },
    headers() {
      return [
        { text: "Fach", value: "number" },
        { text: "Zustand", value: "outOfService" },
        { text: "QR-Code", value: "actions", sortable: false, align: "end" },
      ];
    },
  },
  methods: {
    openEdit(item) {
      this.selected = item;
      this.edit = true;
    },
    openQr(item) {
      this.selected = item;
      this.chosen = [];
      this.qr = true;
    },
    openRotate(compartment) {
      this.rotateCompartment = compartment;
      this.rotate = true;
    },
    download(compartment, format) {
      stub(`Würde laden: ${fileName(this.selected, compartment, format)}`);
    },
    downloadChosen() {
      stub(
        `Würde laden: Sammel-PDF mit ${
          this.chosen.length
        } Fächern (${this.chosen
          .map((c) => `${c.lockerBank.name}${c.number}`)
          .join(", ")})`
      );
    },
    rotateChosen() {
      this.chosen.forEach((c) => (c.original.rotations += 1));
      stub(
        `Würde ${this.chosen.length} Scan-Codes rotieren. (Im Prototyp ohne Rückfrage — für die Auswahl wäre dieselbe Rückfrage nötig wie für alle.)`
      );
    },
  },
};
</script>

<template>
  <div>
    <ProtoTable :items="items">
      <template v-slot:controls="{ item }">
        <v-btn
          v-if="item.hasQr"
          small
          text
          color="primary"
          class="mr-1"
          @click="openQr(item)"
        >
          <v-icon left small>mdi-qrcode</v-icon>
          QR-Codes
        </v-btn>
        <v-menu offset-y left>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on">
              <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item link @click="openEdit(item)">
              <v-list-item-icon><v-icon>mdi-pencil</v-icon></v-list-item-icon>
              <v-list-item-title>Bearbeiten</v-list-item-title>
            </v-list-item>
            <template v-if="item.hasQr">
              <v-list-item link @click="openQr(item)">
                <v-list-item-icon><v-icon>mdi-qrcode</v-icon></v-list-item-icon>
                <v-list-item-title>QR-Codes der Fächer …</v-list-item-title>
              </v-list-item>
            </template>
            <template v-if="!item.isLocker">
              <v-divider />
              <v-list-item link>
                <v-list-item-icon><v-icon>mdi-qrcode</v-icon></v-list-item-icon>
                <v-list-item-title>QR-Code … (wie heute)</v-list-item-title>
              </v-list-item>
            </template>
            <v-divider />
            <v-list-item link>
              <v-list-item-icon>
                <v-icon color="error">mdi-delete</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Löschen</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </ProtoTable>

    <v-dialog v-model="qr" max-width="760" scrollable>
      <v-card v-if="selected">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>mdi-qrcode</v-icon>
          <div>
            <div class="text-h5">QR-Codes der Fächer</div>
            <div class="text-caption text--secondary">
              {{ selected.label }} · {{ selected.compartments.length }} Fächer
            </div>
          </div>
          <v-spacer />
          <v-btn icon @click="qr = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-6">
          <v-sheet color="accent" rounded class="pa-3 mb-4 d-flex align-center">
            <v-switch
              v-model="selected.qrScanRequired"
              color="primary"
              hide-details
              class="mt-0"
            >
              <template v-slot:label>
                <div>
                  <div class="font-weight-medium">QR-Scan erforderlich</div>
                  <div class="text-caption text--secondary">
                    Für alle Fächer. Wirkt sofort, ohne Speichern.
                  </div>
                </div>
              </template>
            </v-switch>
          </v-sheet>

          <div class="d-flex align-center flex-wrap mb-2" style="gap: 8px">
            <v-btn color="primary" @click="download(null, 'pdf')">
              <v-icon left>mdi-file-pdf-box</v-icon>
              Alle drucken (Sammel-PDF)
            </v-btn>
            <v-btn outlined color="error" @click="openRotate(null)">
              <v-icon left>mdi-autorenew</v-icon>
              Alle rotieren …
            </v-btn>
            <v-spacer />
            <template v-if="chosen.length">
              <span class="text-body-2">{{ chosen.length }} gewählt:</span>
              <v-btn small text color="primary" @click="downloadChosen">
                Drucken
              </v-btn>
              <v-btn small text color="error" @click="rotateChosen">
                Rotieren
              </v-btn>
            </template>
          </div>

          <v-data-table
            v-model="chosen"
            :headers="headers"
            :items="rows"
            group-by="bank"
            show-select
            item-key="id"
            dense
            hide-default-footer
            disable-pagination
            class="elevation-0"
          >
            <template v-slot:group.header="{ group, headers, toggle, isOpen }">
              <td :colspan="headers.length" class="accent">
                <v-btn icon x-small @click="toggle">
                  <v-icon>
                    {{ isOpen ? "mdi-chevron-down" : "mdi-chevron-right" }}
                  </v-icon>
                </v-btn>
                <strong>{{ group }}</strong>
              </td>
            </template>
            <template v-slot:item.number="{ item }">
              Fach {{ item.number }}
              <span
                v-if="item.original.rotations"
                class="text-caption success--text ml-2"
              >
                neu
              </span>
            </template>
            <template v-slot:item.outOfService="{ item }">
              <v-chip
                v-if="item.outOfService"
                x-small
                label
                color="warning"
                dark
              >
                außer Betrieb
              </v-chip>
              <span v-else class="text-caption text--secondary"
                >in Betrieb</span
              >
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn
                x-small
                text
                title="PDF, A4"
                @click="download(item.original, 'pdf')"
              >
                PDF
              </v-btn>
              <v-btn x-small text @click="download(item.original, 'svg')">
                SVG
              </v-btn>
              <v-btn x-small text @click="download(item.original, 'png')">
                PNG
              </v-btn>
              <v-btn
                icon
                x-small
                title="Scan-Code rotieren"
                @click="openRotate(item.original)"
              >
                <v-icon small>mdi-autorenew</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <EditDialogStub
      :open="edit && selected && selected.isLocker"
      :anlage="selected"
      :show-rule="false"
      @close="edit = false"
    />
    <RotateDialog
      :open="rotate"
      :anlage="selected"
      :compartment="rotateCompartment"
      guard="typed"
      @close="rotate = false"
    />
  </div>
</template>
