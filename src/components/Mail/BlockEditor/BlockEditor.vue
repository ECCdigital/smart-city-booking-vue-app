<template>
  <div class="block-editor">
    <v-row no-gutters>
      <v-col cols="12" md="3" class="pr-md-2">
        <BlockPalette
          :variables="variables"
          @add-block="onAddBlock"
          @add-row="onAddRow"
        />
      </v-col>
      <v-col cols="12" md="6" class="px-md-2">
        <div class="editor-canvas">
          <div v-if="!blocks.length" class="canvas-empty">
            <v-icon large color="grey lighten-1">mdi-view-grid-plus-outline</v-icon>
            <div class="grey--text mt-2">
              Wähle links eine Reihe oder einen Baustein.
            </div>
          </div>

          <draggable
            :list="blocks"
            handle=".drag-handle"
            :animation="180"
            group="rows"
            ghost-class="ghost-row"
            @change="onRowChange"
          >
            <RowBlock
              v-for="row in blocks"
              :key="row.id"
              :block="row"
              :variables="variables"
              :selected="selectedId === row.id"
              :selected-block-id="selectedChildId"
              @select="onSelect(row.id, '')"
              @select-block="(id) => onSelect(row.id, id)"
              @update="(r) => onUpdateRow(row.id, r)"
              @duplicate="onDuplicateRow(row.id)"
              @remove="onRemoveRow(row.id)"
            />
          </draggable>
        </div>
      </v-col>
      <v-col cols="12" md="3" class="pl-md-2">
        <BlockPropertiesPanel
          :selected-block="selectedBlock"
          :variables="variables"
          @update="onUpdateSelected"
        />
      </v-col>
    </v-row>

    <v-alert
      v-if="overSize"
      type="warning"
      text
      dense
      class="mt-3"
    >
      Diese Vorlage ist sehr groß ({{ Math.round(currentSizeBytes / 1024) }} KB
      von max. 50 KB). Reduziere Inhalte, um Speicherprobleme zu vermeiden.
    </v-alert>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import BlockPalette from "./BlockPalette.vue";
import BlockPropertiesPanel from "./BlockPropertiesPanel.vue";
import RowBlock from "./blocks/RowBlock.vue";
import { createBlock, createRow } from "./blockFactory.js";
import { renderBlocksToHtml, cryptoRandomId } from "./render/renderBlocksToHtml.js";
import {
  MAX_SNIPPET_SIZE_BYTES,
  SOFT_WARN_SIZE_BYTES,
} from "@/components/Mail/snippetCatalog.js";

export default {
  name: "BlockEditor",
  components: { draggable, BlockPalette, BlockPropertiesPanel, RowBlock },
  props: {
    value: { type: Array, default: () => [] },
    variables: { type: Array, default: () => [] },
  },
  data() {
    return {
      blocks: [],
      selectedId: "",
      selectedChildId: "",
    };
  },
  computed: {
    selectedBlock() {
      if (!this.selectedId) return null;
      const row = this.blocks.find((b) => b.id === this.selectedId);
      if (!row) return null;
      if (!this.selectedChildId) return row;
      for (const col of row.columns || []) {
        const found = (col.blocks || []).find(
          (b) => b.id === this.selectedChildId
        );
        if (found) return found;
      }
      return row;
    },
    currentHtml() {
      return renderBlocksToHtml(this.blocks);
    },
    currentSizeBytes() {
      return new Blob([this.currentHtml]).size;
    },
    overSize() {
      return this.currentSizeBytes > SOFT_WARN_SIZE_BYTES;
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(newVal) {
        if (
          JSON.stringify(newVal || []) === JSON.stringify(this.blocks)
        ) {
          return;
        }
        this.blocks = JSON.parse(JSON.stringify(newVal || []));
      },
    },
    blocks: {
      deep: true,
      handler(newVal) {
        this.$emit("input", newVal);
        this.$emit("change", {
          blocks: newVal,
          html: this.currentHtml,
          sizeBytes: this.currentSizeBytes,
          maxSizeBytes: MAX_SNIPPET_SIZE_BYTES,
        });
      },
    },
  },
  methods: {
    onSelect(rowId, childId) {
      this.selectedId = rowId;
      this.selectedChildId = childId || "";
    },
    onAddRow(layout) {
      const row = createRow(layout);
      this.blocks = [...this.blocks, row];
      this.selectedId = row.id;
      this.selectedChildId = "";
    },
    onAddBlock(type) {
      const block = createBlock(type);
      if (!block) return;
      let targetRowId = this.selectedId;
      let row = this.blocks.find((b) => b.id === targetRowId);

      if (!row) {
        row = createRow([12]);
        this.blocks = [...this.blocks, row];
        targetRowId = row.id;
      }

      const colIdx =
        row.columns && row.columns.length > 1 && this.selectedChildId
          ? this.findColumnIndex(row, this.selectedChildId)
          : 0;

      const newRow = {
        ...row,
        columns: row.columns.map((c, idx) =>
          idx === colIdx ? { ...c, blocks: [...(c.blocks || []), block] } : c
        ),
      };
      this.blocks = this.blocks.map((b) =>
        b.id === targetRowId ? newRow : b
      );
      this.selectedId = targetRowId;
      this.selectedChildId = block.id;
    },
    findColumnIndex(row, blockId) {
      for (let i = 0; i < (row.columns || []).length; i++) {
        if ((row.columns[i].blocks || []).some((b) => b.id === blockId)) {
          return i;
        }
      }
      return 0;
    },
    onUpdateRow(rowId, updated) {
      this.blocks = this.blocks.map((b) =>
        b.id === rowId ? { ...updated, id: rowId } : b
      );
    },
    onDuplicateRow(rowId) {
      const idx = this.blocks.findIndex((b) => b.id === rowId);
      if (idx < 0) return;
      const clone = JSON.parse(JSON.stringify(this.blocks[idx]));
      clone.id = cryptoRandomId();
      (clone.columns || []).forEach((c) => {
        (c.blocks || []).forEach((b) => (b.id = cryptoRandomId()));
      });
      const next = [...this.blocks];
      next.splice(idx + 1, 0, clone);
      this.blocks = next;
    },
    onRemoveRow(rowId) {
      this.blocks = this.blocks.filter((b) => b.id !== rowId);
      if (this.selectedId === rowId) {
        this.selectedId = "";
        this.selectedChildId = "";
      }
    },
    onRowChange() {
      this.blocks = [...this.blocks];
    },
    onUpdateSelected(updated) {
      if (!this.selectedBlock) return;
      if (!this.selectedChildId) {
        this.onUpdateRow(this.selectedId, updated);
        return;
      }
      const next = this.blocks.map((row) => {
        if (row.id !== this.selectedId) return row;
        return {
          ...row,
          columns: row.columns.map((c) => ({
            ...c,
            blocks: (c.blocks || []).map((b) =>
              b.id === this.selectedChildId
                ? { ...updated, id: this.selectedChildId }
                : b
            ),
          })),
        };
      });
      this.blocks = next;
    },
  },
};
</script>

<style scoped>
.block-editor {
  display: flex;
  flex-direction: column;
}
.editor-canvas {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  min-height: 400px;
}
.canvas-empty {
  text-align: center;
  padding: 60px 16px;
  color: #aaa;
}
.ghost-row {
  opacity: 0.4;
  background: var(--v-primary-lighten4);
  border: 2px dashed var(--v-primary-base);
}
</style>
