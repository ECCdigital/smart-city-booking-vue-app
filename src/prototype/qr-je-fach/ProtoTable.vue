<script>
/**
 * PROTOTYPE (tickets#1049) — the list of access points as it is today
 * (`AccessPointManagement.vue`), reduced to what the question needs. The row
 * menu and an optional expansion are slots, so each variant brings its own.
 */
export default {
  name: "ProtoTable",
  props: {
    items: { type: Array, required: true },
    // Variant D: a Schließfachanlage with QR opens below its row.
    expandable: { type: Boolean, default: false },
  },
  data() {
    return { expanded: [] };
  },
  computed: {
    headers() {
      const headers = [
        { text: "Bezeichnung", value: "label" },
        { text: "Anbieter", value: "providerTitle" },
        { text: "Typ", value: "typeLabel" },
        { text: "Zuordnung", value: "assignment" },
        { text: "QR-Scan", value: "qrScanRequired" },
        { text: "", value: "controls", sortable: false, align: "end" },
      ];
      if (this.expandable)
        headers.push({ text: "", value: "data-table-expand", width: 48 });
      return headers;
    },
  },
  mounted() {
    if (this.expandable) {
      this.expanded = this.items.filter((i) => i.hasQr);
    }
  },
};
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :expanded.sync="expanded"
    :show-expand="expandable"
    item-key="id"
    hide-default-footer
    class="accent elevation-1"
  >
    <template v-slot:item.label="{ item }">
      <div class="font-weight-medium">{{ item.label }}</div>
      <div v-if="item.hasQr" class="text-caption text--secondary">
        {{ item.compartments.length }} Fächer in
        {{ new Set(item.compartments.map((c) => c.lockerBank.id)).size }}
        Schränken
      </div>
    </template>

    <template v-slot:item.typeLabel="{ item }">
      <v-chip x-small label :color="item.isLocker ? 'indigo' : 'primary'" dark>
        {{ item.typeLabel }}
      </v-chip>
    </template>

    <template v-slot:item.qrScanRequired="{ item }">
      <span
        v-if="item.isLocker && !item.hasQr"
        class="text-caption text--secondary"
      >
        entfällt
      </span>
      <v-chip v-else-if="item.qrScanRequired" x-small label color="primary">
        erforderlich
      </v-chip>
      <v-chip v-else x-small label color="grey lighten-1">nicht nötig</v-chip>
      <div v-if="item.hasQr" class="text-caption text--secondary">
        für alle Fächer
      </div>
    </template>

    <template v-slot:item.controls="{ item }">
      <slot name="controls" :item="item" />
    </template>

    <template v-slot:item.data-table-expand="{ item, isExpanded, expand }">
      <v-btn v-if="item.hasQr" icon small @click="expand(!isExpanded)">
        <v-icon>
          {{ isExpanded ? "mdi-chevron-up" : "mdi-chevron-down" }}
        </v-icon>
      </v-btn>
    </template>

    <template v-slot:expanded-item="{ headers, item }">
      <td :colspan="headers.length" class="pa-0">
        <slot name="expanded" :item="item" />
      </td>
    </template>
  </v-data-table>
</template>
