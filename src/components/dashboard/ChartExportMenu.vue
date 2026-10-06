<template>
  <v-menu offset-y left>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        icon
        small
        v-bind="attrs"
        v-on="on"
        :aria-label="`Download ${title}`"
      >
        <v-icon small>mdi-download</v-icon>
      </v-btn>
    </template>
    <v-list dense>
      <v-list-item link @click="$emit('jpg')">
        <v-list-item-icon class="mr-2">
          <v-icon small>mdi-file-jpg-box</v-icon>
        </v-list-item-icon>
        <v-list-item-title>Als JPG</v-list-item-title>
      </v-list-item>
      <v-list-item link @click="$emit('excel')">
        <v-list-item-icon class="mr-2">
          <v-icon small>mdi-microsoft-excel</v-icon>
        </v-list-item-icon>
        <v-list-item-title>Als Excel-Tabelle</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
export default {
  name: "ChartExportMenu",
  props: {
    title: {
      type: String,
      default: "",
    },
  },
};
</script>
