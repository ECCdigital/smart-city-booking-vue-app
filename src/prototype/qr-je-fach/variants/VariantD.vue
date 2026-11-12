<script>
/**
 * PROTOTYPE (tickets#1049) — Variante D: die Anlage klappt in der Liste auf.
 *
 * No dialog at all: a Schließfachanlage with QR opens below its row and shows
 * its Schließfachschränke as cards, each Fach as a tile, roughly like the
 * cabinet on site. A tile opens its QR actions; each Schrank can be printed
 * and rotated on its own, besides "alle". The scan obligation is a switch in
 * the panel's head.
 */
import ProtoTable from "@/prototype/qr-je-fach/ProtoTable.vue";
import EditDialogStub from "@/prototype/qr-je-fach/EditDialogStub.vue";
import RotateDialog from "@/prototype/qr-je-fach/RotateDialog.vue";
import { fileName, groupByBank, stub } from "@/prototype/qr-je-fach/data";

export default {
  name: "VariantD",
  components: { ProtoTable, EditDialogStub, RotateDialog },
  props: { items: { type: Array, required: true } },
  data() {
    return {
      selected: null,
      edit: false,
      rotate: false,
      rotateCompartment: null,
      rotateBank: null,
    };
  },
  methods: {
    groups(item) {
      return groupByBank(item.compartments);
    },
    openEdit(item) {
      this.selected = item;
      this.edit = true;
    },
    openRotate(item, compartment, bank) {
      this.selected = item;
      this.rotateCompartment = compartment;
      this.rotateBank = bank;
      this.rotate = true;
    },
    download(item, compartment, format) {
      stub(`Würde laden: ${fileName(item, compartment, format)}`);
    },
    downloadBank(item, bank) {
      const n = item.compartments.filter(
        (c) => c.lockerBank.id === bank.id
      ).length;
      stub(`Würde laden: Sammel-PDF nur Schrank ${bank.name} (${n} Fächer)`);
    },
  },
};
</script>

<template>
  <div>
    <ProtoTable :items="items" expandable>
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

      <template v-slot:expanded="{ item }">
        <div class="panel pa-4">
          <div class="d-flex align-center flex-wrap mb-3" style="gap: 12px">
            <v-switch
              v-model="item.qrScanRequired"
              color="primary"
              dense
              hide-details
              class="mt-0"
              label="QR-Scan erforderlich (alle Fächer)"
            />
            <v-spacer />
            <v-btn small color="primary" @click="download(item, null, 'pdf')">
              <v-icon left small>mdi-file-pdf-box</v-icon>
              Alle drucken
            </v-btn>
            <v-btn
              small
              outlined
              color="error"
              @click="openRotate(item, null, null)"
            >
              <v-icon left small>mdi-autorenew</v-icon>
              Alle rotieren …
            </v-btn>
          </div>

          <div class="d-flex flex-wrap" style="gap: 16px">
            <v-card
              v-for="group in groups(item)"
              :key="group.lockerBank.id"
              outlined
              class="bank"
            >
              <v-card-title class="py-2 px-3 text-subtitle-1">
                Schrank {{ group.lockerBank.name }}
                <v-spacer />
                <v-btn
                  icon
                  small
                  title="Diesen Schrank drucken"
                  @click="downloadBank(item, group.lockerBank)"
                >
                  <v-icon small>mdi-file-pdf-box</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  title="Diesen Schrank rotieren"
                  @click="openRotate(item, null, group.lockerBank)"
                >
                  <v-icon small>mdi-autorenew</v-icon>
                </v-btn>
              </v-card-title>
              <v-divider />
              <div class="tiles pa-3">
                <v-menu v-for="c in group.compartments" :key="c.id" offset-y>
                  <template v-slot:activator="{ on, attrs }">
                    <button
                      class="tile"
                      :class="{
                        'tile--off': c.outOfService,
                        'tile--new': c.rotations,
                      }"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <span class="tile__nr">{{ c.number }}</span>
                      <v-icon x-small class="tile__qr">mdi-qrcode</v-icon>
                    </button>
                  </template>
                  <v-list dense>
                    <v-subheader>
                      Schrank {{ c.lockerBank.name }} · Fach {{ c.number }}
                      <span v-if="c.outOfService">&nbsp;(außer Betrieb)</span>
                    </v-subheader>
                    <v-list-item link @click="download(item, c, 'pdf')">
                      <v-list-item-icon>
                        <v-icon>mdi-file-pdf-box</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Drucken (PDF, A4)</v-list-item-title>
                    </v-list-item>
                    <v-list-item link @click="download(item, c, 'svg')">
                      <v-list-item-icon>
                        <v-icon>mdi-qrcode</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>SVG</v-list-item-title>
                    </v-list-item>
                    <v-list-item link @click="download(item, c, 'png')">
                      <v-list-item-icon>
                        <v-icon>mdi-qrcode</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>PNG</v-list-item-title>
                    </v-list-item>
                    <v-divider />
                    <v-list-item link @click="openRotate(item, c, null)">
                      <v-list-item-icon>
                        <v-icon>mdi-autorenew</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title
                        >Scan-Code rotieren …</v-list-item-title
                      >
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </v-card>
          </div>
          <div class="text-caption text--secondary mt-2">
            Orange: außer Betrieb, Code bleibt gültig. Grün: in dieser Sitzung
            rotiert, neu drucken.
          </div>
        </div>
      </template>
    </ProtoTable>

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
      :locker-bank="rotateBank"
      guard="confirm"
      @close="rotate = false"
    />
  </div>
</template>

<style scoped>
.panel {
  background: rgba(0, 0, 0, 0.02);
}
.bank {
  min-width: 260px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(4, 52px);
  gap: 6px;
}
.tile {
  position: relative;
  height: 52px;
  border: 2px solid #9aa4b1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.tile:hover {
  border-color: var(--v-primary-base, #1976d2);
}
.tile--off {
  border-color: #f2a33a;
  background: #fff6e8;
}
.tile--new {
  border-color: #2e9d4f;
  background: #eaf7ee;
}
.tile__nr {
  font-weight: 700;
  font-size: 16px;
}
.tile__qr {
  position: absolute;
  right: 3px;
  bottom: 3px;
  opacity: 0.5;
}
</style>
