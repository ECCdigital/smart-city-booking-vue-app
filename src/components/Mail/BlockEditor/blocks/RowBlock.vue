<template>
  <div class="row-block" :class="{ selected }" @click.stop="$emit('select')">
    <div class="row-controls" v-if="selected">
      <v-btn icon x-small class="drag-handle" title="Reihe verschieben">
        <v-icon x-small>mdi-drag-vertical</v-icon>
      </v-btn>
      <v-btn-toggle
        :value="layoutIdx"
        mandatory
        dense
        @change="onLayoutChange"
      >
        <v-btn x-small title="1 Spalte" :value="0">
          <v-icon x-small>mdi-square-outline</v-icon>
        </v-btn>
        <v-btn x-small title="2 Spalten 50/50" :value="1">
          <v-icon x-small>mdi-view-column-outline</v-icon>
        </v-btn>
        <v-btn x-small title="2 Spalten 33/66" :value="2">
          <v-icon x-small>mdi-view-split-vertical</v-icon>
        </v-btn>
        <v-btn x-small title="2 Spalten 66/33" :value="3">
          <v-icon x-small style="transform: scaleX(-1)">mdi-view-split-vertical</v-icon>
        </v-btn>
        <v-btn x-small title="3 Spalten" :value="4">
          <v-icon x-small>mdi-view-grid-outline</v-icon>
        </v-btn>
      </v-btn-toggle>
      <v-btn icon x-small @click.stop="$emit('duplicate')" title="Duplizieren">
        <v-icon x-small>mdi-content-copy</v-icon>
      </v-btn>
      <v-btn icon x-small @click.stop="$emit('remove')" title="Entfernen">
        <v-icon x-small color="error">mdi-delete</v-icon>
      </v-btn>
    </div>

    <div class="row-grid" :style="rowStyle">
      <div
        v-for="(col, ci) in block.columns"
        :key="ci"
        class="row-column"
        :style="{ flex: col.width }"
      >
        <draggable
          :list="col.blocks"
          group="blocks"
          handle=".drag-handle"
          :animation="150"
          ghost-class="ghost-block"
          class="column-dropzone"
          @change="onColumnChange(ci, $event)"
        >
          <BlockItem
            v-for="b in col.blocks"
            :key="b.id"
            :block="b"
            :variables="variables"
            :selected="selectedBlockId === b.id"
            @select="$emit('select-block', b.id)"
            @update="(updated) => onUpdateBlock(ci, b.id, updated)"
            @duplicate="onDuplicateBlock(ci, b.id)"
            @remove="onRemoveBlock(ci, b.id)"
          />
        </draggable>
        <div
          v-if="!col.blocks || col.blocks.length === 0"
          class="empty-column-hint"
        >
          Block hier ablegen
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import BlockItem from "./BlockItem.vue";
import { cryptoRandomId } from "@/components/Mail/BlockEditor/render/renderBlocksToHtml.js";

const LAYOUTS = [
  [12],
  [6, 6],
  [4, 8],
  [8, 4],
  [4, 4, 4],
];

export default {
  name: "RowBlock",
  components: { draggable, BlockItem },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    selected: { type: Boolean, default: false },
    selectedBlockId: { type: String, default: "" },
  },
  computed: {
    layoutIdx() {
      const widths = (this.block.columns || []).map((c) => c.width).join(",");
      const idx = LAYOUTS.findIndex((l) => l.join(",") === widths);
      return idx === -1 ? 0 : idx;
    },
    rowStyle() {
      const bg = this.block.background;
      const paddingY = Number.isFinite(this.block.paddingY)
        ? this.block.paddingY
        : 0;
      return {
        background: bg || "transparent",
        padding: paddingY ? `${paddingY}px 0` : "0",
      };
    },
  },
  methods: {
    onLayoutChange(idx) {
      const layout = LAYOUTS[idx];
      const oldColumns = this.block.columns || [];
      const newColumns = layout.map((width, i) => ({
        width,
        blocks: oldColumns[i] ? oldColumns[i].blocks : [],
      }));
      if (oldColumns.length > layout.length) {
        const extra = oldColumns
          .slice(layout.length)
          .reduce((acc, c) => acc.concat(c.blocks || []), []);
        newColumns[newColumns.length - 1].blocks = [
          ...newColumns[newColumns.length - 1].blocks,
          ...extra,
        ];
      }
      this.$emit("update", { ...this.block, columns: newColumns });
    },
    onColumnChange(ci, evt) {
      this.$emit("update", { ...this.block, columns: [...this.block.columns] });
      if (evt.added) this.$emit("select-block", evt.added.element.id);
    },
    onUpdateBlock(ci, blockId, updated) {
      const columns = this.block.columns.map((c, idx) => {
        if (idx !== ci) return c;
        const blocks = (c.blocks || []).map((b) =>
          b.id === blockId ? { ...updated, id: blockId } : b
        );
        return { ...c, blocks };
      });
      this.$emit("update", { ...this.block, columns });
    },
    onDuplicateBlock(ci, blockId) {
      const columns = this.block.columns.map((c, idx) => {
        if (idx !== ci) return c;
        const blocks = [];
        (c.blocks || []).forEach((b) => {
          blocks.push(b);
          if (b.id === blockId) {
            blocks.push({ ...JSON.parse(JSON.stringify(b)), id: cryptoRandomId() });
          }
        });
        return { ...c, blocks };
      });
      this.$emit("update", { ...this.block, columns });
    },
    onRemoveBlock(ci, blockId) {
      const columns = this.block.columns.map((c, idx) => {
        if (idx !== ci) return c;
        return { ...c, blocks: (c.blocks || []).filter((b) => b.id !== blockId) };
      });
      this.$emit("update", { ...this.block, columns });
    },
  },
};
</script>

<style scoped>
.row-block {
  position: relative;
  border: 1px dashed transparent;
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  background: #fafafa;
  transition: all 0.15s ease;
}
.row-block:hover {
  border-color: #ddd;
}
.row-block.selected {
  border-color: var(--v-primary-base);
  border-style: solid;
}
.row-controls {
  position: absolute;
  top: -14px;
  left: 8px;
  background: white;
  border-radius: 12px;
  padding: 2px 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  display: flex;
  gap: 4px;
  z-index: 3;
  align-items: center;
}
.row-grid {
  display: flex;
  gap: 8px;
  min-height: 60px;
  align-items: stretch;
}
.row-column {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.column-dropzone {
  flex: 1;
  min-height: 40px;
}
.empty-column-hint {
  border: 2px dashed #ddd;
  border-radius: 4px;
  text-align: center;
  padding: 16px 8px;
  color: #aaa;
  font-size: 12px;
}
.ghost-block {
  opacity: 0.4;
  background: var(--v-primary-lighten4);
  border: 2px dashed var(--v-primary-base);
}
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
</style>
