<script>
/**
 * PROTOTYPE (tickets#1049) — Variante B: am Fach im Dialog der Anlage.
 *
 * Where a Fach is chosen and set out of service, it is also printed and
 * rotated: every row of the Fächer list gets its QR actions, the head of the
 * list "alle drucken" and "alle rotieren". The row menu keeps only the
 * Sammel-PDF as a shortcut. The switch „QR-Scan erforderlich“ sits in the same
 * dialog. Catch: a Fach chosen but not yet saved has no code yet.
 */
import ProtoTable from "@/prototype/qr-je-fach/ProtoTable.vue";
import EditDialogStub from "@/prototype/qr-je-fach/EditDialogStub.vue";
import RotateDialog from "@/prototype/qr-je-fach/RotateDialog.vue";
import { fileName, stub } from "@/prototype/qr-je-fach/data";

export default {
  name: "VariantB",
  components: { ProtoTable, EditDialogStub, RotateDialog },
  props: { items: { type: Array, required: true } },
  data() {
    return {
      selected: null,
      edit: false,
      rotate: false,
      rotateCompartment: null,
    };
  },
  methods: {
    openEdit(item) {
      this.selected = item;
      this.edit = true;
    },
    openRotate(compartment) {
      this.rotateCompartment = compartment;
      this.rotate = true;
    },
    download(item, compartment, format) {
      stub(`Würde laden: ${fileName(item, compartment, format)}`);
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
              <v-list-item-title>
                {{
                  item.hasQr ? "Bearbeiten, Fächer & QR-Codes" : "Bearbeiten"
                }}
              </v-list-item-title>
            </v-list-item>
            <template v-if="item.hasQr">
              <v-divider />
              <v-list-item link @click="download(item, null, 'pdf')">
                <v-list-item-icon>
                  <v-icon>mdi-file-pdf-box</v-icon>
                </v-list-item-icon>
                <v-list-item-title
                  >Alle QR-Codes drucken (Sammel-PDF)</v-list-item-title
                >
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

    <EditDialogStub
      :open="edit && selected && selected.isLocker"
      :anlage="selected"
      show-rule
      @close="edit = false"
    >
      <template v-slot:compartments-actions>
        <v-btn
          small
          text
          color="primary"
          @click="download(selected, null, 'pdf')"
        >
          <v-icon left small>mdi-file-pdf-box</v-icon>
          Alle drucken
        </v-btn>
        <v-btn small text color="error" @click="openRotate(null)">
          <v-icon left small>mdi-autorenew</v-icon>
          Alle rotieren …
        </v-btn>
      </template>

      <template v-slot:compartment-actions="{ compartment }">
        <span
          v-if="compartment.rotations"
          class="text-caption success--text mr-2"
        >
          neu, {{ compartment.rotations }}× rotiert
        </span>
        <v-btn
          icon
          small
          title="QR-Code drucken (PDF, A4)"
          @click="download(selected, compartment, 'pdf')"
        >
          <v-icon small>mdi-file-pdf-box</v-icon>
        </v-btn>
        <v-menu offset-y left>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon small title="Weitere Formate" v-bind="attrs" v-on="on">
              <v-icon small>mdi-qrcode</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item link @click="download(selected, compartment, 'svg')">
              <v-list-item-title>QR-Code als SVG</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="download(selected, compartment, 'png')">
              <v-list-item-title>QR-Code als PNG</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          icon
          small
          title="Scan-Code rotieren"
          @click="openRotate(compartment)"
        >
          <v-icon small>mdi-autorenew</v-icon>
        </v-btn>
      </template>
    </EditDialogStub>

    <RotateDialog
      :open="rotate"
      :anlage="selected"
      :compartment="rotateCompartment"
      guard="checkbox"
      @close="rotate = false"
    />
  </div>
</template>
