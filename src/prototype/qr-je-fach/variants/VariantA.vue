<script>
/**
 * PROTOTYPE (tickets#1049) — Variante A: alles im Zeilenmenü der Anlage.
 *
 * The row menu that holds QR and rotation for a door gets the same for a
 * Schließfachanlage: the Sammel-PDF and "alle rotieren" directly, a single
 * Fach through a small picker dialog. The edit dialog stays as it is and
 * only gains the switch „QR-Scan erforderlich“.
 */
import ProtoTable from "@/prototype/qr-je-fach/ProtoTable.vue";
import EditDialogStub from "@/prototype/qr-je-fach/EditDialogStub.vue";
import RotateDialog from "@/prototype/qr-je-fach/RotateDialog.vue";
import {
  FORMATS,
  compartmentName,
  fileName,
  stub,
} from "@/prototype/qr-je-fach/data";

export default {
  name: "VariantA",
  components: { ProtoTable, EditDialogStub, RotateDialog },
  props: { items: { type: Array, required: true } },
  data() {
    return {
      selected: null,
      edit: false,
      rotate: false,
      rotateCompartment: null,
      pick: false,
      pickedId: null,
    };
  },
  computed: {
    formats() {
      return FORMATS;
    },
    pickItems() {
      if (!this.selected) return [];
      return this.selected.compartments.map((c) => ({
        value: c.id,
        text: compartmentName(c) + (c.outOfService ? " (außer Betrieb)" : ""),
      }));
    },
    picked() {
      return (
        this.selected?.compartments.find((c) => c.id === this.pickedId) || null
      );
    },
  },
  methods: {
    openEdit(item) {
      this.selected = item;
      this.edit = true;
    },
    openPick(item) {
      this.selected = item;
      this.pickedId = item.compartments[0]?.id || null;
      this.pick = true;
    },
    openRotateAll(item) {
      this.selected = item;
      this.rotateCompartment = null;
      this.rotate = true;
    },
    rotatePicked() {
      this.rotateCompartment = this.picked;
      this.pick = false;
      this.rotate = true;
    },
    download(item, compartment, format) {
      stub(`Würde laden: ${fileName(item, compartment, format)}`);
    },
    downloadDoor(item, format) {
      stub(`Würde laden: access-point-${item.id}.${format} (wie heute)`);
    },
  },
};
</script>

<template>
  <div>
    <ProtoTable :items="items">
      <template v-slot:controls="{ item }">
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

            <!-- Door: as today -->
            <template v-if="!item.isLocker">
              <v-divider />
              <v-list-item
                v-for="f in formats"
                :key="f.key"
                link
                @click="downloadDoor(item, f.key)"
              >
                <v-list-item-icon>
                  <v-icon>{{ f.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>QR-Code als {{ f.text }}</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item link>
                <v-list-item-icon>
                  <v-icon>mdi-autorenew</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Scan-Code rotieren</v-list-item-title>
              </v-list-item>
            </template>

            <!-- Schließfachanlage of Open Locker: new -->
            <template v-else-if="item.hasQr">
              <v-divider />
              <v-subheader>QR-Codes der Fächer</v-subheader>
              <v-list-item link @click="download(item, null, 'pdf')">
                <v-list-item-icon>
                  <v-icon>mdi-file-pdf-box</v-icon>
                </v-list-item-icon>
                <v-list-item-title>
                  Alle drucken (Sammel-PDF, {{ item.compartments.length }})
                </v-list-item-title>
              </v-list-item>
              <v-list-item link @click="openPick(item)">
                <v-list-item-icon>
                  <v-icon>mdi-qrcode</v-icon>
                </v-list-item-icon>
                <v-list-item-title>QR-Code eines Fachs …</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item link @click="openRotateAll(item)">
                <v-list-item-icon>
                  <v-icon>mdi-autorenew</v-icon>
                </v-list-item-icon>
                <v-list-item-title
                  >Alle Scan-Codes rotieren …</v-list-item-title
                >
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

    <!-- One Fach: pick it, then print or rotate -->
    <v-dialog v-model="pick" max-width="520">
      <v-card v-if="selected">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>mdi-qrcode</v-icon>
          <span class="text-h5">QR-Code eines Fachs</span>
          <v-spacer />
          <v-btn icon @click="pick = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-autocomplete
            v-model="pickedId"
            :items="pickItems"
            label="Fach"
            filled
            dense
            background-color="accent"
            hide-details
            class="mb-4"
          />
          <div class="d-flex align-center flex-wrap" style="gap: 8px">
            <v-btn
              color="primary"
              :disabled="!picked"
              @click="download(selected, picked, 'pdf')"
            >
              <v-icon left>mdi-file-pdf-box</v-icon>
              Drucken (PDF, A4)
            </v-btn>
            <v-btn
              text
              small
              :disabled="!picked"
              @click="download(selected, picked, 'svg')"
            >
              SVG
            </v-btn>
            <v-btn
              text
              small
              :disabled="!picked"
              @click="download(selected, picked, 'png')"
            >
              PNG
            </v-btn>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-6 py-4">
          <v-btn text color="error" :disabled="!picked" @click="rotatePicked">
            <v-icon left small>mdi-autorenew</v-icon>
            Scan-Code dieses Fachs rotieren …
          </v-btn>
          <v-spacer />
          <v-btn outlined @click="pick = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <EditDialogStub
      :open="edit && selected && selected.isLocker"
      :anlage="selected"
      show-rule
      @close="edit = false"
    />
    <RotateDialog
      :open="rotate"
      :anlage="selected"
      :compartment="rotateCompartment"
      guard="confirm"
      @close="rotate = false"
    />
  </div>
</template>
