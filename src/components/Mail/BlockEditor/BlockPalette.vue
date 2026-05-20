<template>
  <div class="block-palette">
    <div class="text-caption font-weight-medium grey--text mb-2">REIHEN</div>
    <div class="palette-grid">
      <div
        v-for="(row, idx) in rowPalette"
        :key="'row-' + idx"
        class="palette-item"
        :title="row.label"
        @click="$emit('add-row', row.layout)"
      >
        <v-icon small>{{ row.icon }}</v-icon>
        <div class="palette-label">{{ row.label }}</div>
      </div>
    </div>

    <v-divider class="my-3" />

    <div class="text-caption font-weight-medium grey--text mb-2">BAUSTEINE</div>
    <div class="palette-grid">
      <div
        v-for="b in blockPalette"
        :key="b.type"
        class="palette-item"
        :title="b.label"
        @click="$emit('add-block', b.type)"
      >
        <v-icon small>{{ b.icon }}</v-icon>
        <div class="palette-label">{{ b.label }}</div>
      </div>
    </div>

    <v-divider class="my-3" v-if="variables.length" />

    <div v-if="variables.length">
      <div class="text-caption font-weight-medium grey--text mb-2">
        VERFÜGBARE VARIABLEN
      </div>
      <div class="variables-list">
        <div
          v-for="v in variables"
          :key="v.name"
          class="variable-row"
          :title="v.description"
        >
          <div class="variable-label">{{ v.label || v.name }}</div>
          <code class="variable-code">{{ v.placeholder }}</code>
        </div>
      </div>
      <v-alert
        type="info"
        text
        dense
        class="mt-2 text-caption"
      >
        Variablen lassen sich im Text-Baustein über den Variablen-Button einfügen.
      </v-alert>
    </div>
  </div>
</template>

<script>
import { BLOCK_PALETTE, ROW_PALETTE } from "./blockFactory.js";

export default {
  name: "BlockPalette",
  props: {
    variables: { type: Array, default: () => [] },
  },
  data: () => ({
    blockPalette: BLOCK_PALETTE,
    rowPalette: ROW_PALETTE,
  }),
};
</script>

<style scoped>
.block-palette {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  min-height: 400px;
}
.palette-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.palette-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
  min-height: 56px;
}
.palette-item:hover {
  border-color: var(--v-primary-base);
  background: var(--v-primary-lighten5, #e3f2fd);
}
.palette-label {
  font-size: 11px;
  margin-top: 3px;
  line-height: 1.1;
}
.variables-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.variable-row {
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 4px 6px;
}
.variable-label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}
.variable-code {
  display: inline-block;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #c2185b;
  font-family: "Courier New", monospace;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
